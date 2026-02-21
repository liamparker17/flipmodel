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

  const showToast = (msg) => {
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
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (data.deals) {
            localStorage.setItem("justhousesErp_deals", JSON.stringify(data.deals));
          }
          if (data.profiles) {
            localStorage.setItem("justhousesErp_profiles", JSON.stringify(data.profiles));
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
    if (window.confirm("Clear ALL data? This will delete all deals and profiles. This cannot be undone.")) {
      localStorage.removeItem("justhousesErp_deals");
      localStorage.removeItem("justhousesErp_profiles");
      localStorage.removeItem("flipmodel_profiles");
      showToast("All data cleared — refresh to see changes");
    }
  };

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 32, maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24, paddingLeft: isMobile ? 48 : 0 }}>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 700, margin: 0 }}>Settings</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: "4px 0 0" }}>App preferences and data management</p>
      </div>

      {/* Data Management */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12, padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
          Data Management
        </h3>
        <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 16 }}>
          You have {deals.length} deal{deals.length !== 1 ? "s" : ""} stored locally.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <CTAButton label="Export All Data" onClick={handleExport} primary={false} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 8, minHeight: 40 }} />
          <CTAButton label="Import Data" onClick={handleImport} primary={false} style={{ fontSize: 13, padding: "10px 20px", borderRadius: 8, minHeight: 40 }} />
        </div>
      </div>

      {/* Storage Info */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`,
        borderRadius: 12, padding: 20, marginBottom: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
          Storage
        </h3>
        <div style={{ fontSize: 13, color: theme.textDim, lineHeight: 1.8 }}>
          <p style={{ margin: 0 }}>All data is stored in your browser&apos;s localStorage.</p>
          <p style={{ margin: "8px 0 0" }}>Export your data regularly for backup. Clearing browser data will delete all deals.</p>
        </div>
      </div>

      {/* Danger Zone */}
      <div style={{
        background: theme.card, border: `1px solid ${theme.red}30`,
        borderRadius: 12, padding: 20,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
          Danger Zone
        </h3>
        <p style={{ fontSize: 13, color: theme.textDim, marginBottom: 16 }}>
          This will permanently delete all deals, profiles, and preferences.
        </p>
        <button onClick={handleClearAll} style={{
          background: "transparent", border: `1px solid ${theme.red}40`, borderRadius: 8,
          padding: "10px 20px", color: theme.red, fontSize: 13, fontWeight: 600, cursor: "pointer", minHeight: 40,
        }}>
          Clear All Data
        </button>
      </div>

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}
