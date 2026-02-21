"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../../components/theme";
import useDeals from "../../../hooks/useDeals";
import { getStageColor, getStageLabel, computeDealMetrics, getDealProgress, getExpensesByCategory, PRIORITY_CONFIG, EXPENSE_CATEGORIES } from "../../../utils/dealHelpers";
import type { Deal, Expense, ExpenseCategory, PaymentMethod, Milestone, MilestoneStatus } from "../../../types/deal";

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { getDeal, updateDeal, addExpense, deleteExpense, addMilestone, updateMilestone, toggleTask, addActivity } = useDeals();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const refreshDeal = useCallback(() => {
    const d = getDeal(projectId);
    if (d) setDeal(d);
  }, [projectId, getDeal]);

  useEffect(() => { refreshDeal(); }, [refreshDeal]);

  if (!deal) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>
        <p>Project not found.</p>
        <button onClick={() => router.push("/projects")} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>
          Back to Projects
        </button>
      </div>
    );
  }

  const stageColor = getStageColor(deal.stage);
  const metrics = computeDealMetrics(deal);
  const progress = getDealProgress(deal);
  const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const budget = deal.data?.quickRenoEstimate || 0;
  const budgetPct = budget > 0 ? (actualExpenses / budget) * 100 : 0;
  const categoryBreakdown = getExpensesByCategory(deal.expenses || []);
  const milestones = [...(deal.milestones || [])].sort((a, b) => a.order - b.order);
  const priorityConf = PRIORITY_CONFIG[deal.priority] || PRIORITY_CONFIG.medium;
  const contractors = (deal.contacts || []).filter((c) => c.role === "contractor");
  const totalLabourCost = contractors.reduce((s, c) => s + ((c.dailyRate || 0) * (c.daysWorked || 0)), 0);

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, paddingLeft: isMobile ? 48 : 0 }}>
        <button onClick={() => router.push("/projects")} style={{
          background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          width: 32, height: 32, color: theme.textDim, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>&larr;</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>{deal.name}</h1>
            <span style={{ fontSize: 9, fontWeight: 600, color: stageColor, background: `${stageColor}15`, padding: "3px 8px", borderRadius: 4, textTransform: "uppercase" }}>{getStageLabel(deal.stage)}</span>
            <span style={{ fontSize: 9, fontWeight: 600, color: priorityConf.color }}>{priorityConf.icon} {priorityConf.label}</span>
          </div>
          {deal.address && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 1 }}>{deal.address}</div>}
        </div>
        <button onClick={() => router.push(`/pipeline/${deal.id}`)} style={{
          background: "transparent", border: `1px solid ${theme.accent}30`, borderRadius: 6,
          padding: "6px 12px", fontSize: 11, color: theme.accent, cursor: "pointer", whiteSpace: "nowrap",
        }}>Full Analysis →</button>
      </div>

      {/* Key Metrics */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          { label: "Purchase", value: fmt(metrics.purchasePrice), color: theme.text },
          { label: "Budget", value: fmt(budget), color: theme.orange },
          { label: "Spent", value: fmt(actualExpenses), color: budgetPct > 100 ? theme.red : theme.text },
          { label: "Expected Sale", value: fmt(metrics.expectedPrice), color: theme.accent },
          { label: "Est. Profit", value: fmt(metrics.estimatedProfit), color: metrics.estimatedProfit >= 0 ? theme.green : theme.red },
        ].map((m) => (
          <div key={m.label} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 }}>{m.label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: m.color, fontFamily: "'JetBrains Mono', monospace" }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        {/* Progress & Milestones */}
        <MilestonesSection deal={deal} milestones={milestones} progress={progress}
          onAddMilestone={(ms) => { addMilestone(projectId, ms); refreshDeal(); }}
          onUpdateMilestone={(msId, changes) => { updateMilestone(projectId, msId, changes); refreshDeal(); }}
          onToggleTask={(msId, taskId) => { toggleTask(projectId, msId, taskId); refreshDeal(); }}
        />

        {/* Budget Tracking */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Budget Tracking</h3>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 6 }}>
            <span>Spent: {fmt(actualExpenses)}</span>
            <span>Budget: {fmt(budget)}</span>
          </div>
          <div style={{ height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", marginBottom: 4 }}>
            <div style={{ height: "100%", width: `${Math.min(budgetPct, 100)}%`, background: budgetPct > 100 ? theme.red : budgetPct > 80 ? theme.orange : theme.green, borderRadius: 5 }} />
          </div>
          <div style={{ fontSize: 10, color: budgetPct > 100 ? theme.red : theme.textDim, marginBottom: 12 }}>
            {budgetPct > 100 ? `Over budget by ${fmt(actualExpenses - budget)}` : `${fmt(budget - actualExpenses)} remaining (${Math.round(budgetPct)}% used)`}
          </div>
          {categoryBreakdown.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, fontSize: 10, color: theme.text }}>{cat.label}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(cat.actual)}</div>
                </div>
              ))}
            </div>
          )}
          {categoryBreakdown.length === 0 && <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>No expenses tracked yet.</p>}
        </div>
      </div>

      {/* Team */}
      {contractors.length > 0 && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Contractors</h3>
            {totalLabourCost > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>Total: {fmt(totalLabourCost)}</span>}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 6 }}>
            {contractors.map((c) => (
              <div key={c.id} style={{ background: theme.input, borderRadius: 6, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span onClick={() => router.push(`/contractors?name=${encodeURIComponent(c.name)}`)}
                    style={{ fontSize: 12, fontWeight: 600, color: theme.accent, cursor: "pointer", textDecoration: "none", display: "inline-block" }}
                    onMouseEnter={(e) => { (e.target as HTMLElement).style.textDecoration = "underline"; }}
                    onMouseLeave={(e) => { (e.target as HTMLElement).style.textDecoration = "none"; }}>
                    {c.name}
                  </span>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{c.profession || c.company || "Contractor"}</div>
                  {c.phone && <div style={{ fontSize: 10, color: theme.accent, marginTop: 2 }}>{c.phone}</div>}
                </div>
                {(c.dailyRate || 0) > 0 && (
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt((c.dailyRate || 0) * (c.daysWorked || 0))}</div>
                    <div style={{ fontSize: 9, color: theme.textDim }}>{c.daysWorked || 0} days × {fmt(c.dailyRate || 0)}/day</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Expense Add */}
      <QuickExpenseAdd dealId={projectId} onAdd={(expense) => { addExpense(projectId, expense); refreshDeal(); }} isMobile={isMobile} />

      {/* Notes */}
      {deal.notes && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 8px" }}>Notes</h3>
          <p style={{ fontSize: 12, color: theme.text, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{deal.notes}</p>
        </div>
      )}
    </div>
  );
}

// ─── Milestones Section (editable) ───
function MilestonesSection({ deal, milestones, progress, onAddMilestone, onUpdateMilestone, onToggleTask }: {
  deal: Deal; milestones: Milestone[]; progress: ReturnType<typeof getDealProgress>;
  onAddMilestone: (ms: Omit<Milestone, "id">) => void;
  onUpdateMilestone: (msId: string, changes: Partial<Milestone>) => void;
  onToggleTask: (msId: string, taskId: string) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState(new Date().toISOString().split("T")[0]);
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});
  const statusColors: Record<string, string> = { pending: theme.textDim, in_progress: theme.accent, completed: theme.green, overdue: theme.red, skipped: theme.textDim };

  const handleAdd = () => {
    if (!title) return;
    onAddMilestone({ title, description: "", dueDate: due, status: "pending", tasks: [], order: milestones.length + 1 });
    setTitle(""); setShowForm(false);
  };

  const handleAddTask = (msId: string) => {
    const t = newTaskInputs[msId]?.trim();
    if (!t) return;
    const ms = milestones.find((m) => m.id === msId);
    if (!ms) return;
    onUpdateMilestone(msId, { tasks: [...ms.tasks, { id: `t_${Date.now()}`, title: t, completed: false }] });
    setNewTaskInputs({ ...newTaskInputs, [msId]: "" });
  };

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Project Progress</h3>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
          padding: "4px 8px", fontSize: 9, fontWeight: 600, cursor: "pointer",
        }}>{showForm ? "Cancel" : "+ Milestone"}</button>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginBottom: 6 }}>
        <span>{progress.completed}/{progress.total} tasks completed</span>
        <span>{Math.round(progress.pct)}%</span>
      </div>
      <div style={{ height: 10, background: theme.input, borderRadius: 5, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ height: "100%", width: `${progress.pct}%`, background: theme.accent, borderRadius: 5, transition: "width 0.3s" }} />
      </div>

      {showForm && (
        <div style={{ background: theme.input, borderRadius: 6, padding: 10, marginBottom: 8, display: "flex", gap: 6 }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milestone title" style={{ flex: 1, background: theme.card, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "5px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 28 }} />
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={{ background: theme.card, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "5px 6px", color: theme.text, fontSize: 10, outline: "none", minHeight: 28 }} />
          <button onClick={handleAdd} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 4, padding: "5px 10px", fontSize: 10, fontWeight: 600, cursor: "pointer", minHeight: 28 }}>Add</button>
        </div>
      )}

      {milestones.length === 0 ? (
        <p style={{ fontSize: 11, color: theme.textDim, margin: 0 }}>No milestones set yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {milestones.map((ms) => {
            const tasksDone = ms.tasks.filter((t) => t.completed).length;
            const isOverdue = new Date(ms.dueDate) < new Date() && ms.status !== "completed" && ms.status !== "skipped";
            const color = isOverdue ? theme.red : statusColors[ms.status] || theme.textDim;
            return (
              <div key={ms.id} style={{ background: theme.input, borderRadius: 4, borderLeft: `3px solid ${color}`, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 8px" }}>
                  <div style={{ width: 16, height: 16, borderRadius: "50%", background: ms.status === "completed" ? theme.green : `${color}20`, border: `1.5px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: ms.status === "completed" ? "#fff" : color, fontWeight: 700, flexShrink: 0 }}>
                    {ms.status === "completed" ? "✓" : ""}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: ms.status === "completed" ? theme.textDim : theme.text, fontWeight: 600, textDecoration: ms.status === "completed" ? "line-through" : "none" }}>{ms.title}</div>
                  </div>
                  {ms.tasks.length > 0 && <span style={{ fontSize: 9, color: theme.textDim }}>{tasksDone}/{ms.tasks.length}</span>}
                  <select value={ms.status} onChange={(e) => onUpdateMilestone(ms.id, { status: e.target.value as MilestoneStatus, ...(e.target.value === "completed" ? { completedDate: new Date().toISOString() } : {}) })} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 3, padding: "1px 4px", color, fontSize: 8, fontWeight: 600, cursor: "pointer" }}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                  </select>
                  <span style={{ fontSize: 9, color: isOverdue ? theme.red : theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                    {new Date(ms.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                  </span>
                </div>
                {ms.tasks.length > 0 && (
                  <div style={{ padding: "0 8px 6px", paddingLeft: 30 }}>
                    {ms.tasks.map((task) => (
                      <div key={task.id} onClick={() => onToggleTask(ms.id, task.id)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "1px 0", cursor: "pointer" }}>
                        <div style={{ width: 12, height: 12, borderRadius: 2, border: `1.5px solid ${task.completed ? theme.green : theme.inputBorder}`, background: task.completed ? theme.green : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 7, color: "#fff", flexShrink: 0 }}>{task.completed ? "✓" : ""}</div>
                        <span style={{ fontSize: 10, color: task.completed ? theme.textDim : theme.text, textDecoration: task.completed ? "line-through" : "none" }}>{task.title}</span>
                      </div>
                    ))}
                    <div style={{ display: "flex", gap: 3, marginTop: 2 }}>
                      <input value={newTaskInputs[ms.id] || ""} onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [ms.id]: e.target.value })}
                        onKeyDown={(e) => e.key === "Enter" && handleAddTask(ms.id)} placeholder="Add task..."
                        style={{ flex: 1, background: theme.card, border: `1px solid ${theme.inputBorder}`, borderRadius: 3, padding: "2px 5px", color: theme.text, fontSize: 9, outline: "none", minHeight: 20 }} />
                      <button onClick={() => handleAddTask(ms.id)} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 3, padding: "2px 5px", fontSize: 8, cursor: "pointer", minHeight: 20 }}>+</button>
                    </div>
                  </div>
                )}
                {ms.tasks.length === 0 && (
                  <div style={{ padding: "0 8px 6px", paddingLeft: 30, display: "flex", gap: 3 }}>
                    <input value={newTaskInputs[ms.id] || ""} onChange={(e) => setNewTaskInputs({ ...newTaskInputs, [ms.id]: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && handleAddTask(ms.id)} placeholder="Add first task..."
                      style={{ flex: 1, background: theme.card, border: `1px solid ${theme.inputBorder}`, borderRadius: 3, padding: "2px 5px", color: theme.text, fontSize: 9, outline: "none", minHeight: 20 }} />
                    <button onClick={() => handleAddTask(ms.id)} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 3, padding: "2px 5px", fontSize: 8, cursor: "pointer", minHeight: 20 }}>+</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Quick Expense Add ───
function QuickExpenseAdd({ dealId, onAdd, isMobile }: { dealId: string; onAdd: (expense: Omit<Expense, "id" | "dealId" | "createdAt">) => void; isMobile: boolean }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ category: "materials" as ExpenseCategory, description: "", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", paymentMethod: "eft" as PaymentMethod, isProjected: false });

  const handleSubmit = () => {
    if (!data.description || data.amount <= 0) return;
    onAdd(data);
    setData({ category: "materials", description: "", amount: 0, date: new Date().toISOString().split("T")[0], vendor: "", paymentMethod: "eft", isProjected: false });
    setOpen(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)} style={{
        background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8,
        padding: "10px 16px", fontSize: 11, color: theme.accent, cursor: "pointer", width: "100%",
        fontWeight: 600, textAlign: "left",
      }}>{open ? "Cancel" : "+ Log Expense"}</button>
      {open && (
        <div style={{ background: theme.card, border: `1px solid ${theme.accent}30`, borderRadius: "0 0 8px 8px", borderTop: "none", padding: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 8 }}>
            <select value={data.category} onChange={(e) => setData({ ...data, category: e.target.value as ExpenseCategory })} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, minHeight: 32 }}>
              {Object.entries(EXPENSE_CATEGORIES).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
            </select>
            <input value={data.description} onChange={(e) => setData({ ...data, description: e.target.value })} placeholder="Description" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
            <input type="number" value={data.amount || ""} onChange={(e) => setData({ ...data, amount: Number(e.target.value) })} placeholder="Amount (R)" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", fontFamily: "'JetBrains Mono', monospace", minHeight: 32 }} />
            <input value={data.vendor} onChange={(e) => setData({ ...data, vendor: e.target.value })} placeholder="Vendor" style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
            <input type="date" value={data.date} onChange={(e) => setData({ ...data, date: e.target.value })} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "6px 8px", color: theme.text, fontSize: 11, outline: "none", minHeight: 32 }} />
            <button onClick={handleSubmit} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer", minHeight: 32 }}>Save Expense</button>
          </div>
        </div>
      )}
    </div>
  );
}
