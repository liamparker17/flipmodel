"use client";
import { useState, useMemo, Suspense } from "react";
import { theme, fmt, styles } from "../../components/theme";
import useTools from "../../hooks/api/useApiTools";
import useDeals from "../../hooks/api/useApiDeals";
import useIsMobile from "../../hooks/useIsMobile";
import useOrgContext from "../../hooks/useOrgContext";
import type { Tool, ToolCheckout, ToolMaintenanceEntry, ToolIncident, ToolCategoryKey, ToolStatus, ToolCondition } from "../../types/tool";
import EmptyState from "../../components/EmptyState";
import { TOOL_CATEGORY_DEFAULTS } from "../../types/tool";

export default function ToolsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: theme.textDim }}>Loading...</div>}>
      <ToolsPageInner />
    </Suspense>
  );
}

// ─── Constants ───
const STATUS_COLORS: Record<ToolStatus, string> = {
  available: theme.green,
  checked_out: theme.orange,
  maintenance: theme.accent,
  retired: theme.textDim,
  lost: theme.red,
  damaged: theme.red,
};

const CONDITION_COLORS: Record<ToolCondition, string> = {
  new: "#22C55E",
  excellent: "#22C55E",
  good: "#3B82F6",
  fair: "#F59E0B",
  poor: "#EF4444",
  broken: "#991B1B",
};

function ToolsPageInner() {
  const { role, hasPermission } = useOrgContext();
  const canWrite = hasPermission("tools:write");
  const canCheckout = hasPermission("tools:checkout");
  const isFieldWorker = role === "field_worker";
  const isSiteSupervisor = role === "site_supervisor";
  const {
    tools, checkouts, maintenance, incidents, loaded,
    addTool, updateTool, deleteTool,
    checkoutTool, returnTool,
    addMaintenanceEntry, reportIncident, resolveIncident,
  } = useTools();
  const { deals } = useDeals();
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ToolStatus | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<ToolCategoryKey | "all">("all");
  const isMobile = useIsMobile();
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  // Modal states
  const [showAddTool, setShowAddTool] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [showIncident, setShowIncident] = useState(false);
  const [showResolve, setShowResolve] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  // ─── Filtered Tools ───
  const filtered = useMemo(() => {
    let result = tools;
    if (statusFilter !== "all") result = result.filter((t) => t.status === statusFilter);
    if (categoryFilter !== "all") result = result.filter((t) => t.category === categoryFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.brand || "").toLowerCase().includes(q) ||
        (t.serialNumber || "").toLowerCase().includes(q) ||
        (t.model || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [tools, statusFilter, categoryFilter, searchTerm]);

  // ─── KPIs ───
  const kpis = useMemo(() => {
    const total = tools.length;
    const checkedOut = tools.filter((t) => t.status === "checked_out").length;
    const available = tools.filter((t) => t.status === "available").length;
    const inMaintenance = tools.filter((t) => t.status === "maintenance").length;
    const lostDamaged = tools.filter((t) => t.status === "lost" || t.status === "damaged").length;
    const totalValue = tools.reduce((s, t) => s + t.purchaseCost, 0);
    const needsMaintenance = tools.filter((t) => {
      const ageMonths = monthsSince(t.purchaseDate);
      const lifeRatio = (t.expectedLifespanMonths - ageMonths) / t.expectedLifespanMonths;
      return lifeRatio < 0.2 && t.status !== "retired" && t.status !== "lost";
    }).length;
    return { total, checkedOut, available, inMaintenance, needsMaintenance, lostDamaged, totalValue };
  }, [tools]);

  // ─── All contractors from deals for dropdowns ───
  const allContractors = useMemo(() => {
    const map: Record<string, { name: string; id?: string }> = {};
    for (const deal of deals) {
      for (const c of (deal.contacts || [])) {
        if (c.role === "contractor") {
          map[c.name.toLowerCase()] = { name: c.name, id: c.id };
        }
      }
    }
    return Object.values(map);
  }, [deals]);

  const selectedTool = selectedToolId ? tools.find((t) => t.id === selectedToolId) : null;

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // ─── Detail View ───
  if (selectedTool) {
    const toolCheckouts = checkouts.filter((c) => c.toolId === selectedTool.id).sort((a, b) => new Date(b.checkedOutAt).getTime() - new Date(a.checkedOutAt).getTime());
    const toolMaintenance = maintenance.filter((m) => m.toolId === selectedTool.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const toolIncidents = incidents.filter((i) => i.toolId === selectedTool.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const ageMonths = monthsSince(selectedTool.purchaseDate);
    const lifeRemaining = Math.max(0, selectedTool.expectedLifespanMonths - ageMonths);
    const lifeRatio = Math.max(0, Math.min(1, lifeRemaining / selectedTool.expectedLifespanMonths));
    const lifeColor = lifeRatio < 0.2 ? theme.red : lifeRatio < 0.5 ? theme.orange : theme.green;
    const depreciatedValue = Math.max(0, selectedTool.purchaseCost * lifeRatio);
    const activeCheckout = toolCheckouts.find((c) => !c.returnedAt);
    const categoryInfo = TOOL_CATEGORY_DEFAULTS[selectedTool.category];

    return (
      <div style={{ padding: isMobile ? 16 : 28, maxWidth: 900 }}>
        <button onClick={() => { setSelectedToolId(null); setShowCheckout(false); setShowReturn(false); setShowMaintenance(false); setShowIncident(false); }}
          style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
          &larr; All Tools
        </button>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24, flexWrap: "wrap" }}>
          <div style={{ width: 56, height: 56, borderRadius: 8, background: `${STATUS_COLORS[selectedTool.status]}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            🔧
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{selectedTool.name}</h1>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${theme.accent}15`, color: theme.accent }}>{categoryInfo.label}</span>
              <StatusBadge status={selectedTool.status} />
              <ConditionBadge condition={selectedTool.condition} />
            </div>
            {selectedTool.brand && <div style={{ fontSize: 12, color: theme.textDim, marginTop: 4 }}>{selectedTool.brand} {selectedTool.model || ""}</div>}
            {selectedTool.serialNumber && <div style={{ fontSize: 11, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>S/N: {selectedTool.serialNumber}</div>}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {canCheckout && selectedTool.status === "available" && (
              <ActionBtn label="Check Out" color={theme.orange} onClick={() => setShowCheckout(true)} />
            )}
            {canCheckout && selectedTool.status === "checked_out" && activeCheckout && (
              <ActionBtn label="Return" color={theme.green} onClick={() => setShowReturn(true)} />
            )}
            {!isFieldWorker && <ActionBtn label="+ Maintenance" color={theme.accent} onClick={() => setShowMaintenance(true)} />}
            {!isFieldWorker && <ActionBtn label="Report Incident" color={theme.red} onClick={() => setShowIncident(true)} />}
          </div>
        </div>

        {/* Lifecycle Panel */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile || (isFieldWorker || isSiteSupervisor) ? "1fr" : "1fr 1fr", gap: 14, marginBottom: 24 }}>
          <div style={styles.card}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Lifecycle</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              <DetailRow label="Purchase Date" value={formatDate(selectedTool.purchaseDate)} />
              <DetailRow label="Age" value={`${ageMonths} months`} />
              <DetailRow label="Expected Lifespan" value={`${selectedTool.expectedLifespanMonths} months`} />
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: theme.textDim, fontSize: 12 }}>Life Remaining</span>
                  <span style={{ color: lifeColor, fontSize: 12, fontWeight: 600 }}>{lifeRemaining} months</span>
                </div>
                <div style={{ height: 6, background: theme.inputBorder, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${lifeRatio * 100}%`, background: lifeColor, borderRadius: 3, transition: "width 0.3s" }} />
                </div>
              </div>
            </div>
          </div>
          {!isFieldWorker && !isSiteSupervisor && (
            <div style={styles.card}>
              <h3 style={{ ...styles.sectionHeading, margin: "0 0 12px" }}>Financials</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <DetailRow label="Purchase Cost" value={fmt(selectedTool.purchaseCost)} mono />
                <DetailRow label="Current Value (est.)" value={fmt(depreciatedValue)} mono />
                <DetailRow label="Replacement Cost" value={fmt(selectedTool.replacementCost)} mono />
                <DetailRow label="Maintenance Spent" value={fmt(toolMaintenance.reduce((s, m) => s + (m.cost || 0), 0))} mono />
              </div>
            </div>
          )}
        </div>

        {/* Current Holder */}
        {selectedTool.status === "checked_out" && activeCheckout && (
          <div style={{ background: theme.card, border: `1px solid ${theme.orange}30`, borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.orange, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Currently Checked Out</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <DetailRow label="Contractor" value={activeCheckout.contractorName} />
              {activeCheckout.dealName && <DetailRow label="Property" value={activeCheckout.dealName} />}
              <DetailRow label="Checked Out" value={formatDate(activeCheckout.checkedOutAt)} />
              {activeCheckout.expectedReturnDate && <DetailRow label="Expected Return" value={formatDate(activeCheckout.expectedReturnDate)} />}
              <DetailRow label="Condition Out" value={activeCheckout.conditionOut} />
              {activeCheckout.notes && <DetailRow label="Notes" value={activeCheckout.notes} />}
            </div>
          </div>
        )}

        {selectedTool.notes && (
          <div style={{ ...styles.card, marginBottom: 24 }}>
            <h3 style={{ ...styles.sectionHeading, margin: "0 0 8px" }}>Notes</h3>
            <p style={{ fontSize: 12, color: theme.text, margin: 0, lineHeight: 1.6 }}>{selectedTool.notes}</p>
          </div>
        )}

        {/* Checkout History */}
        <div style={{ ...styles.card, overflow: "hidden", padding: 0, marginBottom: 24 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
            <h3 style={styles.sectionHeading}>Checkout History</h3>
          </div>
          {toolCheckouts.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: theme.textDim }}>No checkout history</div>
          ) : (
            toolCheckouts.map((co) => {
              const isActive = !co.returnedAt;
              const duration = co.returnedAt
                ? Math.ceil((new Date(co.returnedAt).getTime() - new Date(co.checkedOutAt).getTime()) / (1000 * 60 * 60 * 24))
                : Math.ceil((Date.now() - new Date(co.checkedOutAt).getTime()) / (1000 * 60 * 60 * 24));
              return (
                <div key={co.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}`, borderLeft: isActive ? `3px solid ${theme.orange}` : "3px solid transparent" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 150 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{co.contractorName}</span>
                      {co.dealName && <span style={{ fontSize: 11, color: theme.textDim, marginLeft: 8 }}>{co.dealName}</span>}
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 10 }}>
                      <span style={{ color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(co.checkedOutAt)}</span>
                      <span style={{ color: theme.textDim }}>→</span>
                      <span style={{ color: isActive ? theme.orange : theme.textDim, fontFamily: "'JetBrains Mono', monospace", fontWeight: isActive ? 600 : 400 }}>
                        {co.returnedAt ? formatDate(co.returnedAt) : "OUT"}
                      </span>
                      <span style={{ color: theme.textDim }}>{duration}d</span>
                      <span style={{ fontSize: 9 }}>
                        <ConditionBadge condition={co.conditionOut} />
                        {co.conditionIn && <><span style={{ color: theme.textDim, margin: "0 2px" }}>→</span><ConditionBadge condition={co.conditionIn} /></>}
                      </span>
                    </div>
                  </div>
                  {co.notes && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>{co.notes}</div>}
                </div>
              );
            })
          )}
        </div>

        {/* Maintenance Log */}
        <div style={{ ...styles.card, overflow: "hidden", padding: 0, marginBottom: 24 }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={styles.sectionHeading}>Maintenance Log</h3>
            {!isFieldWorker && <button onClick={() => setShowMaintenance(true)} style={{ background: "transparent", border: `1px solid ${theme.accent}30`, borderRadius: 4, padding: "3px 10px", color: theme.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>+ Add Entry</button>}
          </div>
          {toolMaintenance.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: theme.textDim }}>No maintenance records</div>
          ) : (
            toolMaintenance.map((m) => {
              const typeColors: Record<string, string> = { service: theme.accent, repair: theme.orange, blade_change: theme.green, calibration: "#8B5CF6", other: theme.textDim };
              return (
                <div key={m.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}`, borderLeft: `3px solid ${typeColors[m.type] || theme.textDim}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${typeColors[m.type] || theme.textDim}15`, color: typeColors[m.type] || theme.textDim, textTransform: "uppercase" }}>{m.type.replace("_", " ")}</span>
                        <span style={{ fontSize: 12, color: theme.text }}>{m.description}</span>
                      </div>
                      {m.performedBy && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>By: {m.performedBy}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
                      {m.cost != null && m.cost > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: theme.orange, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(m.cost)}</span>}
                      <span style={{ fontSize: 10, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(m.date)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Incidents */}
        {toolIncidents.length > 0 && (
          <div style={{ background: theme.card, border: `1px solid ${theme.red}20`, borderRadius: 8, overflow: "hidden", marginBottom: 24 }}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.red, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Incidents</h3>
            </div>
            {toolIncidents.map((inc) => {
              const recoveryColors: Record<string, string> = { pending: theme.orange, charged_back: theme.green, written_off: theme.red, resolved: theme.green };
              return (
                <div key={inc.id} style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${theme.red}15`, color: theme.red, textTransform: "uppercase" }}>{inc.type}</span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{inc.contractorName}</span>
                        {inc.dealName && <span style={{ fontSize: 10, color: theme.textDim }}>@ {inc.dealName}</span>}
                      </div>
                      <p style={{ fontSize: 12, color: theme.text, margin: 0, lineHeight: 1.5 }}>{inc.description}</p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span style={{ fontSize: 10, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{formatDate(inc.date)}</span>
                      {inc.estimatedCost != null && <span style={{ fontSize: 11, fontWeight: 600, color: theme.red, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(inc.estimatedCost)}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 3, fontWeight: 600, background: `${recoveryColors[inc.recoveryStatus]}15`, color: recoveryColors[inc.recoveryStatus], textTransform: "uppercase" }}>{inc.recoveryStatus.replace("_", " ")}</span>
                    {inc.recoveryAmount != null && inc.recoveryAmount > 0 && <span style={{ fontSize: 10, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>Recovered: {fmt(inc.recoveryAmount)}</span>}
                    {!isFieldWorker && inc.recoveryStatus === "pending" && (
                      <button onClick={() => setShowResolve(inc.id)} style={{ background: "transparent", border: `1px solid ${theme.accent}30`, borderRadius: 4, padding: "2px 8px", color: theme.accent, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>Resolve</button>
                    )}
                  </div>
                  {inc.notes && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4 }}>{inc.notes}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Modals ─── */}
        {showCheckout && (
          <CheckoutForm
            tool={selectedTool}
            contractors={allContractors}
            deals={deals}
            onSubmit={(d) => { checkoutTool(selectedTool.id, d); setShowCheckout(false); showToast("Tool checked out"); }}
            onClose={() => setShowCheckout(false)}
          />
        )}
        {showReturn && activeCheckout && (
          <ReturnForm
            checkout={activeCheckout}
            onSubmit={(d) => { returnTool(activeCheckout.id, d); setShowReturn(false); showToast("Tool returned"); }}
            onClose={() => setShowReturn(false)}
          />
        )}
        {showMaintenance && (
          <MaintenanceForm
            onSubmit={(d) => { addMaintenanceEntry(selectedTool.id, d); setShowMaintenance(false); showToast("Maintenance entry added"); }}
            onClose={() => setShowMaintenance(false)}
          />
        )}
        {showIncident && (
          <IncidentForm
            tool={selectedTool}
            contractors={allContractors}
            deals={deals}
            onSubmit={(d) => { reportIncident(selectedTool.id, d); setShowIncident(false); showToast("Incident reported"); }}
            onClose={() => setShowIncident(false)}
          />
        )}
        {showResolve && (
          <ResolveForm
            onSubmit={(d) => { resolveIncident(showResolve, d); setShowResolve(null); showToast("Incident resolved"); }}
            onClose={() => setShowResolve(null)}
          />
        )}

        <Toast message={toastMsg} visible={toastVisible} />
      </div>
    );
  }

  // ─── List View ───
  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingLeft: isMobile ? 48 : 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>
            {isFieldWorker ? "My Tools" : isSiteSupervisor ? "Site Tools" : "Tool Locker"}
          </h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Equipment tracking &amp; lifecycle management</p>
        </div>
        {canWrite && <ActionBtn label="+ Add Tool" color={theme.accent} onClick={() => setShowAddTool(true)} />}
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Total Tools" value={String(kpis.total)} />
        <KPI label="Checked Out" value={String(kpis.checkedOut)} color={theme.orange} />
        <KPI label="Available" value={String(kpis.available)} color={theme.green} />
        {!isFieldWorker && <KPI label="Maintenance" value={String(kpis.inMaintenance)} color={theme.accent} />}
        {!isFieldWorker && <KPI label="Lost / Damaged" value={String(kpis.lostDamaged)} color={theme.red} />}
        {!isFieldWorker && !isSiteSupervisor && <KPI label="Total Value" value={fmt(kpis.totalValue)} />}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        <input type="text" placeholder="Search name, brand, serial..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minWidth: 220, minHeight: 36 }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as ToolStatus | "all")}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minHeight: 36 }}>
          <option value="all">All Status</option>
          <option value="available">Available</option>
          <option value="checked_out">Checked Out</option>
          <option value="maintenance">Maintenance</option>
          <option value="retired">Retired</option>
          <option value="lost">Lost</option>
          <option value="damaged">Damaged</option>
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as ToolCategoryKey | "all")}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minHeight: 36 }}>
          <option value="all">All Categories</option>
          {(Object.keys(TOOL_CATEGORY_DEFAULTS) as ToolCategoryKey[]).map((k) => (
            <option key={k} value={k}>{TOOL_CATEGORY_DEFAULTS[k].label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 && (
        searchTerm || statusFilter !== "all" || categoryFilter !== "all" ? (
          <div style={{ padding: 60, textAlign: "center", color: theme.textDim, fontSize: 14 }}>
            No tools match your filters.
          </div>
        ) : (
          <EmptyState
            heading="No tools tracked"
            description="Track equipment checkout, returns, and maintenance across your sites."
            actionLabel={canWrite ? "Add Tool" : undefined}
            onAction={canWrite ? () => setShowAddTool(true) : undefined}
          />
        )
      )}

      {/* Tool Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${isMobile ? "280px" : "340px"}, 1fr))`, gap: 14 }}>
        {filtered.map((tool) => {
          const ageMonths = monthsSince(tool.purchaseDate);
          const lifeRatio = Math.max(0, Math.min(1, (tool.expectedLifespanMonths - ageMonths) / tool.expectedLifespanMonths));
          const lifeColor = lifeRatio < 0.2 ? theme.red : lifeRatio < 0.5 ? theme.orange : theme.green;
          const categoryInfo = TOOL_CATEGORY_DEFAULTS[tool.category];

          return (
            <div key={tool.id} onClick={() => setSelectedToolId(tool.id)}
              style={{ background: theme.card, border: `1px solid ${tool.status === "checked_out" ? `${theme.orange}40` : tool.status === "lost" || tool.status === "damaged" ? `${theme.red}40` : theme.cardBorder}`, borderRadius: 8, padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 4 }}>{tool.name}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 500, background: `${theme.accent}12`, color: theme.accent }}>{categoryInfo.label}</span>
                    <StatusBadge status={tool.status} />
                    <ConditionBadge condition={tool.condition} />
                  </div>
                </div>
              </div>

              {tool.brand && <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 6 }}>{tool.brand} {tool.model || ""}</div>}

              {/* Life Remaining Bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 9, color: theme.textDim }}>Life remaining</span>
                  <span style={{ fontSize: 9, color: lifeColor, fontWeight: 600 }}>{Math.round(lifeRatio * 100)}%</span>
                </div>
                <div style={{ height: 4, background: theme.inputBorder, borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${lifeRatio * 100}%`, background: lifeColor, borderRadius: 2 }} />
                </div>
              </div>

              {/* Current Holder */}
              {tool.status === "checked_out" && tool.currentHolderName && (
                <div style={{ fontSize: 10, color: theme.orange, marginBottom: 6, padding: "4px 8px", background: `${theme.orange}10`, borderRadius: 4 }}>
                  📋 {tool.currentHolderName}{tool.currentDealName ? ` @ ${tool.currentDealName}` : ""}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textDim, paddingTop: 8, borderTop: `1px solid ${theme.cardBorder}` }}>
                {!isFieldWorker && !isSiteSupervisor ? <span>{fmt(tool.purchaseCost)}</span> : <span />}
                <span>{ageMonths}mo old</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Tool Modal */}
      {canWrite && showAddTool && (
        <AddToolForm
          onSubmit={(t) => { addTool(t); setShowAddTool(false); showToast("Tool added"); }}
          onClose={() => setShowAddTool(false)}
        />
      )}

      <Toast message={toastMsg} visible={toastVisible} />
    </div>
  );
}

// ═══════════════════════════════════════
// ─── Form Components ───
// ═══════════════════════════════════════

function AddToolForm({ onSubmit, onClose }: { onSubmit: (t: Omit<Tool, "id" | "createdAt" | "updatedAt">) => void; onClose: () => void }) {
  const [category, setCategory] = useState<ToolCategoryKey>("drill");
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [purchaseCost, setPurchaseCost] = useState(TOOL_CATEGORY_DEFAULTS.drill.defaultReplacementCost);
  const [lifespan, setLifespan] = useState(TOOL_CATEGORY_DEFAULTS.drill.defaultLifespanMonths);
  const [replacementCost, setReplacementCost] = useState(TOOL_CATEGORY_DEFAULTS.drill.defaultReplacementCost);
  const [condition, setCondition] = useState<ToolCondition>("new");
  const [notes, setNotes] = useState("");

  const handleCategoryChange = (cat: ToolCategoryKey) => {
    setCategory(cat);
    const defaults = TOOL_CATEGORY_DEFAULTS[cat];
    setLifespan(defaults.defaultLifespanMonths);
    setReplacementCost(defaults.defaultReplacementCost);
    if (!purchaseCost || purchaseCost === TOOL_CATEGORY_DEFAULTS[category].defaultReplacementCost) {
      setPurchaseCost(defaults.defaultReplacementCost);
    }
  };

  return (
    <Modal title="Add New Tool" onClose={onClose}>
      <FormField label="Category">
        <select value={category} onChange={(e) => handleCategoryChange(e.target.value as ToolCategoryKey)} style={inputStyle}>
          {(Object.keys(TOOL_CATEGORY_DEFAULTS) as ToolCategoryKey[]).map((k) => (
            <option key={k} value={k}>{TOOL_CATEGORY_DEFAULTS[k].label}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Tool Name">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`e.g. ${TOOL_CATEGORY_DEFAULTS[category].label} #1`} style={inputStyle} />
      </FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label="Brand"><input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Makita" style={inputStyle} /></FormField>
        <FormField label="Model"><input value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. GA5030" style={inputStyle} /></FormField>
      </div>
      <FormField label="Serial Number"><input value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} style={inputStyle} /></FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label="Purchase Date"><input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Purchase Cost (R)"><input type="number" value={purchaseCost} onChange={(e) => setPurchaseCost(Number(e.target.value))} style={inputStyle} /></FormField>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label="Expected Lifespan (months)"><input type="number" value={lifespan} onChange={(e) => setLifespan(Number(e.target.value))} style={inputStyle} /></FormField>
        <FormField label="Replacement Cost (R)"><input type="number" value={replacementCost} onChange={(e) => setReplacementCost(Number(e.target.value))} style={inputStyle} /></FormField>
      </div>
      <FormField label="Condition">
        <select value={condition} onChange={(e) => setCondition(e.target.value as ToolCondition)} style={inputStyle}>
          {(["new", "excellent", "good", "fair", "poor"] as ToolCondition[]).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button disabled={!name.trim()} onClick={() => onSubmit({
          name: name.trim() || `${TOOL_CATEGORY_DEFAULTS[category].label} #${Date.now() % 1000}`,
          category, brand: brand || undefined, model: model || undefined,
          serialNumber: serialNumber || undefined, purchaseDate, purchaseCost,
          expectedLifespanMonths: lifespan, replacementCost,
          status: "available", condition, notes: notes || undefined,
        })} style={submitBtnStyle}>Add Tool</button>
      </div>
    </Modal>
  );
}

function CheckoutForm({ tool, contractors, deals, onSubmit, onClose }: {
  tool: Tool;
  contractors: { name: string; id?: string }[];
  deals: { id: string; name: string; address: string }[];
  onSubmit: (d: { contractorName: string; contractorId?: string; dealId?: string; dealName?: string; propertyAddress?: string; expectedReturnDate?: string; notes?: string }) => void;
  onClose: () => void;
}) {
  const [contractorName, setContractorName] = useState(contractors[0]?.name || "");
  const [dealId, setDealId] = useState("");
  const [expectedReturn, setExpectedReturn] = useState("");
  const [notes, setNotes] = useState("");

  const selectedDeal = deals.find((d) => d.id === dealId);
  const selectedContractor = contractors.find((c) => c.name === contractorName);

  return (
    <Modal title={`Check Out: ${tool.name}`} onClose={onClose}>
      <FormField label="Contractor">
        <select value={contractorName} onChange={(e) => setContractorName(e.target.value)} style={inputStyle}>
          {contractors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
          <option value="_custom">— Other (type below) —</option>
        </select>
        {contractorName === "_custom" && <input value="" onChange={(e) => setContractorName(e.target.value)} placeholder="Contractor name" style={{ ...inputStyle, marginTop: 6 }} />}
      </FormField>
      <FormField label="Property">
        <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={inputStyle}>
          <option value="">— None —</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.address}</option>)}
        </select>
      </FormField>
      <FormField label="Expected Return Date"><input type="date" value={expectedReturn} onChange={(e) => setExpectedReturn(e.target.value)} style={inputStyle} /></FormField>
      <FormField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button disabled={!contractorName || contractorName === "_custom"} onClick={() => onSubmit({
          contractorName, contractorId: selectedContractor?.id,
          dealId: dealId || undefined, dealName: selectedDeal?.name,
          propertyAddress: selectedDeal?.address,
          expectedReturnDate: expectedReturn || undefined, notes: notes || undefined,
        })} style={submitBtnStyle}>Check Out</button>
      </div>
    </Modal>
  );
}

function ReturnForm({ checkout, onSubmit, onClose }: {
  checkout: ToolCheckout;
  onSubmit: (d: { conditionIn: ToolCondition; notes?: string }) => void;
  onClose: () => void;
}) {
  const [conditionIn, setConditionIn] = useState<ToolCondition>(checkout.conditionOut);
  const [notes, setNotes] = useState("");

  return (
    <Modal title="Return Tool" onClose={onClose}>
      <p style={{ fontSize: 12, color: theme.textDim, margin: "0 0 12px" }}>Returning from {checkout.contractorName}{checkout.dealName ? ` @ ${checkout.dealName}` : ""}</p>
      <FormField label="Condition on Return">
        <select value={conditionIn} onChange={(e) => setConditionIn(e.target.value as ToolCondition)} style={inputStyle}>
          {(["new", "excellent", "good", "fair", "poor", "broken"] as ToolCondition[]).map((c) => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
      </FormField>
      <FormField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="Any notes on condition..." /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button onClick={() => onSubmit({ conditionIn, notes: notes || undefined })} style={submitBtnStyle}>Return Tool</button>
      </div>
    </Modal>
  );
}

function MaintenanceForm({ onSubmit, onClose }: {
  onSubmit: (d: Omit<ToolMaintenanceEntry, "id" | "toolId">) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ToolMaintenanceEntry["type"]>("service");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [cost, setCost] = useState<number>(0);
  const [performedBy, setPerformedBy] = useState("");

  return (
    <Modal title="Add Maintenance Entry" onClose={onClose}>
      <FormField label="Type">
        <select value={type} onChange={(e) => setType(e.target.value as ToolMaintenanceEntry["type"])} style={inputStyle}>
          <option value="service">Service</option>
          <option value="repair">Repair</option>
          <option value="blade_change">Blade Change</option>
          <option value="calibration">Calibration</option>
          <option value="other">Other</option>
        </select>
      </FormField>
      <FormField label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} placeholder="What was done..." /></FormField>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <FormField label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></FormField>
        <FormField label="Cost (R)"><input type="number" value={cost} onChange={(e) => setCost(Number(e.target.value))} style={inputStyle} /></FormField>
      </div>
      <FormField label="Performed By"><input value={performedBy} onChange={(e) => setPerformedBy(e.target.value)} placeholder='e.g. "self" or service centre' style={inputStyle} /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button disabled={!description.trim()} onClick={() => onSubmit({
          type, description, date, cost: cost || undefined, performedBy: performedBy || undefined,
        })} style={submitBtnStyle}>Add Entry</button>
      </div>
    </Modal>
  );
}

function IncidentForm({ tool, contractors, deals, onSubmit, onClose }: {
  tool: Tool;
  contractors: { name: string; id?: string }[];
  deals: { id: string; name: string; address: string }[];
  onSubmit: (d: Omit<ToolIncident, "id" | "toolId">) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<ToolIncident["type"]>("damaged");
  const [contractorName, setContractorName] = useState(tool.currentHolderName || contractors[0]?.name || "");
  const [dealId, setDealId] = useState(tool.currentDealId || "");
  const [description, setDescription] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(tool.replacementCost);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const selectedDeal = deals.find((d) => d.id === dealId);
  const selectedContractor = contractors.find((c) => c.name === contractorName);

  return (
    <Modal title="Report Incident" onClose={onClose}>
      <FormField label="Incident Type">
        <select value={type} onChange={(e) => setType(e.target.value as ToolIncident["type"])} style={inputStyle}>
          <option value="lost">Lost</option>
          <option value="stolen">Stolen</option>
          <option value="damaged">Damaged</option>
          <option value="broken">Broken</option>
        </select>
      </FormField>
      <FormField label="Contractor Responsible">
        <select value={contractorName} onChange={(e) => setContractorName(e.target.value)} style={inputStyle}>
          {contractors.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </FormField>
      <FormField label="Property">
        <select value={dealId} onChange={(e) => setDealId(e.target.value)} style={inputStyle}>
          <option value="">— None —</option>
          {deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </FormField>
      <FormField label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle} /></FormField>
      <FormField label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} placeholder="What happened..." /></FormField>
      <FormField label="Estimated Cost (R)"><input type="number" value={estimatedCost} onChange={(e) => setEstimatedCost(Number(e.target.value))} style={inputStyle} /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button disabled={!description.trim() || !contractorName} onClick={() => onSubmit({
          type, contractorName, contractorId: selectedContractor?.id,
          dealId: dealId || undefined, dealName: selectedDeal?.name,
          date, description, estimatedCost: estimatedCost || undefined,
          recoveryStatus: "pending",
        })} style={submitBtnStyle}>Report Incident</button>
      </div>
    </Modal>
  );
}

function ResolveForm({ onSubmit, onClose }: {
  onSubmit: (d: { recoveryStatus: ToolIncident["recoveryStatus"]; recoveryAmount?: number; notes?: string }) => void;
  onClose: () => void;
}) {
  const [status, setStatus] = useState<ToolIncident["recoveryStatus"]>("resolved");
  const [amount, setAmount] = useState(0);
  const [notes, setNotes] = useState("");

  return (
    <Modal title="Resolve Incident" onClose={onClose}>
      <FormField label="Resolution">
        <select value={status} onChange={(e) => setStatus(e.target.value as ToolIncident["recoveryStatus"])} style={inputStyle}>
          <option value="charged_back">Charged Back to Contractor</option>
          <option value="written_off">Written Off</option>
          <option value="resolved">Resolved</option>
        </select>
      </FormField>
      {(status === "charged_back" || status === "resolved") && (
        <FormField label="Recovery Amount (R)"><input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} style={inputStyle} /></FormField>
      )}
      <FormField label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: "vertical" }} /></FormField>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
        <button onClick={() => onSubmit({ recoveryStatus: status, recoveryAmount: amount || undefined, notes: notes || undefined })} style={submitBtnStyle}>Resolve</button>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════
// ─── Shared Components ───
// ═══════════════════════════════════════

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
      <div style={{ position: "relative", background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, padding: 24, width: "100%", maxWidth: 480, maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: theme.textDim, fontSize: 18, cursor: "pointer" }}>&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3, fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: ToolStatus }) {
  return (
    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${STATUS_COLORS[status]}15`, color: STATUS_COLORS[status], textTransform: "uppercase" }}>
      {status.replace("_", " ")}
    </span>
  );
}

function ConditionBadge({ condition }: { condition: ToolCondition }) {
  return (
    <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: `${CONDITION_COLORS[condition]}15`, color: CONDITION_COLORS[condition] }}>
      {condition}
    </span>
  );
}

function KPI({ label, value, color = theme.text }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 120, border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: theme.textDim, fontSize: 12 }}>{label}</span>
      <span style={{ color: theme.text, fontWeight: 500, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit", fontSize: 12 }}>{value}</span>
    </div>
  );
}

function ActionBtn({ label, color, onClick }: { label: string; color: string; onClick: () => void }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onClick(); }} style={{
      background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 6,
      padding: "6px 14px", color, fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 32, whiteSpace: "nowrap",
    }}>{label}</button>
  );
}

function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  return (
    <div style={{
      position: "fixed", bottom: 24, right: 24, background: theme.card, border: `1px solid ${theme.cardBorder}`,
      borderRadius: 8, padding: "10px 20px", color: theme.text, fontSize: 13, zIndex: 500,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>{message}</div>
  );
}

// ─── Utilities ───
function monthsSince(dateStr: string): number {
  const d = new Date(dateStr);
  const now = new Date();
  return (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" });
}

const inputStyle: React.CSSProperties = {
  width: "100%", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
  padding: "7px 10px", color: theme.text, fontSize: 13, outline: "none", minHeight: 34,
  boxSizing: "border-box",
};

const cancelBtnStyle: React.CSSProperties = {
  background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 6,
  padding: "8px 16px", color: theme.textDim, fontSize: 12, cursor: "pointer", minHeight: 36,
};

const submitBtnStyle: React.CSSProperties = {
  background: theme.accent, border: "none", borderRadius: 6,
  padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", minHeight: 36,
};
