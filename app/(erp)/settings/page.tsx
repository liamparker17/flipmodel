"use client";
import { useState, useEffect, useCallback } from "react";
import { theme, CTAButton, Toast } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";

const DEFAULT_SETTINGS = {
  defaultBondRate: 12.75,
  defaultContingencyPct: 10,
  defaultPmPct: 8,
  defaultAgentCommission: 5,
  defaultRenovationMonths: 4,
  defaultMode: "quick" as "quick" | "advanced",
  currency: "ZAR",
  dateFormat: "DD/MM/YYYY",
};

type AppSettings = typeof DEFAULT_SETTINGS;

interface UserProfile {
  name: string;
  email: string;
  company: string;
  phone: string;
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem("justhousesErp_settings");
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem("justhousesErp_settings", JSON.stringify(settings));
}

export default function SettingsPage() {
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<"general" | "defaults" | "data" | "about">("general");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  // Profile state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Partial<UserProfile>>({});

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  // Fetch user profile when general tab is active
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
    if (activeSection === "general") {
      fetchProfile();
    }
  }, [activeSection, fetchProfile]);

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

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) {
        showToast("Export failed");
        setExporting(false);
        return;
      }
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
    } catch {
      showToast("Export failed");
    }
    setExporting(false);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
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
          if (res.ok) {
            showToast("Data imported successfully — refresh to see changes");
          } else {
            showToast("Import failed");
          }
        } catch {
          showToast("Invalid file format");
        }
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
      setSettings(DEFAULT_SETTINGS);
      showToast("Local settings cleared");
    }
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    showToast("Settings reset to defaults");
  };

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const sections = [
    { key: "general", label: "General" },
    { key: "defaults", label: "Calculator Defaults" },
    { key: "data", label: "Data Management" },
    { key: "about", label: "About" },
  ] as const;

  const profileValue = (key: keyof UserProfile) =>
    profileDraft[key] !== undefined ? profileDraft[key] : (profile?.[key] ?? "");

  const hasProfileChanges = Object.keys(profileDraft).length > 0;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Settings</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>App preferences, defaults, and data management</p>
      </div>

      {/* Section Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16, overflowX: "auto" }}>
        {sections.map((s) => (
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
          {/* Profile Section */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Profile</h3>
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
                    <CTAButton
                      label={profileSaving ? "Saving..." : "Save Profile"}
                      onClick={handleProfileSave}
                      primary
                      style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }}
                      isMobile={isMobile}
                    />
                    <button
                      onClick={() => setProfileDraft({})}
                      style={{
                        background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6,
                        padding: "8px 16px", color: theme.textDim, fontSize: 12, cursor: "pointer", minHeight: 36,
                      }}
                    >Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: theme.textDim, margin: 0 }}>Unable to load profile.</p>
            )}
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Calculator Mode</h3>
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
            <p style={{ fontSize: 11, color: theme.textDim, margin: "8px 0 0" }}>Default mode when creating new deal analyses.</p>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Display</h3>
            <SettingRow label="Currency" value={settings.currency} type="text" disabled help="South African Rand (ZAR) — fixed for SA market" />
          </div>
        </div>
      )}

      {activeSection === "defaults" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Financial Defaults</h3>
            <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 12px" }}>These values are used as defaults when creating new deals.</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <SettingRow label="Bond Rate (Prime + %)" value={settings.defaultBondRate} type="number" onChange={(v) => handleSettingChange("defaultBondRate", Number(v))} suffix="%" help="Current SA prime rate is 11.75%" />
              <SettingRow label="Agent Commission" value={settings.defaultAgentCommission} type="number" onChange={(v) => handleSettingChange("defaultAgentCommission", Number(v))} suffix="%" help="Standard is 5-7%" />
              <SettingRow label="Contingency %" value={settings.defaultContingencyPct} type="number" onChange={(v) => handleSettingChange("defaultContingencyPct", Number(v))} suffix="%" help="Recommend 10-15% for renovation projects" />
              <SettingRow label="Project Management %" value={settings.defaultPmPct} type="number" onChange={(v) => handleSettingChange("defaultPmPct", Number(v))} suffix="%" help="PM oversight cost as % of reno budget" />
              <SettingRow label="Default Reno Timeline" value={settings.defaultRenovationMonths} type="number" onChange={(v) => handleSettingChange("defaultRenovationMonths", Number(v))} suffix="months" help="Typical renovation duration" />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <button onClick={handleResetSettings} style={{
              background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6,
              padding: "8px 16px", color: theme.textDim, fontSize: 12, cursor: "pointer", minHeight: 36,
            }}>Reset to Defaults</button>
          </div>
        </div>
      )}

      {activeSection === "data" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Data Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Total Deals</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{deals.length}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Storage</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>Cloud</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Total Expenses</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{deals.reduce((s, d) => s + (d.expenses || []).length, 0)}</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Total Contacts</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{deals.reduce((s, d) => s + (d.contacts || []).length, 0)}</div>
              </div>
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Import / Export</h3>
            <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 12px" }}>Export your data for backup or import from a previous export.</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <CTAButton label={exporting ? "Exporting..." : "Export All Data"} onClick={handleExport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
              <CTAButton label={importing ? "Importing..." : "Import Data"} onClick={handleImport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Storage</h3>
            <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>Your deal data is stored securely in the cloud database. It is synced automatically and accessible from any device you sign in to.</p>
              <p style={{ margin: "6px 0 0" }}>Local preferences (calculator defaults, theme) are stored in your browser. Clearing browser data will only reset these preferences.</p>
              <p style={{ margin: "6px 0 0" }}>Export your data periodically for an offline backup.</p>
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.red}20`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Danger Zone</h3>
            <p style={{ fontSize: 12, color: theme.textDim, marginBottom: 8 }}>This will clear your local settings and preferences only. Your deal data is stored in the cloud and will not be affected.</p>
            <p style={{ fontSize: 11, color: theme.textDim, marginBottom: 12, fontStyle: "italic" }}>Note: To delete your cloud data, please contact support.</p>
            <button onClick={handleClearAll} style={{
              background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6,
              padding: "8px 16px", color: theme.red, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
            }}>Clear Local Settings</button>
          </div>
        </div>
      )}

      {activeSection === "about" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, background: theme.accent, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>JH</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>JustHouses ERP</div>
                <div style={{ fontSize: 11, color: theme.textDim }}>Property Flip Management Platform</div>
              </div>
            </div>
            <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.8 }}>
              <p style={{ margin: "0 0 8px" }}>Version 1.0 &middot; Built for South African property investors</p>
              <p style={{ margin: "0 0 8px" }}>Features: Deal pipeline management, financial analysis, expense tracking, project management, renovation timeline, contact management, portfolio analytics.</p>
              <p style={{ margin: 0 }}>All calculations use South African tax law (transfer duty), current prime rates, and ZAR currency.</p>
            </div>
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Keyboard Shortcuts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {[
                { key: "N", desc: "New Deal (from sidebar)" },
                { key: "1-7", desc: "Navigate to section (Dashboard, Pipeline, etc.)" },
                { key: "Q/A", desc: "Toggle Quick/Advanced mode in calculator" },
                { key: "←/→", desc: "Navigate calculator steps" },
              ].map((shortcut) => (
                <div key={shortcut.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <kbd style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "2px 6px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text, minWidth: 30, textAlign: "center" }}>{shortcut.key}</kbd>
                  <span style={{ fontSize: 11, color: theme.textDim }}>{shortcut.desc}</span>
                </div>
              ))}
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
