"use client";
import { useState, useEffect } from "react";
import { theme, CTAButton, Toast } from "../../components/theme";
import useDeals from "../../hooks/useDeals";

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

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

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

  const handleExport = () => {
    const data = {
      deals: JSON.parse(localStorage.getItem("justhousesErp_deals") || "[]"),
      profiles: JSON.parse(localStorage.getItem("justhousesErp_profiles") || "[]"),
      settings: JSON.parse(localStorage.getItem("justhousesErp_settings") || "{}"),
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };
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
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.deals) localStorage.setItem("justhousesErp_deals", JSON.stringify(data.deals));
          if (data.profiles) localStorage.setItem("justhousesErp_profiles", JSON.stringify(data.profiles));
          if (data.settings) {
            localStorage.setItem("justhousesErp_settings", JSON.stringify(data.settings));
            setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
          }
          showToast("Data imported — refresh to see changes");
        } catch {
          showToast("Invalid file format");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleClearAll = () => {
    if (window.confirm("Clear ALL data? This will delete all deals, profiles, and settings. This cannot be undone.")) {
      localStorage.removeItem("justhousesErp_deals");
      localStorage.removeItem("justhousesErp_profiles");
      localStorage.removeItem("justhousesErp_settings");
      localStorage.removeItem("flipmodel_profiles");
      showToast("All data cleared — refresh to see changes");
    }
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
    showToast("Settings reset to defaults");
  };

  // Storage usage estimate
  const [storageUsed, setStorageUsed] = useState(0);
  useEffect(() => {
    let total = 0;
    for (const key of ["justhousesErp_deals", "justhousesErp_profiles", "justhousesErp_settings"]) {
      const item = localStorage.getItem(key);
      if (item) total += item.length * 2;
    }
    setStorageUsed(total);
  }, [deals]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const sections = [
    { key: "general", label: "General" },
    { key: "defaults", label: "Calculator Defaults" },
    { key: "data", label: "Data Management" },
    { key: "about", label: "About" },
  ] as const;

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
                <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", marginBottom: 2 }}>Storage Used</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{formatBytes(storageUsed)}</div>
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
              <CTAButton label="Export All Data" onClick={handleExport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
              <CTAButton label="Import Data" onClick={handleImport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Storage</h3>
            <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.7 }}>
              <p style={{ margin: 0 }}>All data is stored in your browser&apos;s localStorage.</p>
              <p style={{ margin: "6px 0 0" }}>Export your data regularly for backup. Clearing browser data will delete all deals.</p>
              <p style={{ margin: "6px 0 0" }}>localStorage limit is typically ~5-10MB. Current usage: {formatBytes(storageUsed)}</p>
            </div>
          </div>

          <div style={{ background: theme.card, border: `1px solid ${theme.red}20`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Danger Zone</h3>
            <p style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>This will permanently delete all deals, profiles, expenses, contacts, and settings.</p>
            <button onClick={handleClearAll} style={{
              background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6,
              padding: "8px 16px", color: theme.red, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
            }}>Clear All Data</button>
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
