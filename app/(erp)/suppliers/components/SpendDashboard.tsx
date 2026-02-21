"use client";
import { useMemo } from "react";
import { theme, fmt, BarChart } from "../../../components/theme";
import { StatBox } from "./StatBox";
import type { Deal, ShoppingListItem } from "../../../types/deal";

interface EstimatedItem {
  key: string;
  label: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  category: string;
  categoryLabel: string;
}

export function SpendDashboard({ deal, flatItems, customItems }: {
  deal: Deal;
  flatItems: EstimatedItem[];
  customItems: ShoppingListItem[];
}) {
  const stats = useMemo(() => {
    let estimatedTotal = 0;
    let actualTotal = 0;
    let purchasedEstimate = 0;
    const categoryBudget: Record<string, { label: string; estimated: number; actual: number }> = {};
    const vendorTotals: Record<string, number> = {};

    for (const item of flatItems) {
      estimatedTotal += item.totalCost;
      if (!categoryBudget[item.category]) categoryBudget[item.category] = { label: item.categoryLabel, estimated: 0, actual: 0 };
      categoryBudget[item.category].estimated += item.totalCost;

      const entry = (deal.shoppingList || []).find((s) => s.materialKey === item.key && s.category === item.category);
      if (entry?.purchased) {
        const actual = entry.actualPrice ?? item.totalCost;
        actualTotal += actual;
        purchasedEstimate += item.totalCost;
        categoryBudget[item.category].actual += actual;
        if (entry.vendor) {
          vendorTotals[entry.vendor] = (vendorTotals[entry.vendor] || 0) + actual;
        }
      }
    }

    let customEstimated = 0;
    let customActual = 0;
    for (const ci of customItems) {
      const itemTotal = (ci.unitPrice || 0) * (ci.qty || 0);
      customEstimated += itemTotal;
      if (ci.purchased) {
        const actual = ci.actualPrice ?? itemTotal;
        customActual += actual;
        if (ci.vendor) {
          vendorTotals[ci.vendor] = (vendorTotals[ci.vendor] || 0) + actual;
        }
      }
    }

    const totalBudget = estimatedTotal + customEstimated;
    const totalSpent = actualTotal + customActual;
    const remaining = totalBudget - totalSpent;
    const variance = totalSpent - purchasedEstimate;
    const savingsAchieved = (purchasedEstimate + customEstimated) - totalSpent;

    // Category chart data
    const chartData = Object.entries(categoryBudget)
      .filter(([, d]) => d.estimated > 0)
      .map(([, d]) => ({
        label: d.label,
        values: [d.estimated, d.actual],
      }));

    // Vendor breakdown sorted
    const vendorBreakdown = Object.entries(vendorTotals)
      .sort(([, a], [, b]) => b - a);

    return { totalBudget, totalSpent, remaining, variance, savingsAchieved, chartData, vendorBreakdown };
  }, [deal, flatItems, customItems]);

  const hasPurchases = stats.totalSpent > 0;

  return (
    <div>
      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
        <StatBox label="Total Budget" value={fmt(stats.totalBudget)} />
        <StatBox label="Spent So Far" value={fmt(stats.totalSpent)} color={hasPurchases ? theme.accent : theme.text} />
        <StatBox label="Remaining" value={fmt(stats.remaining)} color={stats.remaining >= 0 ? theme.green : theme.red} />
        <StatBox
          label={stats.variance >= 0 ? "Over Budget" : "Under Budget"}
          value={fmt(Math.abs(stats.variance))}
          color={stats.variance > 0 ? theme.red : theme.green}
        />
      </div>

      {!hasPurchases && (
        <div style={{ padding: 60, textAlign: "center", color: theme.textDim }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>&#128200;</div>
          <div style={{ fontSize: 14, marginBottom: 4 }}>No purchases recorded yet</div>
          <div style={{ fontSize: 12 }}>Mark items as purchased with actual prices to see your spend breakdown</div>
        </div>
      )}

      {hasPurchases && (
        <>
          {/* Budget vs Actual Bar Chart */}
          {stats.chartData.length > 0 && (
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>Budget vs Actual by Category</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {stats.chartData.map((cat) => {
                  const maxVal = Math.max(cat.values[0], cat.values[1], 1);
                  return (
                    <div key={cat.label}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: theme.textDim, marginBottom: 4 }}>
                        <span style={{ fontWeight: 500 }}>{cat.label}</span>
                        <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          <span style={{ color: theme.textDim }}>Budget: {fmt(cat.values[0])}</span>
                          <span style={{ margin: "0 8px", color: theme.cardBorder }}>|</span>
                          <span style={{ color: cat.values[1] > cat.values[0] ? theme.red : theme.green }}>Actual: {fmt(cat.values[1])}</span>
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 2, height: 6 }}>
                        <div style={{ height: "100%", width: `${(cat.values[0] / maxVal) * 100}%`, background: `${theme.accent}40`, borderRadius: 3 }} />
                      </div>
                      <div style={{ display: "flex", gap: 2, height: 6, marginTop: 2 }}>
                        <div style={{ height: "100%", width: `${(cat.values[1] / maxVal) * 100}%`, background: cat.values[1] > cat.values[0] ? theme.red : theme.green, borderRadius: 3 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 20, marginTop: 12, fontSize: 10, color: theme.textDim }}>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: `${theme.accent}40`, marginRight: 4 }} />Budget</span>
                <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: theme.green, marginRight: 4 }} />Actual</span>
              </div>
            </div>
          )}

          {/* Supplier Breakdown */}
          {stats.vendorBreakdown.length > 0 && (
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 16px" }}>Supplier Breakdown</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {stats.vendorBreakdown.map(([vendor, total]) => {
                  const pct = stats.totalSpent > 0 ? (total / stats.totalSpent) * 100 : 0;
                  return (
                    <div key={vendor} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ fontSize: 13, color: theme.text, fontWeight: 500, minWidth: 120 }}>{vendor}</div>
                      <div style={{ flex: 1, height: 6, background: theme.inputBorder, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: theme.accent, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, fontFamily: "'JetBrains Mono', monospace", minWidth: 80, textAlign: "right" }}>{fmt(total)}</div>
                      <div style={{ fontSize: 10, color: theme.textDim, minWidth: 40, textAlign: "right" }}>{Math.round(pct)}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Savings Achieved */}
          {stats.savingsAchieved !== 0 && (
            <div style={{
              background: stats.savingsAchieved > 0 ? `${theme.green}08` : `${theme.red}08`,
              border: `1px solid ${stats.savingsAchieved > 0 ? theme.green : theme.red}25`,
              borderRadius: 8, padding: 20, textAlign: "center",
            }}>
              <div style={{ fontSize: 11, color: stats.savingsAchieved > 0 ? theme.green : theme.red, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 600, marginBottom: 4 }}>
                {stats.savingsAchieved > 0 ? "Savings Achieved" : "Over Budget"}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: stats.savingsAchieved > 0 ? theme.green : theme.red, fontFamily: "'JetBrains Mono', monospace" }}>
                {fmt(Math.abs(stats.savingsAchieved))}
              </div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>
                {stats.savingsAchieved > 0 ? "below estimated budget on purchased items" : "above estimated budget on purchased items"}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
