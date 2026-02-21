"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt } from "../../../components/theme";
import DealAnalysis from "../../../components/deals/DealAnalysis";
import useDeals from "../../../hooks/useDeals";
import { DEAL_STAGES, getStageColor, getStageLabel } from "../../../utils/dealHelpers";
import type { Deal, DealData, DealStage } from "../../../types/deal";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "analysis", label: "Analysis" },
  { key: "contractors", label: "Contractors" },
  { key: "suppliers", label: "Suppliers" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const router = useRouter();
  const { getDeal, updateDeal, updateDealData, deleteDeal } = useDeals();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("analysis");
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

  const handleSave = useCallback((snapshot: DealData) => {
    updateDealData(dealId, snapshot);
  }, [dealId, updateDealData]);

  const handleStageChange = (newStage: DealStage) => {
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
        <button onClick={() => router.push("/pipeline")} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
          Back to Pipeline
        </button>
      </div>
    );
  }

  const stageColor = getStageColor(deal.stage);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "10px 16px" : "12px 28px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 10, paddingLeft: isMobile ? 56 : 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <button onClick={() => router.push("/pipeline")} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
            width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>&larr;</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingName ? (
              <input
                value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                onBlur={handleNameSave}
                autoFocus
                style={{
                  background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                  padding: "4px 8px", color: theme.text, fontSize: 16, fontWeight: 600, width: "100%", outline: "none",
                }}
              />
            ) : (
              <h1 onClick={() => setEditingName(true)} style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, margin: 0, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: theme.text }} title="Click to rename">
                {deal.name}
              </h1>
            )}
            <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1 }}>
              {deal.address || "No address"} &middot; {new Date(deal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <select value={deal.stage} onChange={(e) => handleStageChange(e.target.value as DealStage)} style={{
            background: `${stageColor}10`, border: `1px solid ${stageColor}30`, borderRadius: 6,
            padding: "6px 10px", color: stageColor, fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 32,
          }}>
            {DEAL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={handleDelete} style={{
            background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6,
            padding: "6px 10px", color: theme.red, fontSize: 11, cursor: "pointer", minHeight: 32,
          }}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 1, padding: isMobile ? "6px 16px" : "8px 28px", borderBottom: `1px solid ${theme.cardBorder}` }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? `${theme.accent}12` : "transparent",
            color: activeTab === tab.key ? theme.accent : theme.textDim,
            border: activeTab === tab.key ? `1px solid ${theme.accent}25` : "1px solid transparent",
            borderRadius: 6, padding: "6px 14px", fontSize: 12,
            fontWeight: activeTab === tab.key ? 600 : 400, cursor: "pointer", minHeight: 32,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ padding: isMobile ? 16 : 28 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Deal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <InfoField label="Name" value={deal.name} />
              <InfoField label="Address" value={deal.address || "\u2014"} />
              <InfoField label="Stage" value={getStageLabel(deal.stage)} valueColor={stageColor} />
              <InfoField label="Created" value={new Date(deal.createdAt).toLocaleDateString()} />
              <InfoField label="Purchase Price" value={fmt(deal.purchasePrice)} mono />
              <InfoField label="Expected Sale" value={fmt(deal.expectedSalePrice)} mono />
            </div>
          </div>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginTop: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Notes</h3>
            <textarea
              value={notesInput} onChange={(e) => setNotesInput(e.target.value)} onBlur={handleNotesSave}
              placeholder="Add notes about this deal..."
              style={{
                width: "100%", minHeight: 120, background: theme.input, border: `1px solid ${theme.inputBorder}`,
                borderRadius: 6, padding: 12, color: theme.text, fontSize: 13, lineHeight: 1.6,
                resize: "vertical", outline: "none", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            />
          </div>
        </div>
      )}

      {(activeTab === "analysis" || activeTab === "contractors" || activeTab === "suppliers") && (
        <DealAnalysis initialData={deal.data} dealId={deal.id} onSave={handleSave} view={activeTab} />
      )}

      {activeTab === "budget" && (
        <div style={{ padding: isMobile ? 16 : 28 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 40, textAlign: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: "0 0 6px" }}>Budget Tracking</h3>
            <p style={{ fontSize: 12, color: theme.textDim, maxWidth: 360, margin: "0 auto" }}>
              Detailed budget tracking with actual vs projected costs. Coming soon.
            </p>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div style={{ padding: isMobile ? 16 : 28 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 40, textAlign: "center" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: "0 0 6px" }}>Project Timeline</h3>
            <p style={{ fontSize: 12, color: theme.textDim, maxWidth: 360, margin: "0 auto" }}>
              Gantt-style timeline with milestones and progress tracking. Coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, color: valueColor || theme.text, fontWeight: valueColor ? 600 : 400, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</div>
    </div>
  );
}
