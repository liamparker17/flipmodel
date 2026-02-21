"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt } from "../../../components/theme";
import DealAnalysis from "../../../components/DealAnalysis";
import useDeals from "../../../hooks/useDeals";
import { DEAL_STAGES, getStageColor, getStageLabel } from "../../../utils/dealHelpers";

export default function DealDetailPage() {
  const { dealId } = useParams();
  const router = useRouter();
  const { getDeal, updateDeal, updateDealData, deleteDeal } = useDeals();
  const [deal, setDeal] = useState(null);
  const [activeTab, setActiveTab] = useState("analysis");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const d = getDeal(dealId);
    if (d) {
      setDeal(d);
      setNameInput(d.name);
      setNotesInput(d.notes || "");
    }
  }, [dealId, getDeal]);

  const handleSave = useCallback((snapshot) => {
    updateDealData(dealId, snapshot);
  }, [dealId, updateDealData]);

  const handleStageChange = (newStage) => {
    updateDeal(dealId, { stage: newStage });
    setDeal((prev) => prev ? { ...prev, stage: newStage } : prev);
  };

  const handleNameSave = () => {
    updateDeal(dealId, { name: nameInput });
    setDeal((prev) => prev ? { ...prev, name: nameInput } : prev);
    setEditingName(false);
  };

  const handleNotesSave = () => {
    updateDeal(dealId, { notes: notesInput });
    setDeal((prev) => prev ? { ...prev, notes: notesInput } : prev);
  };

  const handleDelete = () => {
    if (window.confirm("Delete this deal? This cannot be undone.")) {
      deleteDeal(dealId);
      router.push("/pipeline");
    }
  };

  if (!deal) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>
        <p>Deal not found.</p>
        <button onClick={() => router.push("/pipeline")} style={{
          background: theme.accent, color: "#000", border: "none", borderRadius: 8,
          padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12,
        }}>Back to Pipeline</button>
      </div>
    );
  }

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "analysis", label: "Analysis" },
    { key: "notes", label: "Notes" },
  ];

  const stageColor = getStageColor(deal.stage);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Deal Header */}
      <div style={{
        padding: isMobile ? "12px 16px" : "16px 32px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, paddingLeft: isMobile ? 60 : 32,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <button onClick={() => router.push("/pipeline")} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
            width: 36, height: 36, color: theme.textDim, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>←</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingName ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input
                  value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  onBlur={handleNameSave}
                  autoFocus
                  style={{
                    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                    padding: "6px 10px", color: theme.text, fontSize: 18, fontWeight: 700, width: "100%",
                    outline: "none",
                  }}
                />
              </div>
            ) : (
              <h1
                onClick={() => setEditingName(true)}
                style={{
                  fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0, cursor: "pointer",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}
                title="Click to rename"
              >
                {deal.name}
              </h1>
            )}
            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
              Created {new Date(deal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* Stage selector */}
          <select
            value={deal.stage}
            onChange={(e) => handleStageChange(e.target.value)}
            style={{
              background: `${stageColor}18`, border: `1px solid ${stageColor}40`,
              borderRadius: 8, padding: "8px 12px", color: stageColor,
              fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
            }}
          >
            {DEAL_STAGES.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <button onClick={handleDelete} style={{
            background: "transparent", border: `1px solid ${theme.red}40`, borderRadius: 8,
            padding: "8px 12px", color: theme.red, fontSize: 12, cursor: "pointer", minHeight: 36,
          }}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 2, padding: isMobile ? "8px 16px" : "10px 32px",
        borderBottom: `1px solid ${theme.cardBorder}`,
      }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: activeTab === tab.key ? theme.accent : "transparent",
              color: activeTab === tab.key ? "#000" : theme.textDim,
              border: `1px solid ${activeTab === tab.key ? theme.accent : theme.cardBorder}`,
              borderRadius: 8, padding: "8px 16px", fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 400,
              cursor: "pointer", minHeight: 36,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ padding: isMobile ? 16 : 32 }}>
          <div style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            borderRadius: 12, padding: 20, marginBottom: 16,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
              Deal Information
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Name</div>
                <div style={{ fontSize: 15, color: theme.text }}>{deal.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Stage</div>
                <div style={{ fontSize: 15, color: stageColor, fontWeight: 600 }}>{getStageLabel(deal.stage)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Created</div>
                <div style={{ fontSize: 15, color: theme.text }}>{new Date(deal.createdAt).toLocaleDateString()}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Last Updated</div>
                <div style={{ fontSize: 15, color: theme.text }}>{new Date(deal.updatedAt).toLocaleDateString()}</div>
              </div>
              {deal.data?.acq && (
                <>
                  <div>
                    <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Purchase Price</div>
                    <div style={{ fontSize: 15, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.data.acq.purchasePrice)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>Expected Sale</div>
                    <div style={{ fontSize: 15, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(deal.data.resale?.expectedPrice)}</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "analysis" && (
        <DealAnalysis
          initialData={deal.data}
          dealId={deal.id}
          onSave={handleSave}
        />
      )}

      {activeTab === "notes" && (
        <div style={{ padding: isMobile ? 16 : 32 }}>
          <div style={{
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            borderRadius: 12, padding: 20,
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>
              Deal Notes
            </h3>
            <textarea
              value={notesInput}
              onChange={(e) => setNotesInput(e.target.value)}
              onBlur={handleNotesSave}
              placeholder="Add notes about this deal..."
              style={{
                width: "100%", minHeight: 200, background: theme.input,
                border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
                padding: 14, color: theme.text, fontSize: 14, lineHeight: 1.6,
                resize: "vertical", outline: "none",
                fontFamily: "'Outfit', 'Segoe UI', sans-serif",
              }}
            />
            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>
              Notes auto-save when you click away.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
