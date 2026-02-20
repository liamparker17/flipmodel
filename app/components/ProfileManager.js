"use client";
import { useState } from "react";
import { theme, fmt, pct } from "./theme";
import { exportProfile } from "../utils/profiles";
import { computeMetrics } from "../utils/calculations";

export default function ProfileManager({
  profiles, activeProfileId, currentProfileName,
  onSave, onLoad, onDelete, onCompareProfiles,
  isMobile,
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const openPanel = () => {
    setSaveName(currentProfileName || "");
    setPanelOpen(true);
  };

  const handleSave = (asNew) => {
    const name = saveName.trim() || "Unnamed Property";
    onSave(name, asNew);
    setSaveName(name);
  };

  const handleDelete = (id) => {
    if (confirmDeleteId === id) {
      onDelete(id);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(id);
    }
  };

  const handleLoad = (profile) => {
    onLoad(profile);
    setPanelOpen(false);
  };

  // Compute summary metrics for each profile in the list
  const profileSummaries = profiles.map((p) => {
    try {
      const m = computeMetrics(p);
      return { ...p, netProfit: m.netProfit, dealScore: m.dealScore };
    } catch {
      return { ...p, netProfit: 0, dealScore: { level: "risky", color: "#F87171" } };
    }
  });

  return (
    <>
      {/* Header buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {currentProfileName && !isMobile && (
          <div style={{
            background: theme.accentDim, borderRadius: 6, padding: "4px 10px",
            fontSize: 11, color: theme.accent, maxWidth: 180, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {currentProfileName}
          </div>
        )}
        <button onClick={() => handleSave(false)} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          padding: "5px 10px", fontSize: 11, color: theme.text, cursor: "pointer",
        }}>
          {isMobile ? "Save" : "Save"}
        </button>
        <button onClick={openPanel} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          padding: "5px 10px", fontSize: 11, color: theme.text, cursor: "pointer",
        }}>
          {isMobile ? `(${profiles.length})` : `Profiles (${profiles.length})`}
        </button>
      </div>

      {/* Panel overlay */}
      {panelOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 200,
          display: "flex", justifyContent: "flex-end",
        }}>
          {/* Backdrop */}
          <div onClick={() => setPanelOpen(false)} style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.6)",
          }} />
          {/* Panel */}
          <div style={{
            position: "relative", width: isMobile ? "100%" : 420,
            background: theme.card, borderLeft: `1px solid ${theme.cardBorder}`,
            overflowY: "auto", padding: isMobile ? 16 : 24,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 16, color: theme.accent, fontWeight: 600 }}>Property Profiles</h3>
              <button onClick={() => setPanelOpen(false)} style={{
                background: "none", border: "none", color: theme.textDim, fontSize: 20, cursor: "pointer",
              }}>x</button>
            </div>

            {/* Save section */}
            <div style={{
              background: theme.input, borderRadius: 10, padding: 16, marginBottom: 20,
              border: `1px solid ${theme.inputBorder}`,
            }}>
              <label style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 6 }}>
                Property Name / Address
              </label>
              <input
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. 32 Jacaranda Rd, Pinelands"
                style={{
                  background: theme.card, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                  padding: "8px 10px", color: theme.text, fontSize: 14, width: "100%", outline: "none",
                  marginBottom: 10,
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => handleSave(true)} style={{
                  background: theme.accent, color: "#000", border: "none", borderRadius: 6,
                  padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", flex: 1,
                }}>Save as New</button>
                {activeProfileId && (
                  <button onClick={() => handleSave(false)} style={{
                    background: "transparent", border: `1px solid ${theme.accent}`, borderRadius: 6,
                    padding: "8px 16px", fontSize: 12, color: theme.accent, cursor: "pointer", flex: 1,
                  }}>Update Current</button>
                )}
              </div>
            </div>

            {/* Profile list */}
            {profileSummaries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 13 }}>
                No saved profiles yet. Save your current calculation above.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {profileSummaries.map((p) => (
                  <div key={p.id} style={{
                    background: p.id === activeProfileId ? `${theme.accent}10` : theme.bg,
                    border: `1px solid ${p.id === activeProfileId ? theme.accent : theme.cardBorder}`,
                    borderRadius: 10, padding: 14,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: theme.textDim }}>
                          {new Date(p.savedAt).toLocaleDateString("en-ZA")} &middot; {p.mode} mode
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%", background: p.dealScore.color,
                        }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700,
                          color: p.netProfit >= 0 ? theme.green : theme.red,
                        }}>
                          {fmt(p.netProfit)}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => handleLoad(p)} style={{
                        background: theme.accent, color: "#000", border: "none", borderRadius: 6,
                        padding: "5px 12px", fontSize: 11, fontWeight: 700, cursor: "pointer",
                      }}>Load</button>
                      <button onClick={() => exportProfile(p)} style={{
                        background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                        padding: "5px 12px", fontSize: 11, color: theme.text, cursor: "pointer",
                      }}>Export</button>
                      <button onClick={() => handleDelete(p.id)} style={{
                        background: "none", border: `1px solid ${confirmDeleteId === p.id ? theme.red : `${theme.red}40`}`,
                        borderRadius: 6, padding: "5px 12px", fontSize: 11,
                        color: confirmDeleteId === p.id ? "#fff" : theme.red,
                        backgroundColor: confirmDeleteId === p.id ? theme.red : "transparent",
                        cursor: "pointer",
                      }}>
                        {confirmDeleteId === p.id ? "Confirm Delete" : "Delete"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Compare Profiles link */}
            {profiles.length >= 2 && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button onClick={() => { setPanelOpen(false); onCompareProfiles(); }} style={{
                  background: theme.accentDim, border: `1px solid ${theme.accent}40`, borderRadius: 8,
                  padding: "10px 20px", fontSize: 13, color: theme.accent, fontWeight: 600, cursor: "pointer",
                  width: "100%",
                }}>
                  Compare Profiles ({profiles.length})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
