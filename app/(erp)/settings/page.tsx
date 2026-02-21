"use client";
import { useState, useEffect } from "react";
import { theme, CTAButton, Toast } from "../../components/theme";
import useDeals from "../../hooks/useDeals";

export default function SettingsPage() {
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  const handleExport = () => {
    const data = {
      deals: JSON.parse(localStorage.getItem("justhousesErp_deals") || "[]"),
      profiles: JSON.parse(localStorage.getItem("justhousesErp_profiles") || "[]"),
      exportedAt: new Date().toISOString(),
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
    if (window.confirm("Clear ALL data? This will delete all deals and profiles. This cannot be undone.")) {
      localStorage.removeItem("justhousesErp_deals");
      localStorage.removeItem("justhousesErp_profiles");
      localStorage.removeItem("flipmodel_profiles");
      showToast("All data cleared — refresh to see changes");
    }
  };

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Settings</h1>
        <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>App preferences and data management</p>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Data Management</h3>
        <div style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>
          You have {deals.length} deal{deals.length !== 1 ? "s" : ""} stored locally.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <CTAButton label="Export All Data" onClick={handleExport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
          <CTAButton label="Import Data" onClick={handleImport} primary={false} style={{ fontSize: 12, padding: "8px 16px", borderRadius: 6, minHeight: 36 }} isMobile={isMobile} />
        </div>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Storage</h3>
        <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.7 }}>
          <p style={{ margin: 0 }}>All data is stored in your browser&apos;s localStorage.</p>
          <p style={{ margin: "6px 0 0" }}>Export your data regularly for backup. Clearing browser data will delete all deals.</p>
        </div>
      </div>

      <div style={{ background: theme.card, border: `1px solid ${theme.red}20`, borderRadius: 8, padding: 16 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Danger Zone</h3>
        <p style={{ fontSize: 12, color: theme.textDim, marginBottom: 12 }}>This will permanently delete all deals, profiles, and preferences.</p>
        <button onClick={handleClearAll} style={{
          background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6,
          padding: "8px 16px", color: theme.red, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
        }}>Clear All Data</button>
      </div>

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
