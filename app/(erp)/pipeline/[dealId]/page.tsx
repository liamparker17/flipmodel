"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt, pct, styles } from "../../../components/theme";
import DealAnalysis from "../../../components/deals/DealAnalysis";
import useDeals from "../../../hooks/api/useApiDeals";
import { DEAL_STAGES, getStageColor, getStageLabel, computeDealMetrics, PRIORITY_CONFIG, getExpensesByCategory, getDealProgress, EXPENSE_CATEGORIES } from "../../../utils/dealHelpers";
import type { Deal, DealData, DealStage, DealPriority, Expense, ExpenseCategory, PaymentMethod, Milestone, MilestoneStatus, DealContact, ContactRole, Activity } from "../../../types/deal";
import { BUDGET_ALERT_THRESHOLD } from "@/lib/constants";
import TutorialCard from "../../../components/TutorialCard";
import useOrgContext from "../../../hooks/useOrgContext";

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "analysis", label: "Analysis" },
  { key: "execution", label: "Renovation" },
  { key: "people", label: "People" },
  { key: "activity", label: "Activity" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function DealDetailPage() {
  const params = useParams();
  const dealId = params.dealId as string;
  const router = useRouter();
  const { getDeal, updateDeal, updateDealData, deleteDeal, moveDeal, addExpense, deleteExpense, addMilestone, updateMilestone, toggleTask, addContact, deleteContact, addActivity } = useDeals();
  const { role } = useOrgContext();
  const canEditDealName = role === "executive";
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [editingAddress, setEditingAddress] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notesInput, setNotesInput] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const refreshDeal = useCallback(() => {
    const d = getDeal(dealId);
    if (d) {
      setDeal(d);
      setNameInput(d.name);
      setAddressInput(d.address || "");
      setNotesInput(d.notes || "");
      setTagsInput((d.tags || []).join(", "));
    }
  }, [dealId, getDeal]);

  useEffect(() => { refreshDeal(); }, [refreshDeal]);

  const handleSave = useCallback((snapshot: DealData) => {
    updateDealData(dealId, snapshot);
  }, [dealId, updateDealData]);

  const handleStageChange = async (newStage: DealStage) => { await moveDeal(dealId, newStage); refreshDeal(); };
  const handlePriorityChange = async (priority: DealPriority) => { await updateDeal(dealId, { priority }); refreshDeal(); };
  const handleNameSave = async () => { await updateDeal(dealId, { name: nameInput }); setEditingName(false); refreshDeal(); };
  const handleAddressSave = async () => { await updateDeal(dealId, { address: addressInput }); setEditingAddress(false); refreshDeal(); };
  const handleNotesSave = async () => { await updateDeal(dealId, { notes: notesInput }); addActivity(dealId, "note_added", "Notes updated"); refreshDeal(); };
  const handleTagsSave = async () => { const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean); await updateDeal(dealId, { tags }); refreshDeal(); };
  const handleDelete = () => { if (window.confirm("Delete this property? This cannot be undone.")) { deleteDeal(dealId); router.push("/pipeline"); } };

  if (!deal) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>
        <p>Property not found.</p>
        <button onClick={() => router.push("/pipeline")} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
          Back to Pipeline
        </button>
      </div>
    );
  }

  const stageColor = getStageColor(deal.stage);
  const metrics = computeDealMetrics(deal);
  const progress = getDealProgress(deal);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{
        padding: isMobile ? "10px 16px" : "12px 28px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 8, paddingLeft: isMobile ? 56 : 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
          <button onClick={() => router.push("/pipeline")} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
            width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>&larr;</button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingName && canEditDealName ? (
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSave()} onBlur={handleNameSave} autoFocus
                style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "4px 8px", color: theme.text, fontSize: 16, fontWeight: 600, width: "100%", outline: "none" }}
              />
            ) : (
              <h1 onClick={canEditDealName ? () => setEditingName(true) : undefined} style={{ fontSize: isMobile ? 16 : 20, fontWeight: 600, margin: 0, cursor: canEditDealName ? "pointer" : "default", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: theme.text }} title={canEditDealName ? "Click to rename" : undefined}>
                {deal.name}
              </h1>
            )}
            <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1, display: "flex", alignItems: "center", gap: 6 }}>
              {editingAddress && canEditDealName ? (
                <input value={addressInput} onChange={(e) => setAddressInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddressSave()} onBlur={handleAddressSave} autoFocus
                  style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "2px 6px", color: theme.text, fontSize: 10, outline: "none", width: 200 }}
                />
              ) : (
                <span onClick={canEditDealName ? () => setEditingAddress(true) : undefined} style={{ cursor: canEditDealName ? "pointer" : "default" }}>{deal.address || (canEditDealName ? "Click to add address" : "No address")}</span>
              )}
              <span>&middot;</span>
              <span>{new Date(deal.createdAt).toLocaleDateString("en-ZA")}</span>
              <span>&middot;</span>
              <span>{metrics.daysInPipeline}d in pipeline</span>
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <select value={deal.priority} onChange={(e) => handlePriorityChange(e.target.value as DealPriority)} style={{
            background: `${PRIORITY_CONFIG[deal.priority]?.color || theme.textDim}10`, border: `1px solid ${PRIORITY_CONFIG[deal.priority]?.color || theme.textDim}30`,
            borderRadius: 6, padding: "5px 8px", color: PRIORITY_CONFIG[deal.priority]?.color || theme.textDim, fontSize: 10, fontWeight: 600, cursor: "pointer", minHeight: 30,
          }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          <select value={deal.stage} onChange={(e) => handleStageChange(e.target.value as DealStage)} style={{
            background: `${stageColor}10`, border: `1px solid ${stageColor}30`, borderRadius: 6,
            padding: "5px 8px", color: stageColor, fontSize: 10, fontWeight: 600, cursor: "pointer", minHeight: 30,
          }}>
            {DEAL_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <button onClick={handleDelete} style={{
            background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 6,
            padding: "5px 8px", color: theme.red, fontSize: 10, cursor: "pointer", minHeight: 30,
          }}>Delete</button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div style={{ display: "flex", gap: 1, padding: isMobile ? "6px 16px" : "8px 28px", borderBottom: `1px solid ${theme.cardBorder}`, overflowX: "auto" }}>
        {[
          { label: "Purchase", value: fmt(metrics.purchasePrice), color: theme.text },
          { label: "Expected Sale", value: fmt(metrics.expectedPrice), color: theme.accent },
          { label: "Est. Profit", value: fmt(metrics.estimatedProfit), color: metrics.estimatedProfit >= 0 ? theme.green : theme.red },
          { label: "ROI", value: pct(metrics.estimatedRoi), color: metrics.estimatedRoi >= 0.15 ? theme.green : metrics.estimatedRoi >= 0 ? theme.orange : theme.red },
          { label: "Progress", value: progress.total > 0 ? `${Math.round(progress.pct)}%` : "—", color: theme.accent },
        ].map((m) => (
          <div key={m.label} style={{ padding: "4px 12px", minWidth: 0 }}>
            <div style={{ fontSize: 8, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, whiteSpace: "nowrap" }}>{m.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 1, padding: isMobile ? "6px 16px" : "6px 28px", borderBottom: `1px solid ${theme.cardBorder}`, overflowX: "auto" }}>
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            background: activeTab === tab.key ? `${theme.accent}12` : "transparent",
            color: activeTab === tab.key ? theme.accent : theme.textDim,
            border: activeTab === tab.key ? `1px solid ${theme.accent}25` : "1px solid transparent",
            borderRadius: 6, padding: "5px 12px", fontSize: 11,
            fontWeight: activeTab === tab.key ? 600 : 400, cursor: "pointer", minHeight: 30, whiteSpace: "nowrap",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab deal={deal} notesInput={notesInput} setNotesInput={setNotesInput} onNotesSave={handleNotesSave}
          tagsInput={tagsInput} setTagsInput={setTagsInput} onTagsSave={handleTagsSave} isMobile={isMobile} metrics={metrics} />
      )}

      {activeTab === "analysis" && (
        <DealAnalysis initialData={deal.data} dealId={deal.id} onSave={handleSave} view="analysis" embedded />
      )}

      {activeTab === "execution" && (
        <ExecutionTab deal={deal}
          onAddExpense={(expense) => { addExpense(dealId, expense); refreshDeal(); }}
          onDeleteExpense={(expenseId) => { deleteExpense(dealId, expenseId); refreshDeal(); }}
          onAddMilestone={(ms) => { addMilestone(dealId, ms); refreshDeal(); }}
          onUpdateMilestone={(msId, changes) => { updateMilestone(dealId, msId, changes); refreshDeal(); }}
          onToggleTask={(msId, taskId) => { toggleTask(dealId, msId, taskId); refreshDeal(); }}
          isMobile={isMobile}
        />
      )}

      {activeTab === "people" && (
        <PeopleTab deal={deal}
          onAddContact={(contact) => { addContact(dealId, contact); refreshDeal(); }}
          onDeleteContact={(contactId) => { deleteContact(dealId, contactId); refreshDeal(); }}
          isMobile={isMobile}
        />
      )}

      {activeTab === "activity" && (
        <ActivityTab deal={deal} isMobile={isMobile} />
      )}
      <TutorialCard page="deal-detail" />
    </div>
  );
}

// ─── Overview Tab ───
function OverviewTab({ deal, notesInput, setNotesInput, onNotesSave, tagsInput, setTagsInput, onTagsSave, isMobile, metrics }: {
  deal: Deal; notesInput: string; setNotesInput: (v: string) => void; onNotesSave: () => void;
  tagsInput: string; setTagsInput: (v: string) => void; onTagsSave: () => void; isMobile: boolean; metrics: ReturnType<typeof computeDealMetrics>;
}) {
  const stageColor = getStageColor(deal.stage);
  const progress = getDealProgress(deal);
  const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const projectedExpenses = (deal.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);

  return (
    <div style={{ padding: isMobile ? 16 : 28, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
      {/* Deal Info */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Property Details</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <InfoField label="Name" value={deal.name} />
          <InfoField label="Address" value={deal.address || "—"} />
          <InfoField label="Stage" value={getStageLabel(deal.stage)} valueColor={stageColor} />
          <InfoField label="Priority" value={PRIORITY_CONFIG[deal.priority]?.label || deal.priority} valueColor={PRIORITY_CONFIG[deal.priority]?.color} />
          <InfoField label="Created" value={new Date(deal.createdAt).toLocaleDateString("en-ZA")} />
          <InfoField label="Last Updated" value={new Date(deal.updatedAt).toLocaleDateString("en-ZA")} />
          <InfoField label="Purchase Price" value={fmt(deal.purchasePrice)} mono />
          <InfoField label="Expected Sale" value={fmt(deal.expectedSalePrice)} mono />
          {deal.offerAmount && <InfoField label="Offer Amount" value={fmt(deal.offerAmount)} mono />}
          {deal.purchaseDate && <InfoField label="Purchase Date" value={new Date(deal.purchaseDate).toLocaleDateString("en-ZA")} />}
          {deal.actualSalePrice && <InfoField label="Actual Sale Price" value={fmt(deal.actualSalePrice)} mono valueColor={theme.green} />}
        </div>
      </div>

      {/* Financial Summary */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Financial Summary</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <InfoField label="Est. Profit" value={fmt(metrics.estimatedProfit)} mono valueColor={metrics.estimatedProfit >= 0 ? theme.green : theme.red} />
          <InfoField label="Est. ROI" value={pct(metrics.estimatedRoi)} mono valueColor={metrics.estimatedRoi >= 0.15 ? theme.green : theme.orange} />
          <InfoField label="Actual Expenses" value={fmt(actualExpenses)} mono />
          <InfoField label="Projected Expenses" value={fmt(projectedExpenses)} mono />
          <InfoField label="Reno Budget" value={fmt(deal.data?.quickRenoEstimate || 0)} mono />
          <InfoField label="Days in Pipeline" value={`${metrics.daysInPipeline} days`} />
        </div>
        {progress.total > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 4 }}>
              <span>Project Progress</span>
              <span>{progress.completed}/{progress.total} ({Math.round(progress.pct)}%)</span>
            </div>
            <div style={{ height: 6, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 3 }} />
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Notes</h3>
        <textarea value={notesInput} onChange={(e) => setNotesInput(e.target.value)} onBlur={onNotesSave}
          placeholder="Add notes about this deal..."
          style={{
            width: "100%", minHeight: 100, background: theme.input, border: `1px solid ${theme.inputBorder}`,
            borderRadius: 6, padding: 10, color: theme.text, fontSize: 12, lineHeight: 1.6,
            resize: "vertical", outline: "none", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        />
      </div>

      {/* Tags */}
      <div style={styles.card}>
        <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Tags</h3>
        <input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} onBlur={onTagsSave}
          placeholder="Enter tags separated by commas..."
          style={{
            width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`,
            borderRadius: 6, padding: "8px 10px", color: theme.text, fontSize: 12, outline: "none",
          }}
        />
        {deal.tags && deal.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
            {deal.tags.map((tag) => (
              <span key={tag} style={{ fontSize: 10, color: theme.accent, background: `${theme.accent}12`, padding: "2px 8px", borderRadius: 4, border: `1px solid ${theme.accent}25` }}>{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Execution Tab (Budget + Timeline merged) ───
function ExecutionTab({ deal, onAddExpense, onDeleteExpense, onAddMilestone, onUpdateMilestone, onToggleTask, isMobile }: {
  deal: Deal;
  onAddExpense: (expense: Omit<Expense, "id" | "dealId" | "createdAt">) => void;
  onDeleteExpense: (id: string) => void;
  onAddMilestone: (ms: Omit<Milestone, "id">) => void;
  onUpdateMilestone: (msId: string, changes: Partial<Milestone>) => void;
  onToggleTask: (msId: string, taskId: string) => void;
  isMobile: boolean;
}) {
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [expenseData, setExpenseData] = useState({ category: "materials" as ExpenseCategory, description: "", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", paymentMethod: "eft" as PaymentMethod, isProjected: false });
  const [msTitle, setMsTitle] = useState("");
  const [msDesc, setMsDesc] = useState("");
  const [msDue, setMsDue] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});

  const expenses = deal.expenses || [];
  const milestones = [...(deal.milestones || [])].sort((a, b) => a.order - b.order);
  const progress = getDealProgress(deal);
  const actualExpenses = expenses.filter((e) => !e.isProjected);
  const totalActual = actualExpenses.reduce((s, e) => s + e.amount, 0);
  const totalProjected = expenses.filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);
  const budget = deal.data?.quickRenoEstimate || 0;
  const budgetPct = budget > 0 ? (totalActual / budget) * 100 : 0;
  const categoryBreakdown = getExpensesByCategory(expenses);
  const statusColors: Record<string, string> = { pending: theme.textDim, in_progress: theme.accent, completed: theme.green, overdue: theme.red, skipped: theme.textDim };

  const handleExpenseSubmit = () => {
    if (!expenseData.description || expenseData.amount <= 0) return;
    onAddExpense(expenseData);
    setExpenseData({ category: "materials", description: "", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", paymentMethod: "eft", isProjected: false });
    setShowExpenseForm(false);
  };

  const handleMilestoneSubmit = () => {
    if (!msTitle) return;
    onAddMilestone({ title: msTitle, description: msDesc, dueDate: msDue, status: "pending", tasks: [], order: milestones.length + 1 });
    setMsTitle(""); setMsDesc(""); setShowMilestoneForm(false);
  };

  const handleAddTask = (msId: string) => {
    const title = newTaskInputs[msId]?.trim();
    if (!title) return;
    const ms = milestones.find((m) => m.id === msId);
    if (!ms) return;
    onUpdateMilestone(msId, { tasks: [...ms.tasks, { id: `t_${Date.now()}`, title, completed: false }] });
    setNewTaskInputs({ ...newTaskInputs, [msId]: "" });
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      {/* Progress + Budget KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Progress</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{progress.total > 0 ? `${Math.round(progress.pct)}%` : "—"}</div>
          <div style={{ fontSize: 9, color: theme.textDim }}>{progress.completed}/{progress.total} tasks</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Reno Budget</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(budget)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Spent</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: budgetPct > 100 ? theme.red : theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalActual)}</div>
          {budget > 0 && <div style={{ fontSize: 9, color: theme.textDim }}>{Math.round(budgetPct)}% of budget</div>}
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Remaining</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: budget - totalActual >= 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(budget - totalActual)}</div>
        </div>
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
          <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>Projected</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(totalProjected)}</div>
        </div>
      </div>

      {/* Budget bar */}
      {budget > 0 && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 4 }}>
            <span>Budget Usage</span>
            <span>{fmt(totalActual)} / {fmt(budget)}</span>
          </div>
          <div style={{ height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", position: "relative" }}>
            <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: totalActual > budget ? theme.red : totalActual > budget * BUDGET_ALERT_THRESHOLD ? theme.orange : theme.green, borderRadius: 5, transition: "width 0.3s" }} />
            {totalProjected > 0 && (
              <div style={{ position: "absolute", top: 0, left: `${Math.min(budgetPct, 100)}%`, height: "100%", width: `${Math.min((totalProjected / budget) * 100, 100 - Math.min(budgetPct, 100))}%`, background: `${theme.orange}40`, borderRadius: "0 5px 5px 0" }} />
            )}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Milestones */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 style={styles.sectionHeading}>Milestones</h3>
            <button onClick={() => setShowMilestoneForm(!showMilestoneForm)} style={{
              background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
              padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>{showMilestoneForm ? "Cancel" : "+ Milestone"}</button>
          </div>

          {showMilestoneForm && (
            <div style={{ background: theme.card, border: `1px solid ${theme.accent}30`, borderRadius: 8, padding: 14, marginBottom: 8 }}>
              <input value={msTitle} onChange={(e) => setMsTitle(e.target.value)} placeholder="Milestone title"
                style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 12, outline: "none", marginBottom: 6, minHeight: 32 }} />
              <div style={{ display: "flex", gap: 6 }}>
                <input type="date" value={msDue} onChange={(e) => setMsDue(e.target.value)} style={{ flex: 1, background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
                <button onClick={handleMilestoneSubmit} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 32 }}>Add</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {milestones.length === 0 ? (
              <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, textAlign: "center", color: theme.textDim, fontSize: 11 }}>No milestones yet.</div>
            ) : milestones.map((ms, idx) => {
              const tasksDone = ms.tasks.filter((t) => t.completed).length;
              const tasksPct = ms.tasks.length > 0 ? (tasksDone / ms.tasks.length) * 100 : (ms.status === "completed" ? 100 : 0);
              const isOverdue = new Date(ms.dueDate) < new Date() && ms.status !== "completed" && ms.status !== "skipped";
              const color = isOverdue ? theme.red : statusColors[ms.status] || theme.textDim;

              return (
                <div key={ms.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderLeft: `3px solid ${color}` }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: ms.status === "completed" ? theme.green : `${color}20`, border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: ms.status === "completed" ? "#fff" : color, fontWeight: 700, flexShrink: 0 }}>
                      {ms.status === "completed" ? "✓" : idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ms.status === "completed" ? theme.textDim : theme.text, textDecoration: ms.status === "completed" ? "line-through" : "none" }}>{ms.title}</span>
                        {isOverdue && <span style={{ fontSize: 7, color: theme.red, fontWeight: 700, textTransform: "uppercase" }}>Overdue</span>}
                      </div>
                      <div style={{ fontSize: 9, color: theme.textDim, display: "flex", gap: 6 }}>
                        <span>{new Date(ms.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
                        {ms.tasks.length > 0 && <span>{tasksDone}/{ms.tasks.length} tasks</span>}
                      </div>
                    </div>
                    <select value={ms.status} onChange={(e) => onUpdateMilestone(ms.id, { status: e.target.value as MilestoneStatus, ...(e.target.value === "completed" ? { completedDate: new Date().toISOString() } : {}) })} style={{
                      background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 4,
                      padding: "2px 5px", color, fontSize: 9, fontWeight: 600, cursor: "pointer",
                    }}>
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="skipped">Skipped</option>
                    </select>
                  </div>
                  {ms.tasks.length > 0 && (
                    <div style={{ padding: "0 12px 2px" }}>
                      <div style={{ height: 3, background: theme.input, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${tasksPct}%`, background: color, borderRadius: 2 }} />
                      </div>
                    </div>
                  )}
                  <div style={{ padding: "4px 12px 8px", paddingLeft: 42 }}>
                    {ms.tasks.map((task) => (
                      <div key={task.id} onClick={() => onToggleTask(ms.id, task.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 0", cursor: "pointer" }}>
                        <div style={{ width: 13, height: 13, borderRadius: 3, border: `1.5px solid ${task.completed ? theme.green : theme.inputBorder}`, background: task.completed ? theme.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", flexShrink: 0 }}>{task.completed ? "✓" : ""}</div>
                        <span style={{ fontSize: 10, color: task.completed ? theme.textDim : theme.text, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 4, marginTop: 3 }}>
                      <input value={newTaskInputs[ms.id] || ""} onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [ms.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTask(ms.id)} placeholder="Add task..."
                        style={{ flex: 1, background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "3px 6px", color: theme.text, fontSize: 10, outline: "none", minHeight: 22 }} />
                      <button onClick={() => handleAddTask(ms.id)} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 4, padding: "3px 6px", fontSize: 9, cursor: "pointer", minHeight: 22 }}>+</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown + Expenses */}
        <div>
          {categoryBreakdown.length > 0 && (
            <div style={{ ...styles.card, padding: 14, marginBottom: 12 }}>
              <h3 style={{ ...styles.sectionHeading, margin: "0 0 8px" }}>Spending by Category</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {categoryBreakdown.map((cat) => (
                  <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <div style={{ width: 100, fontSize: 10, color: theme.text }}>{cat.label}</div>
                    <div style={{ flex: 1, height: 5, background: theme.input, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(cat.actual / (totalActual || 1)) * 100}%`, background: cat.color, borderRadius: 3, opacity: 0.7 }} />
                    </div>
                    <div style={{ width: 70, fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text, textAlign: "right" }}>{fmt(cat.actual)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={styles.sectionHeading}>Expenses ({expenses.length})</h3>
            <button onClick={() => setShowExpenseForm(!showExpenseForm)} style={{
              background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
              padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer",
            }}>{showExpenseForm ? "Cancel" : "+ Expense"}</button>
          </div>

          {showExpenseForm && (
            <div style={{ background: theme.card, border: `1px solid ${theme.accent}30`, borderRadius: 8, padding: 14, marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <select value={expenseData.category} onChange={(e) => setExpenseData({ ...expenseData, category: e.target.value as ExpenseCategory })} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, minHeight: 32 }}>
                  {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                </select>
                <input type="number" value={expenseData.amount || ""} onChange={(e) => setExpenseData({ ...expenseData, amount: Number(e.target.value) })} placeholder="Amount (R)" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono', monospace", minHeight: 32 }} />
                <input value={expenseData.description} onChange={(e) => setExpenseData({ ...expenseData, description: e.target.value })} placeholder="Description" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
                <input value={expenseData.vendor} onChange={(e) => setExpenseData({ ...expenseData, vendor: e.target.value })} placeholder="Vendor" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
                <input type="date" value={expenseData.date} onChange={(e) => setExpenseData({ ...expenseData, date: e.target.value })} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
                <select value={expenseData.paymentMethod} onChange={(e) => setExpenseData({ ...expenseData, paymentMethod: e.target.value as PaymentMethod })} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, minHeight: 32 }}>
                  <option value="eft">EFT</option><option value="cash">Cash</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="account">On Account</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: theme.textDim, cursor: "pointer" }}>
                  <input type="checkbox" checked={expenseData.isProjected} onChange={(e) => setExpenseData({ ...expenseData, isProjected: e.target.checked })} style={{ accentColor: theme.accent }} />
                  Projected
                </label>
                <div style={{ flex: 1 }} />
                <button onClick={handleExpenseSubmit} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 32 }}>Save</button>
              </div>
            </div>
          )}

          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
            {expenses.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: theme.textDim, fontSize: 11 }}>No expenses yet.</div>
            ) : (
              <div style={{ maxHeight: 400, overflowY: "auto" }}>
                {[...expenses].sort((a, b) => b.date.localeCompare(a.date)).map((expense) => {
                  const catInfo = EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES];
                  return (
                    <div key={expense.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderBottom: `1px solid ${theme.cardBorder}`, opacity: expense.isProjected ? 0.6 : 1 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: catInfo?.color || theme.textDim, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: theme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {expense.description}
                          {expense.isProjected && <span style={{ fontSize: 8, color: theme.orange, marginLeft: 4 }}>(projected)</span>}
                        </div>
                        <div style={{ fontSize: 9, color: theme.textDim }}>{expense.vendor} &middot; {expense.date}</div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: expense.isProjected ? theme.textDim : theme.text, flexShrink: 0 }}>{fmt(expense.amount)}</div>
                      <button onClick={() => onDeleteExpense(expense.id)} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 12, cursor: "pointer", padding: "0 2px", opacity: 0.5 }}>&times;</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── People Tab (Contacts + Contractors unified) ───
function PeopleTab({ deal, onAddContact, onDeleteContact, isMobile }: {
  deal: Deal; onAddContact: (contact: Omit<DealContact, "id">) => void; onDeleteContact: (id: string) => void; isMobile: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", role: "contractor" as ContactRole, company: "", phone: "", email: "", notes: "", profession: "", dailyRate: 0, daysWorked: 0 });

  const contacts = deal.contacts || [];
  const contractors = contacts.filter((c) => c.role === "contractor");
  const otherContacts = contacts.filter((c) => c.role !== "contractor");
  const roles: ContactRole[] = ["agent", "contractor", "attorney", "bank", "inspector", "architect", "municipality", "tenant", "buyer", "seller", "other"];

  const handleSubmit = () => {
    if (!formData.name) return;
    const contact: Omit<DealContact, "id"> = {
      name: formData.name, role: formData.role, company: formData.company || undefined, phone: formData.phone || undefined, email: formData.email || undefined, notes: formData.notes || undefined,
      ...(formData.role === "contractor" ? { profession: formData.profession || undefined, dailyRate: formData.dailyRate || undefined, daysWorked: formData.daysWorked || undefined } : {}),
    };
    onAddContact(contact);
    setFormData({ name: "", role: "contractor", company: "", phone: "", email: "", notes: "", profession: "", dailyRate: 0, daysWorked: 0 });
    setShowForm(false);
  };

  const roleColors: Record<string, string> = {
    agent: "#60A5FA", contractor: "#FB923C", attorney: "#C084FC", bank: "#34D399",
    inspector: "#22D3EE", architect: "#F472B6", municipality: "#94A3B8",
    buyer: "#FBBF24", seller: "#EF4444", tenant: "#6366F1", other: "#6B7280",
  };

  const totalLabourCost = contractors.reduce((s, c) => s + ((c.dailyRate || 0) * (c.daysWorked || 0)), 0);

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={styles.sectionHeading}>People ({contacts.length})</h3>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 30,
        }}>{showForm ? "Cancel" : "+ Add Person"}</button>
      </div>

      {showForm && (
        <div style={{ background: theme.card, border: `1px solid ${theme.accent}30`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Name *</label>
              <input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Role</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as ContactRole })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, minHeight: 34 }}>
                {roles.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Company</label>
              <input value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Phone</label>
              <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Email</label>
              <input value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
            </div>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Notes</label>
              <input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
            </div>
            {formData.role === "contractor" && (
              <>
                <div>
                  <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Profession / Trade</label>
                  <input value={formData.profession} onChange={(e) => setFormData({ ...formData, profession: e.target.value })} placeholder="e.g. Builder, Electrician" style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34 }} />
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Daily Rate (R)</label>
                    <input type="number" value={formData.dailyRate || ""} onChange={(e) => setFormData({ ...formData, dailyRate: Number(e.target.value) })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34, fontFamily: "'JetBrains Mono', monospace" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: theme.textDim, display: "block", marginBottom: 3 }}>Days Worked</label>
                    <input type="number" value={formData.daysWorked || ""} onChange={(e) => setFormData({ ...formData, daysWorked: Number(e.target.value) })} style={{ width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "7px 8px", color: theme.text, fontSize: 12, outline: "none", minHeight: 34, fontFamily: "'JetBrains Mono', monospace" }} />
                  </div>
                </div>
              </>
            )}
          </div>
          <div style={{ textAlign: "right", marginTop: 10 }}>
            <button onClick={handleSubmit} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 34 }}>Add</button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 30, textAlign: "center", color: theme.textDim, fontSize: 12 }}>
          No contacts for this property yet.
        </div>
      ) : (
        <>
          {/* Contractors section */}
          {contractors.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "#FB923C", textTransform: "uppercase", letterSpacing: 0.5 }}>Contractors ({contractors.length})</span>
                {totalLabourCost > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>Total: {fmt(totalLabourCost)}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                {contractors.map((contact) => (
                  <div key={contact.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14, borderLeft: "3px solid #FB923C" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{contact.name}</span>
                      <button onClick={() => onDeleteContact(contact.id)} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 12, cursor: "pointer", padding: 0, opacity: 0.5 }}>&times;</button>
                    </div>
                    {contact.profession && <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 2 }}>{contact.profession}</div>}
                    {contact.company && <div style={{ fontSize: 10, color: theme.textDim }}>{contact.company}</div>}
                    {(contact.dailyRate || 0) > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, padding: "4px 0", borderTop: `1px solid ${theme.cardBorder}` }}>
                        <span style={{ fontSize: 10, color: theme.textDim }}>{contact.daysWorked || 0} days × {fmt(contact.dailyRate || 0)}/day</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt((contact.dailyRate || 0) * (contact.daysWorked || 0))}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                      {contact.phone && <span style={{ fontSize: 10, color: theme.accent }}>{contact.phone}</span>}
                      {contact.email && <span style={{ fontSize: 10, color: theme.accent }}>{contact.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other contacts */}
          {otherContacts.length > 0 && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, display: "block", marginBottom: 8 }}>Other Contacts ({otherContacts.length})</span>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8 }}>
                {otherContacts.map((contact) => {
                  const roleColor = roleColors[contact.role] || theme.textDim;
                  return (
                    <div key={contact.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14, borderLeft: `3px solid ${roleColor}` }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{contact.name}</span>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 8, fontWeight: 600, color: roleColor, background: `${roleColor}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{contact.role}</span>
                          <button onClick={() => onDeleteContact(contact.id)} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 12, cursor: "pointer", padding: 0, opacity: 0.5 }}>&times;</button>
                        </div>
                      </div>
                      {contact.company && <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 2 }}>{contact.company}</div>}
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                        {contact.phone && <span style={{ fontSize: 10, color: theme.accent }}>{contact.phone}</span>}
                        {contact.email && <span style={{ fontSize: 10, color: theme.accent }}>{contact.email}</span>}
                      </div>
                      {contact.notes && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4, fontStyle: "italic" }}>{contact.notes}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Activity Tab ───
function ActivityTab({ deal, isMobile }: { deal: Deal; isMobile: boolean }) {
  const activities = [...(deal.activities || [])].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const typeIcons: Record<string, { icon: string; color: string }> = {
    stage_change: { icon: "→", color: theme.accent },
    note_added: { icon: "✎", color: theme.textDim },
    expense_added: { icon: "R", color: theme.orange },
    milestone_completed: { icon: "✓", color: theme.green },
    document_added: { icon: "📄", color: theme.accent },
    contact_added: { icon: "+", color: "#C084FC" },
    price_change: { icon: "$", color: theme.orange },
    deal_created: { icon: "★", color: theme.accent },
    data_updated: { icon: "↻", color: theme.textDim },
    task_completed: { icon: "☑", color: theme.green },
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28 }}>
      <h3 style={{ ...styles.sectionHeading, margin: "0 0 16px" }}>Activity Timeline ({activities.length})</h3>
      {activities.length === 0 ? (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 30, textAlign: "center", color: theme.textDim, fontSize: 12 }}>
          No activity recorded yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {activities.map((act, i) => {
            const conf = typeIcons[act.type] || { icon: "•", color: theme.textDim };
            return (
              <div key={act.id} style={{ display: "flex", gap: 12, paddingBottom: 12, position: "relative" }}>
                {i < activities.length - 1 && (
                  <div style={{ position: "absolute", left: 11, top: 24, width: 1, bottom: 0, background: theme.cardBorder }} />
                )}
                <div style={{
                  width: 24, height: 24, borderRadius: "50%", background: `${conf.color}15`, border: `1.5px solid ${conf.color}`,
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: conf.color, fontWeight: 700, flexShrink: 0, zIndex: 1,
                }}>{conf.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: theme.text }}>{act.description}</div>
                  <div style={{ fontSize: 10, color: theme.textDim, marginTop: 1 }}>
                    {new Date(act.timestamp).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })} at {new Date(act.timestamp).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value, valueColor, mono }: { label: string; value: string; valueColor?: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: valueColor || theme.text, fontWeight: valueColor ? 600 : 400, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</div>
    </div>
  );
}
