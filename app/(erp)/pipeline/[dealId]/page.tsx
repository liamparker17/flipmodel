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
        <button onClick={() => router.push("/pipeline")} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
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
                  padding: "6px 10px", color: theme.text, fontSize: 18, fontWeight: 700, width: "100%", outline: "none",
                }}
              />
            ) : (
              <h1 onClick={() => setEditingName(true)} style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0, cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title="Click to rename">
                {deal.name}
              </h1>
            )}
            <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>
              {deal.address || "No address"} &middot; Created {new Date(deal.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select value={deal.stage} onChange={(e) => handleStageChange(e.target.value as DealStage)} style={{
            background: `${stageColor}18`, border: `1px solid ${stageColor}40`, borderRadius: 8,
            padding: "8px 12px", color: stageColor, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
          }}>
            {DEAL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={handleDelete} style={{
            background: "transparent", border: `1px solid ${theme.red}40`, borderRadius: 8,
            padding: "8px 12px", color: theme.red, fontSize: 12, cursor: "pointer", minHeight: 36,
          }}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 2, padding: isMobile ? "8px 16px" : "10px 32px", borderBottom: `1px solid ${theme.cardBorder}` }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? theme.accent : "transparent",
            color: activeTab === tab.key ? "#000" : theme.textDim,
            border: `1px solid ${activeTab === tab.key ? theme.accent : theme.cardBorder}`,
            borderRadius: 8, padding: "8px 16px", fontSize: 13,
            fontWeight: activeTab === tab.key ? 700 : 400, cursor: "pointer", minHeight: 36,
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div style={{ padding: isMobile ? 16 : 32 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Deal Information</h3>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16 }}>
              <InfoField label="Name" value={deal.name} />
              <InfoField label="Address" value={deal.address || "—"} />
              <InfoField label="Stage" value={getStageLabel(deal.stage)} valueColor={stageColor} />
              <InfoField label="Created" value={new Date(deal.createdAt).toLocaleDateString()} />
              <InfoField label="Purchase Price" value={fmt(deal.purchasePrice)} mono />
              <InfoField label="Expected Sale" value={fmt(deal.expectedSalePrice)} mono />
            </div>
          </div>
          {/* Notes */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 20, marginTop: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: theme.accent, textTransform: "uppercase", letterSpacing: 1.5, margin: "0 0 16px" }}>Notes</h3>
            <textarea
              value={notesInput} onChange={(e) => setNotesInput(e.target.value)} onBlur={handleNotesSave}
              placeholder="Add notes about this deal..."
              style={{
                width: "100%", minHeight: 150, background: theme.input, border: `1px solid ${theme.inputBorder}`,
                borderRadius: 8, padding: 14, color: theme.text, fontSize: 14, lineHeight: 1.6,
                resize: "vertical", outline: "none", fontFamily: "'Outfit', 'Segoe UI', sans-serif",
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "analysis" && (
        <DealAnalysis initialData={deal.data} dealId={deal.id} onSave={handleSave} />
      )}

      {activeTab === "budget" && (
        <div style={{ padding: isMobile ? 16 : 32 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>R</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>Budget Tracking</h3>
            <p style={{ fontSize: 13, color: theme.textDim, maxWidth: 400, margin: "0 auto" }}>
              Detailed budget tracking with actual vs projected costs, expense categories, and receipt management. Coming soon.
            </p>
          </div>
        </div>
      )}

      {activeTab === "timeline" && (
        <div style={{ padding: isMobile ? 16 : 32 }}>
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 40, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>T</div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>Project Timeline</h3>
            <p style={{ fontSize: 13, color: theme.textDim, maxWidth: 400, margin: "0 auto" }}>
              Gantt-style timeline with milestones, contractor schedules, and progress tracking. Coming soon.
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
      <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 15, color: valueColor || theme.text, fontWeight: valueColor ? 600 : 400, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</div>
    </div>
  );
}
