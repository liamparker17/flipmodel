"use client";
import { useState, useEffect, useCallback } from "react";
import { theme, CTAButton, Toast, styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import useIsMobile from "../../hooks/useIsMobile";
import useOrgContext from "@/hooks/useOrgContext";
import { ORG_ROLE_LABELS, DEFAULT_ORG_SETTINGS } from "@/types/org";
import type { OrgRole, ModuleKey } from "@/types/org";
import { DEFAULT_ROLE_MODULES } from "@/lib/permissions";

const SETTING_DEFAULTS = {
  defaultBondRate: 12.75,
  defaultContingencyPct: 10,
  defaultPmPct: 8,
  defaultAgentCommission: 5,
  defaultRenovationMonths: 4,
  defaultMode: "quick" as "quick" | "advanced",
  currency: "ZAR",
  dateFormat: "DD/MM/YYYY",
};

type AppSettings = typeof SETTING_DEFAULTS;

interface UserProfile {
  name: string;
  email: string;
  company: string;
  phone: string;
}

interface ChartOfAccountEntry {
  id: string;
  code: string;
  name: string;
  type: string;
  subtype: string;
  isActive: boolean;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("justhousesErp_settings");
    if (raw) return { ...SETTING_DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...SETTING_DEFAULTS };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem("justhousesErp_settings", JSON.stringify(settings));
}

export default function SettingsPage() {
  const { deals, loaded } = useDeals();
  const { org, hasPermission, canAccessModule, refetch: refetchOrg } = useOrgContext();
  const isMobile = useIsMobile();
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [settings, setSettings] = useState(SETTING_DEFAULTS);
  const [activeSection, setActiveSection] = useState<"general" | "defaults" | "data" | "about" | "organisation" | "roles" | "accounting">("general");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Partial<UserProfile>>({});

  // Org settings state
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [orgCurrency, setOrgCurrency] = useState("ZAR");
  const [orgTimezone, setOrgTimezone] = useState("Africa/Johannesburg");
  const [orgSaving, setOrgSaving] = useState(false);

  // Accounting state
  const [accountingConnection, setAccountingConnection] = useState<{ provider: string; status: string; lastSyncAt?: string; settings?: Record<string, unknown> } | null>(null);
  const [chartOfAccounts, setChartOfAccounts] = useState<ChartOfAccountEntry[]>([]);
  const [accountingLoading, setAccountingLoading] = useState(false);
  const [accountingProviders, setAccountingProviders] = useState<{ xero: boolean; quickbooks: boolean }>({ xero: false, quickbooks: false });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ accounts?: { total: number; imported: number }; contacts?: { total: number; imported: number }; invoices?: { total: number } } | null>(null);

  // API Credentials state
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [credentialsSaving, setCredentialsSaving] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<{ xero: { configured: boolean; clientId: string | null }; quickbooks: { configured: boolean; clientId: string | null; sandbox: boolean } } | null>(null);
  const [xeroClientId, setXeroClientId] = useState("");
  const [xeroClientSecret, setXeroClientSecret] = useState("");
  const [qbClientId, setQbClientId] = useState("");
  const [qbClientSecret, setQbClientSecret] = useState("");
  const [qbSandbox, setQbSandbox] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    if (org) {
      setOrgName(org.name);
      setOrgSlug(org.slug);
      setOrgCurrency(org.currency);
      setOrgTimezone(org.timezone);
    }
  }, [org]);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setProfileDraft({});
      }
    } catch { /* ignore */ }
    setProfileLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === "general") fetchProfile();
  }, [activeSection, fetchProfile]);

  const fetchAccounting = useCallback(async () => {
    setAccountingLoading(true);
    setCredentialsLoading(true);
    try {
      const [connRes, coaRes, credsRes] = await Promise.all([
        fetch("/api/accounting"),
        fetch("/api/accounting/chart-of-accounts"),
        fetch("/api/accounting/credentials"),
      ]);
      if (connRes.ok) {
        const data = await connRes.json();
        setAccountingConnection(data.connection);
        if (data.providers) setAccountingProviders(data.providers);
      }
      if (coaRes.ok) {
        setChartOfAccounts(await coaRes.json());
      }
      if (credsRes.ok) {
        const credsData = await credsRes.json();
        setSavedCredentials(credsData);
      }
    } catch { /* ignore */ }
    setAccountingLoading(false);
    setCredentialsLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === "accounting") fetchAccounting();
  }, [activeSection, fetchAccounting]);

  // Handle OAuth callback query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("accounting_connected");
    const accountingError = params.get("accounting_error");
    if (connected) {
      setActiveSection("accounting");
      showToast(`${connected.charAt(0).toUpperCase() + connected.slice(1)} connected successfully`);
      window.history.replaceState({}, "", window.location.pathname);
      fetchAccounting();
    }
    if (accountingError) {
      setActiveSection("accounting");
      showToast(`Connection error: ${accountingError}`);
      window.history.replaceState({}, "", window.location.pathname);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSync = async (syncType: string = "all") => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/accounting/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: syncType }),
      });
      if (res.ok) {
        const data = await res.json();
        setSyncResult(data.results);
        showToast("Sync completed successfully");
        fetchAccounting();
      } else {
        const data = await res.json();
        showToast(data.error || "Sync failed");
      }
    } catch {
      showToast("Sync failed");
    }
    setSyncing(false);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const handleSettingChange = (key: keyof AppSettings, value: unknown) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    showToast("Settings saved");
  };

  const handleProfileChange = (key: keyof UserProfile, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileSave = async () => {
    if (!profileDraft || Object.keys(profileDraft).length === 0) return;
    setProfileSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileDraft),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setProfileDraft({});
        showToast("Profile updated");
      } else {
        showToast("Failed to update profile");
      }
    } catch {
      showToast("Failed to update profile");
    }
    setProfileSaving(false);
  };

  const handleOrgSave = async () => {
    setOrgSaving(true);
    try {
      const res = await fetch("/api/org", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName, slug: orgSlug, currency: orgCurrency, timezone: orgTimezone }),
      });
      if (res.ok) {
        showToast("Organisation updated");
        refetchOrg();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to update");
      }
    } catch { showToast("Failed to update"); }
    setOrgSaving(false);
  };

  const handleSeedChartOfAccounts = async () => {
    const res = await fetch("/api/accounting/chart-of-accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "seedDefaults" }),
    });
    if (res.ok) {
      showToast("Default chart of accounts seeded");
      fetchAccounting();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to seed");
    }
  };

  const handleConnectManual = async () => {
    const res = await fetch("/api/accounting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "manual" }),
    });
    if (res.ok) {
      showToast("Manual accounting connected");
      fetchAccounting();
    } else {
      const data = await res.json();
      showToast(data.error || "Failed to connect");
    }
  };

  const handleDisconnectAccounting = async () => {
    if (!window.confirm("Disconnect accounting integration?")) return;
    const res = await fetch("/api/accounting", { method: "DELETE" });
    if (res.ok) {
      showToast("Disconnected");
      setAccountingConnection(null);
      fetchAccounting();
    }
  };

  const handleSaveCredentials = async (provider: "xero" | "quickbooks") => {
    setCredentialsSaving(true);
    try {
      const body: Record<string, unknown> = {};
      if (provider === "xero") {
        if (!xeroClientId || !xeroClientSecret) { showToast("Enter both Client ID and Client Secret"); setCredentialsSaving(false); return; }
        body.xeroClientId = xeroClientId;
        body.xeroClientSecret = xeroClientSecret;
      } else {
        if (!qbClientId || !qbClientSecret) { showToast("Enter both Client ID and Client Secret"); setCredentialsSaving(false); return; }
        body.quickbooksClientId = qbClientId;
        body.quickbooksClientSecret = qbClientSecret;
        body.quickbooksSandbox = qbSandbox;
      }
      const res = await fetch("/api/accounting/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast(`${provider === "xero" ? "Xero" : "QuickBooks"} credentials saved`);
        setXeroClientId(""); setXeroClientSecret("");
        setQbClientId(""); setQbClientSecret("");
        fetchAccounting();
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to save credentials");
      }
    } catch { showToast("Failed to save credentials"); }
    setCredentialsSaving(false);
  };

  const handleRemoveCredentials = async (provider: "xero" | "quickbooks") => {
    if (!window.confirm(`Remove ${provider === "xero" ? "Xero" : "QuickBooks"} API credentials?`)) return;
    try {
      const res = await fetch(`/api/accounting/credentials?provider=${provider}`, { method: "DELETE" });
      if (res.ok) {
        showToast(`${provider === "xero" ? "Xero" : "QuickBooks"} credentials removed`);
        fetchAccounting();
      }
    } catch { showToast("Failed to remove credentials"); }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) { showToast("Export failed"); setExporting(false); return; }
      const data = await res.json();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `justhouses-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Data exported successfully");
    } catch { showToast("Export failed"); }
    setExporting(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        setImporting(true);
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          const res = await fetch("/api/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: parsed.data }),
          });
          if (res.ok) showToast("Data imported successfully — refresh to see changes");
          else showToast("Import failed");
        } catch { showToast("Invalid file format"); }
        setImporting(false);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (window.confirm("Clear local settings? This will reset your calculator defaults and preferences. Your deal data is stored in the cloud and will not be affected.")) {
      localStorage.removeItem("justhousesErp_settings");
      localStorage.removeItem("justhousesErp_toolLocker");
      setSettings(SETTING_DEFAULTS);
      showToast("Local settings cleared");
    }
  };

  const handleResetSettings = () => {
    setSettings(SETTING_DEFAULTS);
    saveSettings(SETTING_DEFAULTS);
    showToast("Settings reset to defaults");
  };

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const allSections = [
    { key: "general" as const, label: "General" },
    { key: "defaults" as const, label: "Calculator Defaults" },
    { key: "organisation" as const, label: "Organisation" },
    { key: "roles" as const, label: "Roles & Permissions" },
    ...(canAccessModule("accounting") ? [{ key: "accounting" as const, label: "Accounting" }] : []),
    { key: "data" as const, label: "Data Management" },
    { key: "about" as const, label: "About" },
  ];

  const profileValue = (key: keyof UserProfile) =>
    profileDraft[key] !== undefined ? profileDraft[key] : (profile?.[key] ?? "");

  const hasProfileChanges = Object.keys(profileDraft).length > 0;

  const MODULE_LABELS: Record<ModuleKey, string> = {
    dashboard: "Dashboard", pipeline: "Pipeline", projects: "Projects", contacts: "Contacts",
    finance: "Finance", invoices: "Invoices", tools: "Tools", reports: "Reports",
    team: "Team", accounting: "Accounting", settings: "Settings", suppliers: "Suppliers", documents: "Documents",
  };

  const allModules: ModuleKey[] = ["dashboard", "pipeline", "projects", "contacts", "finance", "invoices", "tools", "reports", "team", "accounting", "settings", "suppliers", "documents"];
  const allRoles: OrgRole[] = ["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"];

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Settings</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>App preferences, organisation, and data management</p>
      </div>

      {/* Section Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
        {allSections.map((s) => (
          <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
            background: activeSection === s.key ? theme.accent : "transparent",
            color: activeSection === s.key ? "#000" : theme.textDim,
            border: activeSection === s.key ? "none" : `1px solid ${theme.cardBorder}`,
            borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: activeSection === s.key ? 600 : 400,
            cursor: "pointer", minHeight: 32, whiteSpace: "nowrap",
          }}>{s.label}</button>
        ))}
      </div>

      {activeSection === "general" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Profile</h3>
            {profileLoading && !profile ? (
              <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>Loading profile...</p>
            ) : profile ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <SettingRow label="Name" value={profileValue("name")} type="text" onChange={(v) => handleProfileChange("name", v)} />
                  <SettingRow label="Email" value={profileValue("email")} type="text" disabled help="Email cannot be changed" />
                  <SettingRow label="Company" value={profileValue("company")} type="text" onChange={(v) => handleProfileChange("company", v)} />
                  <SettingRow label="Phone" value={profileValue("phone")} type="text" onChange={(v) => handleProfileChange("phone", v)} />
                </div>
                {hasProfileChanges && (
                  <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                    <CTAButton label={profileSaving ? "Saving..." : "Save Profile"} onClick={handleProfileSave} primary style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
                    <button onClick={() => setProfileDraft({})} style={{ background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "8px 16px", color: theme.textDim, fontSize: 12, cursor: "pointer", minHeight: 36 }}>Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>Unable to load profile.</p>
            )}
          </div>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Calculator Mode</h3>
            <div style={{ display: "flex", gap: 8 }}>
              {(["quick", "advanced"] as const).map((mode) => (
                <button key={mode} onClick={() => handleSettingChange("defaultMode", mode)} style={{
                  background: settings.defaultMode === mode ? theme.accent : theme.input,
                  color: settings.defaultMode === mode ? "#000" : theme.text,
                  border: `1px solid ${settings.defaultMode === mode ? theme.accent : theme.inputBorder}`,
                  borderRadius: 6, padding: "8px 20px", fontSize: 13, fontWeight: settings.defaultMode === mode ? 600 : 400,
                  cursor: "pointer", textTransform: "capitalize", minHeight: 36,
                }}>{mode}</button>
              ))}
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Display</h3>
            <SettingRow label="Currency" value={settings.currency} type="text" disabled help="South African Rand (ZAR) — fixed for SA market" />
          </div>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Tutorial</h3>
            <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 12px" }}>Replay the guided walkthrough to learn about key features.</p>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/user/profile", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ preferences: { tutorialCompleted: false } }),
                  });
                  showToast("Tutorial will restart on next page load");
                  setTimeout(() => window.location.reload(), 1500);
                } catch {
                  showToast("Failed to reset tutorial");
                }
              }}
              style={{
                background: "transparent",
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 6,
                padding: "8px 16px",
                color: theme.accent,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                minHeight: 36,
              }}
            >
              Replay Tutorial
            </button>
          </div>
        </div>
      )}

      {activeSection === "defaults" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Financial Defaults</h3>
            <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 12px" }}>These values are used as defaults when creating new deals.</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <SettingRow label="Bond Rate (Prime + %)" value={settings.defaultBondRate} type="number" onChange={(v) => handleSettingChange("defaultBondRate", Number(v))} suffix="%" help="Current SA prime rate is 11.75%" />
              <SettingRow label="Agent Commission" value={settings.defaultAgentCommission} type="number" onChange={(v) => handleSettingChange("defaultAgentCommission", Number(v))} suffix="%" />
              <SettingRow label="Contingency %" value={settings.defaultContingencyPct} type="number" onChange={(v) => handleSettingChange("defaultContingencyPct", Number(v))} suffix="%" />
              <SettingRow label="Project Management %" value={settings.defaultPmPct} type="number" onChange={(v) => handleSettingChange("defaultPmPct", Number(v))} suffix="%" />
              <SettingRow label="Default Reno Timeline" value={settings.defaultRenovationMonths} type="number" onChange={(v) => handleSettingChange("defaultRenovationMonths", Number(v))} suffix="months" />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={handleResetSettings} style={{ background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "8px 16px", color: theme.textDim, fontSize: 12, cursor: "pointer", minHeight: 36 }}>Reset to Defaults</button>
          </div>
        </div>
      )}

      {activeSection === "organisation" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Organisation Details</h3>
            {org ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  <SettingRow label="Name" value={orgName} type="text" onChange={hasPermission("org:write") ? setOrgName : undefined} disabled={!hasPermission("org:write")} />
                  <SettingRow label="Slug" value={orgSlug} type="text" onChange={hasPermission("org:write") ? setOrgSlug : undefined} disabled={!hasPermission("org:write")} help="Used in URLs" />
                  <SettingRow label="Currency" value={orgCurrency} type="text" onChange={hasPermission("org:write") ? setOrgCurrency : undefined} disabled={!hasPermission("org:write")} />
                  <SettingRow label="Timezone" value={orgTimezone} type="text" onChange={hasPermission("org:write") ? setOrgTimezone : undefined} disabled={!hasPermission("org:write")} />
                </div>
                {hasPermission("org:write") && (
                  <div style={{ marginTop: 12 }}>
                    <CTAButton label={orgSaving ? "Saving..." : "Save Organisation"} onClick={handleOrgSave} primary style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>No organisation found. Create one from the onboarding flow.</p>
            )}
          </div>
        </div>
      )}

      {activeSection === "roles" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Module Access by Role</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, color: theme.text }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textDim }}>Module</th>
                    {allRoles.map((r) => (
                      <th key={r} style={{ textAlign: "center", padding: "6px 4px", borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textDim, fontSize: 10 }}>
                        {ORG_ROLE_LABELS[r].split(" ")[0]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allModules.map((mod) => (
                    <tr key={mod}>
                      <td style={{ padding: "5px 8px", borderBottom: `1px solid ${theme.cardBorder}10` }}>{MODULE_LABELS[mod]}</td>
                      {allRoles.map((r) => (
                        <td key={r} style={{ textAlign: "center", padding: "5px 4px", borderBottom: `1px solid ${theme.cardBorder}10` }}>
                          {DEFAULT_ROLE_MODULES[r].includes(mod) ? (
                            <span style={{ color: theme.green }}>Y</span>
                          ) : (
                            <span style={{ color: theme.textDim }}>-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSection === "accounting" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Connection Status</h3>
            {accountingLoading ? (
              <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>Loading...</p>
            ) : accountingConnection ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: accountingConnection.status === "connected" ? theme.green : accountingConnection.status === "expired" ? "#f59e0b" : theme.red }} />
                  <span style={{ fontSize: 13, color: theme.text, textTransform: "capitalize", fontWeight: 600 }}>{accountingConnection.provider}</span>
                  <span style={{ fontSize: 12, color: theme.textDim }}>— {accountingConnection.status}</span>
                </div>
                {accountingConnection.settings && (accountingConnection.settings as Record<string, string>).organisationName && (
                  <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 4px" }}>Organisation: {(accountingConnection.settings as Record<string, string>).organisationName || (accountingConnection.settings as Record<string, string>).companyName}</p>
                )}
                {accountingConnection.lastSyncAt && (
                  <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 12px" }}>Last synced: {new Date(accountingConnection.lastSyncAt).toLocaleString()}</p>
                )}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {accountingConnection.provider !== "manual" && accountingConnection.status === "connected" && hasPermission("accounting:write") && (
                    <button onClick={() => handleSync("all")} disabled={syncing} style={{ padding: "6px 14px", background: theme.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: syncing ? "wait" : "pointer", opacity: syncing ? 0.6 : 1 }}>
                      {syncing ? "Syncing..." : "Sync Now"}
                    </button>
                  )}
                  {accountingConnection.status === "expired" && hasPermission("accounting:write") && (
                    <button onClick={() => { window.location.href = `/api/accounting/${accountingConnection.provider}/connect`; }} style={{ padding: "6px 14px", background: "#f59e0b", color: "#000", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                      Reconnect
                    </button>
                  )}
                  {hasPermission("accounting:write") && (
                    <button onClick={handleDisconnectAccounting} style={{ background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6, padding: "6px 12px", color: theme.red, fontSize: 12, cursor: "pointer" }}>Disconnect</button>
                  )}
                </div>
                {syncResult && (
                  <div style={{ marginTop: 12, padding: 10, background: theme.input, borderRadius: 6, fontSize: 11, color: theme.textDim }}>
                    <strong style={{ color: theme.text }}>Sync Results:</strong>
                    {syncResult.accounts && <div>Accounts: {syncResult.accounts.total} found, {syncResult.accounts.imported} imported</div>}
                    {syncResult.contacts && <div>Contacts: {syncResult.contacts.total} found, {syncResult.contacts.imported} imported</div>}
                    {syncResult.invoices && <div>Invoices: {syncResult.invoices.total} found</div>}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 12px" }}>No accounting integration connected.</p>
                {hasPermission("accounting:write") && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={handleConnectManual} style={{ padding: "8px 16px", background: theme.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Use Manual Accounting</button>
                    <button
                      disabled={!accountingProviders.quickbooks}
                      onClick={() => { window.location.href = "/api/accounting/quickbooks/connect"; }}
                      style={{
                        padding: "8px 16px",
                        background: accountingProviders.quickbooks ? "#2CA01C" : theme.input,
                        color: accountingProviders.quickbooks ? "#fff" : theme.textDim,
                        border: accountingProviders.quickbooks ? "none" : `1px solid ${theme.inputBorder}`,
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: accountingProviders.quickbooks ? "pointer" : "not-allowed",
                      }}
                    >
                      {accountingProviders.quickbooks ? "Connect QuickBooks" : "QuickBooks (Not Configured)"}
                    </button>
                    <button
                      disabled={!accountingProviders.xero}
                      onClick={() => { window.location.href = "/api/accounting/xero/connect"; }}
                      style={{
                        padding: "8px 16px",
                        background: accountingProviders.xero ? "#13B5EA" : theme.input,
                        color: accountingProviders.xero ? "#fff" : theme.textDim,
                        border: accountingProviders.xero ? "none" : `1px solid ${theme.inputBorder}`,
                        borderRadius: 6, fontSize: 12, fontWeight: 600,
                        cursor: accountingProviders.xero ? "pointer" : "not-allowed",
                      }}
                    >
                      {accountingProviders.xero ? "Connect Xero" : "Xero (Not Configured)"}
                    </button>
                  </div>
                )}
                {(!accountingProviders.xero || !accountingProviders.quickbooks) && (
                  <p style={{ fontSize: 10, color: theme.textDim, margin: "8px 0 0", lineHeight: 1.6 }}>
                    To enable Xero or QuickBooks, add your API credentials below.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* API Credentials */}
          {hasPermission("accounting:write") && (
            <div style={styles.card}>
              <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>API Credentials</h3>
              <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 16px" }}>
                Enter your Xero or QuickBooks API credentials to enable the integration. You can get these from the Xero Developer Portal or Intuit Developer Portal.
              </p>

              {credentialsLoading ? (
                <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>Loading...</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Xero Credentials */}
                  <div style={{ padding: 14, background: theme.input, borderRadius: 8, border: `1px solid ${theme.inputBorder}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#13B5EA" }}>Xero</span>
                      {savedCredentials?.xero?.configured && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: theme.green }}>Configured ({savedCredentials.xero.clientId})</span>
                          <button onClick={() => handleRemoveCredentials("xero")} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                        </div>
                      )}
                    </div>
                    {!savedCredentials?.xero?.configured && (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Client ID</label>
                          <input type="text" value={xeroClientId} onChange={(e) => setXeroClientId(e.target.value)} placeholder="Enter Xero Client ID"
                            style={{ width: "100%", background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "7px 10px", color: theme.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Client Secret</label>
                          <input type="password" value={xeroClientSecret} onChange={(e) => setXeroClientSecret(e.target.value)} placeholder="Enter Xero Client Secret"
                            style={{ width: "100%", background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "7px 10px", color: theme.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <button onClick={() => handleSaveCredentials("xero")} disabled={credentialsSaving || !xeroClientId || !xeroClientSecret}
                            style={{ padding: "7px 16px", background: "#13B5EA", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: (credentialsSaving || !xeroClientId || !xeroClientSecret) ? "not-allowed" : "pointer", opacity: (credentialsSaving || !xeroClientId || !xeroClientSecret) ? 0.5 : 1 }}>
                            {credentialsSaving ? "Saving..." : "Save Xero Credentials"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* QuickBooks Credentials */}
                  <div style={{ padding: 14, background: theme.input, borderRadius: 8, border: `1px solid ${theme.inputBorder}` }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#2CA01C" }}>QuickBooks</span>
                      {savedCredentials?.quickbooks?.configured && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: theme.green }}>Configured ({savedCredentials.quickbooks.clientId})</span>
                          <button onClick={() => handleRemoveCredentials("quickbooks")} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>Remove</button>
                        </div>
                      )}
                    </div>
                    {!savedCredentials?.quickbooks?.configured && (
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Client ID</label>
                          <input type="text" value={qbClientId} onChange={(e) => setQbClientId(e.target.value)} placeholder="Enter QuickBooks Client ID"
                            style={{ width: "100%", background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "7px 10px", color: theme.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Client Secret</label>
                          <input type="password" value={qbClientSecret} onChange={(e) => setQbClientSecret(e.target.value)} placeholder="Enter QuickBooks Client Secret"
                            style={{ width: "100%", background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "7px 10px", color: theme.text, fontSize: 12, outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <input type="checkbox" id="qb-sandbox" checked={qbSandbox} onChange={(e) => setQbSandbox(e.target.checked)} style={{ accentColor: theme.accent }} />
                          <label htmlFor="qb-sandbox" style={{ fontSize: 11, color: theme.textDim, cursor: "pointer" }}>Sandbox mode (for testing)</label>
                        </div>
                        <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
                          <button onClick={() => handleSaveCredentials("quickbooks")} disabled={credentialsSaving || !qbClientId || !qbClientSecret}
                            style={{ padding: "7px 16px", background: "#2CA01C", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: (credentialsSaving || !qbClientId || !qbClientSecret) ? "not-allowed" : "pointer", opacity: (credentialsSaving || !qbClientId || !qbClientSecret) ? 0.5 : 1 }}>
                            {credentialsSaving ? "Saving..." : "Save QuickBooks Credentials"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sync options for connected OAuth providers */}
          {accountingConnection && accountingConnection.provider !== "manual" && accountingConnection.status === "connected" && (
            <div style={styles.card}>
              <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Sync Options</h3>
              <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 12px" }}>Import data from {accountingConnection.provider} into your workspace.</p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["accounts", "contacts", "invoices"] as const).map((type) => (
                  <button key={type} onClick={() => handleSync(type)} disabled={syncing} style={{
                    padding: "6px 14px", background: "transparent", border: `1px solid ${theme.cardBorder}`,
                    borderRadius: 6, fontSize: 12, color: theme.text, cursor: syncing ? "wait" : "pointer",
                    opacity: syncing ? 0.6 : 1, textTransform: "capitalize",
                  }}>
                    Sync {type}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Chart of Accounts</h3>
            {chartOfAccounts.length === 0 ? (
              <div>
                <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 12px" }}>No chart of accounts set up yet.</p>
                {hasPermission("accounting:write") && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={handleSeedChartOfAccounts} style={{ padding: "8px 16px", background: theme.accent, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Seed Default Accounts (Property Flipping)</button>
                    {accountingConnection && accountingConnection.provider !== "manual" && accountingConnection.status === "connected" && (
                      <button onClick={() => handleSync("accounts")} disabled={syncing} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: syncing ? "wait" : "pointer", color: theme.text }}>
                        {syncing ? "Importing..." : `Import from ${accountingConnection.provider}`}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, color: theme.text }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textDim }}>Code</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textDim }}>Name</th>
                      <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${theme.cardBorder}`, color: theme.textDim }}>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {chartOfAccounts.map((acct) => (
                      <tr key={acct.id}>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${theme.cardBorder}10`, fontFamily: "'JetBrains Mono', monospace" }}>{acct.code}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${theme.cardBorder}10` }}>{acct.name}</td>
                        <td style={{ padding: "5px 8px", borderBottom: `1px solid ${theme.cardBorder}10`, textTransform: "capitalize" }}>{acct.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeSection === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Data Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Total Deals</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{deals.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Storage</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>Cloud</div>
              </div>
            </div>
          </div>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Import / Export</h3>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CTAButton label={exporting ? "Exporting..." : "Export All Data"} onClick={handleExport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
              <CTAButton label={importing ? "Importing..." : "Import Data"} onClick={handleImport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
            </div>
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.red}20`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Danger Zone</h3>
            <p style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>This will clear your local settings and preferences only. Cloud data is not affected.</p>
            <button onClick={handleClearAll} style={{ background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6, padding: "8px 16px", color: theme.red, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36 }}>Clear Local Settings</button>
          </div>
        </div>
      )}

      {activeSection === "about" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={styles.card}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>JH</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>JustHouses ERP</div>
                <div style={{ fontSize: 11, color: theme.textDim }}>Property Flip Management Platform</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 8px" }}>Version 1.1 &middot; Built for South African property investors</p>
              <p style={{ margin: "0 0 8px" }}>Features: Deal pipeline management, financial analysis, expense tracking, project management, renovation timeline, contact management, portfolio analytics, team management, RBAC, accounting integration.</p>
              <p style={{ margin: 0 }}>All calculations use South African tax law (transfer duty), current prime rates, and ZAR currency.</p>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}

function SettingRow({ label, value, type, onChange, suffix, help, disabled }: {
  label: string; value: string | number; type: "text" | "number"; onChange?: (v: string) => void; suffix?: string; help?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, fontWeight: 500 }}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <input type={type} value={value} onChange={(e) => onChange?.(e.target.value)} disabled={disabled}
          style={{
            flex: 1, background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
            padding: "7px 10px", color: disabled ? theme.textDim : theme.text, fontSize: 13, outline: "none",
            fontFamily: type === "number" ? "'JetBrains Mono', monospace" : "inherit",
            opacity: disabled ? 0.6 : 1, minHeight: 34,
          }}
        />
        {suffix && <span style={{ fontSize: 11, color: theme.textDim, whiteSpace: "nowrap" }}>{suffix}</span>}
      </div>
      {help && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 3 }}>{help}</div>}
    </div>
  );
}
