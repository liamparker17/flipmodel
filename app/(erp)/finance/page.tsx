"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt, pct } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import { DEAL_STAGES, getStageColor, getStageLabel, computeDealMetrics, getPortfolioMetrics, getCashFlowProjection, getExpensesByCategory, getMonthlyExpenses, EXPENSE_CATEGORIES } from "../../utils/dealHelpers";

export default function FinancePage() {
  const router = useRouter();
  const { deals, loaded } = useDeals();
  const [isMobile, setIsMobile] = useState(false);
  const [view, setView] = useState<"overview" | "expenses" | "cashflow" | "pnl">("overview");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  const metrics = getPortfolioMetrics(deals);
  const cashFlow = getCashFlowProjection(deals);
  const allExpenses = deals.flatMap((d) => (d.expenses || []).map((e) => ({ ...e, dealName: d.name })));
  const categoryBreakdown = getExpensesByCategory(allExpenses);
  const monthlyBreakdown = getMonthlyExpenses(allExpenses);

  // P&L by deal
  const dealPnL = deals.map((deal) => {
    const m = computeDealMetrics(deal);
    const actualExpenses = (deal.expenses || []).filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
    const projectedExpenses = (deal.expenses || []).filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);
    const actualSale = deal.actualSalePrice || 0;
    const expectedSale = deal.expectedSalePrice;
    const commission = (actualSale || expectedSale) * ((deal.data?.resale?.agentCommission || 5) / 100);
    const actualProfit = deal.stage === "sold" ? (actualSale - deal.purchasePrice - actualExpenses - commission) : 0;

    return {
      id: deal.id, name: deal.name, stage: deal.stage,
      purchasePrice: deal.purchasePrice,
      expectedSale, actualSale,
      renoEstimate: deal.data?.quickRenoEstimate || 0,
      actualExpenses, projectedExpenses, commission,
      estimatedProfit: m.estimatedProfit,
      actualProfit,
      roi: m.estimatedRoi,
    };
  });

  const totalPurchase = dealPnL.reduce((s, d) => s + d.purchasePrice, 0);
  const totalExpectedSale = dealPnL.reduce((s, d) => s + d.expectedSale, 0);
  const totalActualExpenses = allExpenses.filter((e) => !e.isProjected).reduce((s, e) => s + e.amount, 0);
  const totalProjectedExpenses = allExpenses.filter((e) => e.isProjected).reduce((s, e) => s + e.amount, 0);
  const totalEstProfit = dealPnL.reduce((s, d) => s + d.estimatedProfit, 0);
  const cfMax = Math.max(...cashFlow.map((m) => Math.max(m.inflow, m.outflow, 1)));
  const now = new Date();

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingLeft: isMobile ? 48 : 0, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, margin: 0, color: theme.text }}>Finance</h1>
          <p style={{ fontSize: 12, color: theme.textDim, margin: "2px 0 0" }}>Portfolio financials and expense tracking</p>
        </div>
        {/* View tabs */}
        <div style={{ display: "flex", gap: 4 }}>
          {([{ key: "overview", label: "Overview" }, { key: "expenses", label: "Expenses" }, { key: "cashflow", label: "Cash Flow" }, { key: "pnl", label: "P&L" }] as const).map((v) => (
            <button key={v.key} onClick={() => setView(v.key)} style={{
              background: view === v.key ? theme.accent : "transparent", color: view === v.key ? "#000" : theme.textDim,
              border: view === v.key ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 6,
              padding: "5px 12px", fontSize: 11, fontWeight: view === v.key ? 600 : 400, cursor: "pointer", minHeight: 30,
            }}>{v.label}</button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <KPI label="Capital Deployed" value={fmt(totalPurchase)} color={theme.text} />
        <KPI label="Expected Returns" value={fmt(totalExpectedSale)} color={theme.accent} />
        <KPI label="Actual Spend" value={fmt(totalActualExpenses)} color={theme.orange} />
        <KPI label="Projected Spend" value={fmt(totalProjectedExpenses)} color={theme.textDim} />
        <KPI label="Expected Profit" value={fmt(totalEstProfit)} color={totalEstProfit >= 0 ? theme.green : theme.red} />
      </div>

      {view === "overview" && (
        <>
          {/* Deal Summary Table */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Deal P&L Summary</h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    {["Deal", "Stage", "Purchase", "Reno Est.", "Actual Spend", "Expected Sale", "Est. Profit", "ROI"].map((h) => (
                      <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dealPnL.map((row) => {
                    const sc = getStageColor(row.stage);
                    return (
                      <tr key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                        <td style={{ padding: "8px 10px", fontSize: 12, fontWeight: 600, color: theme.text }}>{row.name}</td>
                        <td style={{ padding: "8px 10px" }}>
                          <span style={{ fontSize: 8, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 6px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                        </td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.purchasePrice)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(row.renoEstimate)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(row.actualExpenses)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{row.actualSale ? fmt(row.actualSale) : fmt(row.expectedSale)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: row.estimatedProfit >= 0 ? theme.green : theme.red }}>{fmt(row.estimatedProfit)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: row.roi >= 0.15 ? theme.green : row.roi >= 0 ? theme.orange : theme.red }}>{pct(row.roi)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: theme.text }}>Portfolio Total</td>
                    <td />
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalPurchase)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(dealPnL.reduce((s, d) => s + d.renoEstimate, 0))}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalActualExpenses)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(totalExpectedSale)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: totalEstProfit >= 0 ? theme.green : theme.red }}>{fmt(totalEstProfit)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: metrics.avgRoi >= 0.15 ? theme.green : theme.orange }}>{pct(metrics.avgRoi)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {view === "expenses" && (
        <>
          {/* Category Breakdown */}
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>By Category</h3>
              {categoryBreakdown.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.textDim }}>No expenses recorded.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {categoryBreakdown.map((cat) => (
                    <div key={cat.category} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                      <div style={{ width: 110, fontSize: 11, color: theme.text }}>{cat.label}</div>
                      <div style={{ flex: 1, height: 8, background: theme.input, borderRadius: 4, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(cat.actual / (totalActualExpenses || 1)) * 100}%`, background: cat.color, borderRadius: 4, opacity: 0.7 }} />
                      </div>
                      <div style={{ width: 90, fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text, textAlign: "right" }}>{fmt(cat.actual)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Monthly Trend</h3>
              {monthlyBreakdown.length === 0 ? (
                <div style={{ fontSize: 12, color: theme.textDim }}>No expenses recorded.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {monthlyBreakdown.map((m) => {
                    const total = m.actual + m.projected;
                    const maxMonthly = Math.max(...monthlyBreakdown.map((mb) => mb.actual + mb.projected), 1);
                    return (
                      <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 50, fontSize: 10, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "short", year: "2-digit" })}
                        </div>
                        <div style={{ flex: 1, height: 8, background: theme.input, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                          <div style={{ height: "100%", width: `${(m.actual / maxMonthly) * 100}%`, background: theme.orange, borderRadius: "4px 0 0 4px" }} />
                          {m.projected > 0 && <div style={{ height: "100%", width: `${(m.projected / maxMonthly) * 100}%`, background: `${theme.orange}40` }} />}
                        </div>
                        <div style={{ width: 80, fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: theme.text, textAlign: "right" }}>{fmt(total)}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* All Expenses Table */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>All Expenses ({allExpenses.length})</h3>
            </div>
            {allExpenses.length === 0 ? (
              <div style={{ padding: 30, textAlign: "center", color: theme.textDim, fontSize: 12 }}>No expenses recorded across any deals.</div>
            ) : (
              <div style={{ overflowX: "auto", maxHeight: 500 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}`, position: "sticky", top: 0, background: theme.card }}>
                      {["Date", "Deal", "Category", "Description", "Vendor", "Amount", "Type"].map((h) => (
                        <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...allExpenses].sort((a, b) => b.date.localeCompare(a.date)).map((expense) => {
                      const catInfo = EXPENSE_CATEGORIES[expense.category as keyof typeof EXPENSE_CATEGORIES];
                      return (
                        <tr key={expense.id} style={{ borderBottom: `1px solid ${theme.cardBorder}`, opacity: expense.isProjected ? 0.6 : 1 }}>
                          <td style={{ padding: "6px 10px", fontSize: 10, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", whiteSpace: "nowrap" }}>{expense.date}</td>
                          <td style={{ padding: "6px 10px", fontSize: 11, color: theme.accent, cursor: "pointer" }} onClick={() => router.push(`/pipeline/${expense.dealId}`)}>{(expense as unknown as { dealName: string }).dealName}</td>
                          <td style={{ padding: "6px 10px" }}>
                            <span style={{ fontSize: 8, fontWeight: 600, color: catInfo?.color || theme.textDim, background: `${catInfo?.color || theme.textDim}15`, padding: "2px 5px", borderRadius: 3 }}>{catInfo?.label || expense.category}</span>
                          </td>
                          <td style={{ padding: "6px 10px", fontSize: 11, color: theme.text }}>{expense.description}</td>
                          <td style={{ padding: "6px 10px", fontSize: 10, color: theme.textDim }}>{expense.vendor || "—"}</td>
                          <td style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(expense.amount)}</td>
                          <td style={{ padding: "6px 10px", fontSize: 9, color: expense.isProjected ? theme.orange : theme.green }}>{expense.isProjected ? "Projected" : "Actual"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {view === "cashflow" && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Cash Flow Projection</h3>
            <div style={{ display: "flex", gap: 12 }}>
              <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.green, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Inflow (Sales)</span></span>
              <span style={{ fontSize: 9, display: "flex", alignItems: "center", gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: theme.red, display: "inline-block" }} /> <span style={{ color: theme.textDim }}>Outflow (Expenses)</span></span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cashFlow.map((m) => {
              const monthLabel = new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "long", year: "numeric" });
              const isCurrent = m.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
              return (
                <div key={m.month} style={{
                  display: "grid", gridTemplateColumns: "120px 1fr 100px 100px 100px", alignItems: "center", gap: 8,
                  padding: "8px 10px", background: isCurrent ? `${theme.accent}08` : "transparent", borderRadius: 6,
                  borderLeft: isCurrent ? `3px solid ${theme.accent}` : "3px solid transparent",
                }}>
                  <div style={{ fontSize: 11, color: isCurrent ? theme.accent : theme.text, fontWeight: isCurrent ? 700 : 400 }}>{monthLabel}</div>
                  <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
                    {m.inflow > 0 && <div style={{ height: 14, width: `${(m.inflow / cfMax) * 100}%`, background: theme.green, borderRadius: 3, opacity: 0.6, minWidth: 4 }} />}
                    {m.outflow > 0 && <div style={{ height: 14, width: `${(m.outflow / cfMax) * 100}%`, background: theme.red, borderRadius: 3, opacity: 0.6, minWidth: 4 }} />}
                  </div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.green, textAlign: "right" }}>{m.inflow > 0 ? fmt(m.inflow) : "—"}</div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.red, textAlign: "right" }}>{m.outflow > 0 ? fmt(m.outflow) : "—"}</div>
                  <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: m.net >= 0 ? theme.green : theme.red, textAlign: "right", fontWeight: 700 }}>{fmt(m.net)}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 100px 100px 100px", gap: 8, padding: "4px 10px", marginTop: 4, fontSize: 9, color: theme.textDim }}>
            <div />
            <div />
            <div style={{ textAlign: "right" }}>INFLOW</div>
            <div style={{ textAlign: "right" }}>OUTFLOW</div>
            <div style={{ textAlign: "right" }}>NET</div>
          </div>
        </div>
      )}

      {view === "pnl" && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Profit & Loss by Deal</h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                  {["Deal", "Stage", "Revenue", "Purchase", "Reno Est.", "Actual Costs", "Commission", "Net Profit", "ROI", "Status"].map((h) => (
                    <th key={h} style={{ padding: "7px 10px", textAlign: "left", fontSize: 8, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dealPnL.map((row) => {
                  const sc = getStageColor(row.stage);
                  const isSold = row.stage === "sold";
                  const revenue = isSold ? row.actualSale : row.expectedSale;
                  return (
                    <tr key={row.id} onClick={() => router.push(`/pipeline/${row.id}`)} style={{ borderBottom: `1px solid ${theme.cardBorder}`, cursor: "pointer" }}>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 600, color: theme.text }}>{row.name}</td>
                      <td style={{ padding: "7px 10px" }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: sc, background: `${sc}15`, padding: "2px 5px", borderRadius: 3, textTransform: "uppercase" }}>{getStageLabel(row.stage)}</span>
                      </td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.green }}>{fmt(revenue)}</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.red }}>({fmt(row.purchasePrice)})</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>({fmt(row.renoEstimate)})</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>({fmt(row.actualExpenses)})</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: theme.red }}>({fmt(row.commission)})</td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", color: (isSold ? row.actualProfit : row.estimatedProfit) >= 0 ? theme.green : theme.red }}>
                        {fmt(isSold ? row.actualProfit : row.estimatedProfit)}
                      </td>
                      <td style={{ padding: "7px 10px", fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: row.roi >= 0.15 ? theme.green : row.roi >= 0 ? theme.orange : theme.red }}>{pct(row.roi)}</td>
                      <td style={{ padding: "7px 10px", fontSize: 9, color: isSold ? theme.green : theme.textDim }}>{isSold ? "Realized" : "Projected"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KPI({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 14 }}>
      <div style={{ fontSize: 9, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 500, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </div>
  );
}
