"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { theme, fmt, styles } from "../../components/theme";
import useDeals from "../../hooks/api/useApiDeals";
import useTools from "../../hooks/api/useApiTools";
import { TOOL_CATEGORY_DEFAULTS } from "../../types/tool";
import type { Deal, DealContact, Expense, Milestone } from "../../types/deal";

interface LinkedExpense {
  expense: Expense;
  dealId: string;
  dealName: string;
  milestone?: Milestone;
}

interface MilestoneAssignment {
  milestone: Milestone;
  dealId: string;
  dealName: string;
  dealAddress: string;
}

interface ContractorProject {
  dealId: string;
  dealName: string;
  dealAddress: string;
  dealStage: string;
  daysWorked: number;
  totalPaid: number;
  contactId: string;
  workDescription?: string;
  startDate?: string;
  endDate?: string;
  milestones: MilestoneAssignment[];
  expenses: LinkedExpense[];
}

interface ContractorProfile {
  name: string;
  company?: string;
  profession?: string;
  phone?: string;
  email?: string;
  notes?: string;
  dailyRate?: number;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  accountType?: string;
  projects: ContractorProject[];
  totalDaysWorked: number;
  totalEarned: number;
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: theme.textDim }}>Loading...</div>}>
      <ContractorsPageInner />
    </Suspense>
  );
}

function ContractorsPageInner() {
  const { deals, loaded } = useDeals();
  const { tools, checkouts, incidents } = useTools();
  const searchParams = useSearchParams();
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-select contractor from URL query param (e.g. /contractors?name=Thabo%20Mokoena)
  useEffect(() => {
    const name = searchParams.get("name");
    if (name && loaded) setSelectedContractor(name);
  }, [searchParams, loaded]);

  // Aggregate contractors across all deals
  const contractors = useMemo(() => {
    const map: Record<string, ContractorProfile> = {};

    for (const deal of deals) {
      const contacts = (deal.contacts || []).filter((c) => c.role === "contractor");
      for (const c of contacts) {
        const key = c.name.toLowerCase().trim();
        if (!map[key]) {
          map[key] = {
            name: c.name,
            company: c.company,
            profession: c.profession,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
            dailyRate: c.dailyRate,
            bankName: c.bankName,
            accountNumber: c.accountNumber,
            branchCode: c.branchCode,
            accountType: c.accountType,
            projects: [],
            totalDaysWorked: 0,
            totalEarned: 0,
          };
        }

        // Merge latest details (prefer most recent deal's data)
        const p = map[key];
        if (c.phone) p.phone = c.phone;
        if (c.email) p.email = c.email;
        if (c.company) p.company = c.company;
        if (c.profession) p.profession = c.profession;
        if (c.dailyRate) p.dailyRate = c.dailyRate;
        if (c.bankName) p.bankName = c.bankName;
        if (c.accountNumber) p.accountNumber = c.accountNumber;
        if (c.branchCode) p.branchCode = c.branchCode;
        if (c.accountType) p.accountType = c.accountType;
        if (c.notes && !p.notes?.includes(c.notes)) p.notes = c.notes;

        const daysWorked = c.daysWorked || 0;
        const totalPaid = daysWorked * (c.dailyRate || 0);

        // Find all expenses linked to this contractor (by contractorId or vendor match)
        const contractorExpenses: LinkedExpense[] = (deal.expenses || [])
          .filter((e) => !e.isProjected && (
            e.contractorId === c.id ||
            (e.category === "labour" && e.vendor && e.vendor.toLowerCase().includes(key.split(" ")[0].toLowerCase()))
          ))
          .map((e) => ({
            expense: e,
            dealId: deal.id,
            dealName: deal.name,
            milestone: e.milestoneId ? (deal.milestones || []).find((m) => m.id === e.milestoneId) : undefined,
          }));

        const expenseTotal = contractorExpenses.reduce((sum, le) => sum + le.expense.amount, 0);
        const paid = expenseTotal > 0 ? expenseTotal : totalPaid;

        // Find milestones assigned to this contractor
        const assignedMilestones: MilestoneAssignment[] = (deal.milestones || [])
          .filter((m) => m.assignedContractorId === c.id)
          .map((m) => ({ milestone: m, dealId: deal.id, dealName: deal.name, dealAddress: deal.address }));

        // Determine date range from expenses/milestones
        const allDates = [
          ...contractorExpenses.map((le) => le.expense.date),
          ...assignedMilestones.filter((a) => a.milestone.completedDate).map((a) => a.milestone.completedDate!),
        ].filter(Boolean).sort();

        p.projects.push({
          dealId: deal.id,
          dealName: deal.name,
          dealAddress: deal.address,
          dealStage: deal.stage,
          daysWorked,
          totalPaid: paid,
          contactId: c.id,
          workDescription: c.workDescription,
          startDate: allDates[0],
          endDate: allDates.length > 1 ? allDates[allDates.length - 1] : (deal.stage === "renovating" ? undefined : allDates[0]),
          milestones: assignedMilestones,
          expenses: contractorExpenses,
        });

        p.totalDaysWorked += daysWorked;
        p.totalEarned += paid;
      }
    }

    return Object.values(map).sort((a, b) => b.totalEarned - a.totalEarned);
  }, [deals]);

  // Active contractors on renovating deals
  const activeContractors = useMemo(() => {
    const result: { contractor: ContractorProfile; project: ContractorProject; currentMilestone?: Milestone; taskProgress: number; taskTotal: number; schedule: string; }[] = [];

    for (const c of contractors) {
      for (const p of c.projects) {
        if (p.dealStage !== "renovating") continue;

        const deal = deals.find((d) => d.id === p.dealId);
        if (!deal) continue;

        // Find the current milestone (first in_progress, or first pending)
        const milestones = [...(deal.milestones || [])].sort((a, b) => a.order - b.order);
        const currentMs = milestones.find((m) => m.status === "in_progress") || milestones.find((m) => m.status === "pending");

        // Task progress across all milestones
        const allTasks = milestones.flatMap((m) => m.tasks);
        const taskTotal = allTasks.length;
        const taskDone = allTasks.filter((t) => t.completed).length;
        const taskProgress = taskTotal > 0 ? taskDone / taskTotal : 0;

        // Schedule status
        let schedule = "on track";
        if (currentMs) {
          const dueDate = new Date(currentMs.dueDate);
          const now = new Date();
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          if (milestones.every((m) => m.status === "completed")) schedule = "complete";
          else if (daysUntilDue < 0) schedule = "overdue";
          else if (daysUntilDue <= 3) schedule = "due soon";
        }

        result.push({ contractor: c, project: p, currentMilestone: currentMs, taskProgress, taskTotal, schedule });
      }
    }

    return result;
  }, [contractors, deals]);

  const filtered = useMemo(() => {
    if (!searchTerm) return contractors;
    const q = searchTerm.toLowerCase();
    return contractors.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.profession || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q)
    );
  }, [contractors, searchTerm]);

  const selected = selectedContractor ? contractors.find((c) => c.name === selectedContractor) : null;

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // ─── Detail View ───
  if (selected) {
    return (
      <div style={{ padding: 28, maxWidth: 900 }}>
        <button onClick={() => setSelectedContractor(null)}
          style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
          &larr; All Contractors
        </button>

        {/* Profile Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{selected.name}</h1>
            {selected.company && <div style={{ fontSize: 13, color: theme.textDim }}>{selected.company}</div>}
            {selected.profession && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${theme.accent}15`, color: theme.accent, marginTop: 4, display: "inline-block" }}>{selected.profession}</span>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Total Earned</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.totalEarned)}</div>
          </div>
        </div>

        {/* Contact & Banking Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {/* Contact Details */}
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Contact Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {selected.phone && <Row label="Phone" value={selected.phone} />}
              {selected.email && <Row label="Email" value={selected.email} />}
              {selected.dailyRate && <Row label="Day Rate" value={fmt(selected.dailyRate)} />}
              {selected.notes && <Row label="Notes" value={selected.notes} />}
            </div>
          </div>

          {/* Banking Details */}
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Banking Details</h3>
            {selected.bankName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <Row label="Bank" value={selected.bankName} />
                {selected.accountNumber && <Row label="Account" value={selected.accountNumber} mono />}
                {selected.branchCode && <Row label="Branch Code" value={selected.branchCode} mono />}
                {selected.accountType && <Row label="Type" value={selected.accountType.charAt(0).toUpperCase() + selected.accountType.slice(1)} />}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.textDim, padding: "12px 0" }}>No banking details recorded</div>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <KPI label="Projects" value={String(selected.projects.length)} />
          <KPI label="Total Days" value={String(selected.totalDaysWorked)} />
          <KPI label="Day Rate" value={selected.dailyRate ? fmt(selected.dailyRate) : "—"} />
          <KPI label="Active Now" value={String(selected.projects.filter((p) => p.dealStage === "renovating").length)} color={theme.orange} />
        </div>

        {/* Project History — enhanced with milestones, rooms, dates, detailed job info */}
        <div style={{ ...styles.card, overflow: "hidden", padding: 0, marginBottom: 24 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
            <h3 style={styles.sectionHeading}>Project History</h3>
          </div>
          {selected.projects.map((p) => {
            const stageColor = p.dealStage === "renovating" ? theme.orange : p.dealStage === "sold" ? theme.green : theme.accent;
            const dateRange = p.startDate
              ? `${new Date(p.startDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}${p.endDate ? ` — ${new Date(p.endDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}` : " — ongoing"}`
              : null;
            return (
              <div key={p.dealId} style={{ padding: "14px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
                {/* Top row: property info + stats */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{p.dealName}</span>
                      <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${stageColor}15`, color: stageColor }}>{p.dealStage}</span>
                    </div>
                    <div style={{ fontSize: 10, color: theme.textDim }}>{p.dealAddress}</div>
                    {dateRange && <div style={{ fontSize: 9, color: theme.accent, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{dateRange}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 16, alignItems: "center", flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Days</div>
                      <div style={{ fontSize: 14, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{p.daysWorked}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5 }}>Paid</div>
                      <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.green }}>{fmt(p.totalPaid)}</div>
                    </div>
                    <a href={`/projects/${p.dealId}`} style={{ fontSize: 10, color: theme.accent, fontWeight: 600, textDecoration: "none", whiteSpace: "nowrap" }}>View &rarr;</a>
                  </div>
                </div>

                {/* Work description */}
                {p.workDescription && (
                  <div style={{ background: theme.input, borderRadius: 6, padding: "8px 12px", borderLeft: `3px solid ${theme.accent}40`, marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Work Performed</div>
                    <div style={{ fontSize: 12, color: theme.text, lineHeight: 1.5 }}>{p.workDescription}</div>
                  </div>
                )}

                {/* Milestones assigned to this contractor on this project */}
                {p.milestones.length > 0 && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>Milestones Assigned</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {p.milestones.map((ma) => {
                        const ms = ma.milestone;
                        const msColor = ms.status === "completed" ? theme.green : ms.status === "in_progress" ? theme.accent : theme.textDim;
                        const inspColor = ms.inspectionStatus === "passed" ? theme.green : ms.inspectionStatus === "failed" ? theme.red : ms.inspectionStatus === "conditional" ? theme.orange : theme.textDim;
                        const tasksDone = ms.tasks.filter((t) => t.completed).length;
                        return (
                          <div key={ms.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: theme.input, borderRadius: 3, borderLeft: `2px solid ${msColor}` }}>
                            <span style={{ fontSize: 10, fontWeight: 600, color: theme.text, flex: 1 }}>{ms.title}</span>
                            {ms.tasks.length > 0 && <span style={{ fontSize: 8, color: theme.textDim }}>{tasksDone}/{ms.tasks.length} tasks</span>}
                            <span style={{ fontSize: 8, fontWeight: 600, color: msColor, textTransform: "uppercase" }}>{ms.status.replace("_", " ")}</span>
                            {ms.inspectionStatus && ms.inspectionStatus !== "not_inspected" && (
                              <span style={{ fontSize: 7, padding: "0 4px", borderRadius: 2, background: `${inspColor}15`, color: inspColor, fontWeight: 600 }}>
                                {ms.inspectionStatus === "passed" ? "✓ Inspected" : ms.inspectionStatus === "failed" ? "✗ Failed" : "⚠ Conditional"}
                              </span>
                            )}
                            <span style={{ fontSize: 8, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                              due {new Date(ms.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                              {ms.completedDate && ` · done ${new Date(ms.completedDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Payments & Sign-off Timeline */}
        {selected.projects.some((p) => p.expenses.length > 0) && (
          <div style={{ ...styles.card, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
              <h3 style={styles.sectionHeading}>Payments &amp; Sign-off Timeline</h3>
            </div>
            {selected.projects.filter((p) => p.expenses.length > 0).map((p) => {
              const projectedTotal = (() => {
                const deal = deals.find((d) => d.id === p.dealId);
                if (!deal) return 0;
                return (deal.expenses || [])
                  .filter((e) => e.isProjected && (e.contractorId === p.contactId || (e.category === "labour" && e.vendor && e.vendor.toLowerCase().includes(selected.name.toLowerCase().split(" ")[0]))))
                  .reduce((s, e) => s + e.amount, 0);
              })();
              const outstanding = projectedTotal;
              return (
                <div key={p.dealId} style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{p.dealName}</span>
                    <span style={{ fontSize: 9, color: theme.textDim }}>{p.dealAddress}</span>
                  </div>
                  {/* Summary: paid vs projected vs outstanding */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <MiniKPI label="Paid" value={fmt(p.totalPaid)} color={theme.green} />
                    {projectedTotal > 0 && <MiniKPI label="Projected" value={fmt(projectedTotal)} color={theme.orange} />}
                    {outstanding > 0 && <MiniKPI label="Outstanding" value={fmt(outstanding)} color={theme.red} />}
                  </div>
                  {/* Each expense */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {p.expenses.sort((a, b) => new Date(a.expense.date).getTime() - new Date(b.expense.date).getTime()).map((le) => {
                      const signOff = le.expense.signOff;
                      const signColor = signOff ? ({ pending: theme.orange, approved: theme.green, rejected: theme.red }[signOff.status]) : theme.textDim;
                      const paidBeforeVerified = le.milestone && le.milestone.status !== "completed";
                      return (
                        <div key={le.expense.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 8px", background: theme.input, borderRadius: 3, borderLeft: `2px solid ${signColor}` }}>
                          <span style={{ fontSize: 9, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", flexShrink: 0, width: 55 }}>
                            {new Date(le.expense.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}
                          </span>
                          <span style={{ fontSize: 10, color: theme.text, flex: 1 }}>{le.expense.description}</span>
                          {le.milestone && <span style={{ fontSize: 8, padding: "0 4px", borderRadius: 2, background: `${theme.accent}10`, color: theme.accent }}>⬡ {le.milestone.title}</span>}
                          {signOff && (
                            <span style={{ fontSize: 7, fontWeight: 600, padding: "0 4px", borderRadius: 2, background: `${signColor}15`, color: signColor, textTransform: "uppercase" }}>
                              {signOff.status}
                            </span>
                          )}
                          {paidBeforeVerified && <span style={{ fontSize: 7, fontWeight: 600, color: theme.red }}>⚠</span>}
                          <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text, flexShrink: 0 }}>
                            {fmt(le.expense.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tools Section — from Tool Locker */}
        {(() => {
          const contractorKey = selected.name.toLowerCase();
          const currentTools = tools.filter((t) => t.status === "checked_out" && t.currentHolderName?.toLowerCase() === contractorKey);
          const contractorIncidents = incidents.filter((i) => i.contractorName.toLowerCase() === contractorKey);
          if (currentTools.length === 0 && contractorIncidents.length === 0) return null;
          return (
            <div style={{ ...styles.card, overflow: "hidden", padding: 0, marginTop: 24 }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
                <h3 style={styles.sectionHeading}>Tools</h3>
              </div>
              {currentTools.length > 0 && (
                <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: theme.orange, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Currently Checked Out</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {currentTools.map((t) => {
                      const catInfo = TOOL_CATEGORY_DEFAULTS[t.category];
                      return (
                        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px", background: theme.input, borderRadius: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: theme.text, flex: 1 }}>{t.name}</span>
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: `${theme.accent}12`, color: theme.accent }}>{catInfo.label}</span>
                          {t.currentDealName && <span style={{ fontSize: 9, color: theme.textDim }}>@ {t.currentDealName}</span>}
                          <span style={{ fontSize: 10, color: theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(t.purchaseCost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {contractorIncidents.length > 0 && (
                <div style={{ padding: "10px 16px" }}>
                  <div style={{ fontSize: 9, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>Tool Incidents</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {contractorIncidents.map((inc) => {
                      const tool = tools.find((t) => t.id === inc.toolId);
                      const recoveryColors: Record<string, string> = { pending: theme.orange, charged_back: theme.green, written_off: theme.red, resolved: theme.green };
                      return (
                        <div key={inc.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", background: theme.input, borderRadius: 4, borderLeft: `2px solid ${theme.red}` }}>
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${theme.red}15`, color: theme.red, textTransform: "uppercase" }}>{inc.type}</span>
                          <span style={{ fontSize: 11, color: theme.text, flex: 1 }}>{tool?.name || "Unknown tool"}</span>
                          <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${recoveryColors[inc.recoveryStatus]}15`, color: recoveryColors[inc.recoveryStatus], textTransform: "uppercase" }}>{inc.recoveryStatus.replace("_", " ")}</span>
                          {inc.estimatedCost != null && <span style={{ fontSize: 10, color: theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(inc.estimatedCost)}</span>}
                          <span style={{ fontSize: 9, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{new Date(inc.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // ─── List View ───
  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>Contractors</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>All contractors across your portfolio</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Total Contractors" value={String(contractors.length)} />
        <KPI label="Active (on site)" value={String(contractors.filter((c) => c.projects.some((p) => p.dealStage === "renovating" && p.daysWorked > 0)).length)} color={theme.orange} />
        <KPI label="Total Paid" value={fmt(contractors.reduce((s, c) => s + c.totalEarned, 0))} color={theme.green} />
      </div>

      {/* Active Contractors Dashboard */}
      {activeContractors.length > 0 && (
        <div style={{ background: theme.card, border: `1px solid ${theme.orange}30`, borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.orange, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 10px" }}>Active Contractors</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {activeContractors.map((ac, i) => {
              const schedColor = { "on track": theme.green, "due soon": theme.orange, overdue: theme.red, complete: theme.green }[ac.schedule] || theme.textDim;
              const progressPct = Math.round(ac.taskProgress * 100);
              return (
                <div key={`${ac.contractor.name}_${ac.project.dealId}_${i}`}
                  onClick={() => setSelectedContractor(ac.contractor.name)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: theme.input, borderRadius: 6, cursor: "pointer", borderLeft: `3px solid ${schedColor}` }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                    {ac.contractor.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{ac.contractor.name}</div>
                    <div style={{ fontSize: 10, color: theme.textDim }}>{ac.project.dealName} · {ac.project.dealAddress}</div>
                  </div>
                  {ac.currentMilestone && (
                    <div style={{ fontSize: 9, color: theme.accent, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ⬡ {ac.currentMilestone.title}
                    </div>
                  )}
                  {/* Task progress bar */}
                  <div style={{ width: 60, flexShrink: 0 }}>
                    <div style={{ height: 5, background: `${theme.inputBorder}`, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progressPct}%`, background: theme.accent, borderRadius: 3 }} />
                    </div>
                    <div style={{ fontSize: 8, color: theme.textDim, textAlign: "center", marginTop: 1 }}>{progressPct}%</div>
                  </div>
                  <span style={{ fontSize: 8, fontWeight: 600, padding: "2px 6px", borderRadius: 3, background: `${schedColor}15`, color: schedColor, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                    {ac.schedule}
                  </span>
                  <div style={{ textAlign: "right", flexShrink: 0, minWidth: 50 }}>
                    <div style={{ fontSize: 9, color: theme.textDim }}>{ac.project.daysWorked}d</div>
                    <div style={{ fontSize: 10, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.green }}>{fmt(ac.project.totalPaid)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search contractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minWidth: 280, minHeight: 36 }} />
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: theme.textDim, fontSize: 14 }}>
          {searchTerm ? "No contractors match your search." : "No contractors found. Add contractors to your property contacts."}
        </div>
      )}

      {/* Contractor Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map((c) => {
          const isActive = c.projects.some((p) => p.dealStage === "renovating");
          return (
            <div key={c.name} onClick={() => setSelectedContractor(c.name)}
              style={{ background: theme.card, border: `1px solid ${isActive ? `${theme.orange}40` : theme.cardBorder}`, borderRadius: 8, padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.name}</div>
                  {c.company && <div style={{ fontSize: 11, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</div>}
                </div>
                {isActive && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${theme.orange}20`, color: theme.orange }}>ACTIVE</span>}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {c.profession && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, fontWeight: 500, background: `${theme.accent}12`, color: theme.accent }}>{c.profession}</span>}
                {c.dailyRate && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, fontWeight: 500, background: theme.input, color: theme.textDim }}>{fmt(c.dailyRate)}/day</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.textDim, paddingTop: 10, borderTop: `1px solid ${theme.cardBorder}` }}>
                <span>{c.projects.length} project{c.projects.length !== 1 ? "s" : ""}</span>
                <span>{c.totalDaysWorked} days worked</span>
                <span style={{ color: theme.green, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.totalEarned)}</span>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: theme.accent, fontWeight: 600 }}>View Profile &rarr;</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ───
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: theme.textDim, fontSize: 12 }}>{label}</span>
      <span style={{ color: theme.text, fontWeight: 500, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function KPI({ label, value, color = theme.text }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 130, border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function MiniKPI({ label, value, color = theme.text }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 4, padding: "4px 8px", border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 8, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1 }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}
