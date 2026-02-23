"use client";
import { useRouter } from "next/navigation";
import { theme, fmt } from "../theme";
import { styles } from "../theme";
import { EXPENSE_CATEGORIES } from "../../utils/dealHelpers";

interface CategoryBreakdown {
  category: string;
  label: string;
  color: string;
  actual: number;
}

interface MonthlyBreakdown {
  month: string;
  actual: number;
  projected: number;
}

interface Expense {
  id: string;
  date: string;
  dealId?: string;
  dealName?: string;
  category: string;
  description: string;
  vendor?: string;
  amount: number;
  isProjected?: boolean;
}

interface ExpenseTableProps {
  allExpenses: Expense[];
  categoryBreakdown: CategoryBreakdown[];
  monthlyBreakdown: MonthlyBreakdown[];
  totalActualExpenses: number;
  isMobile: boolean;
}

export default function ExpenseTable({ allExpenses, categoryBreakdown, monthlyBreakdown, totalActualExpenses, isMobile }: ExpenseTableProps) {
  const router = useRouter();

  return (
    <>
      {/* Category Breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ ...styles.card as React.CSSProperties }}>
          <h3 style={{ ...styles.sectionHeading as React.CSSProperties, margin: "0 0 12px" }}>By Category</h3>
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
                  <div style={{ width: 90, fontSize: 11, fontWeight: 600, ...styles.mono as React.CSSProperties, color: theme.text, textAlign: "right" }}>{fmt(cat.actual)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ ...styles.card as React.CSSProperties }}>
          <h3 style={{ ...styles.sectionHeading as React.CSSProperties, margin: "0 0 12px" }}>Monthly Trend</h3>
          {monthlyBreakdown.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textDim }}>No expenses recorded.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {monthlyBreakdown.map((m) => {
                const total = m.actual + m.projected;
                const maxMonthly = Math.max(...monthlyBreakdown.map((mb) => mb.actual + mb.projected), 1);
                return (
                  <div key={m.month} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 50, fontSize: 10, color: theme.textDim, ...styles.mono as React.CSSProperties }}>
                      {new Date(m.month + "-01").toLocaleDateString("en-ZA", { month: "short", year: "2-digit" })}
                    </div>
                    <div style={{ flex: 1, height: 8, background: theme.input, borderRadius: 4, overflow: "hidden", display: "flex" }}>
                      <div style={{ height: "100%", width: `${(m.actual / maxMonthly) * 100}%`, background: theme.orange, borderRadius: "4px 0 0 4px" }} />
                      {m.projected > 0 && <div style={{ height: "100%", width: `${(m.projected / maxMonthly) * 100}%`, background: `${theme.orange}40` }} />}
                    </div>
                    <div style={{ width: 80, fontSize: 10, ...styles.mono as React.CSSProperties, color: theme.text, textAlign: "right" }}>{fmt(total)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* All Expenses Table */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${theme.cardBorder}`, ...styles.flexBetween as React.CSSProperties }}>
          <h3 style={{ ...styles.sectionHeading as React.CSSProperties }}>All Expenses ({allExpenses.length})</h3>
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
                      <td style={{ padding: "6px 10px", fontSize: 10, color: theme.textDim, ...styles.mono as React.CSSProperties, whiteSpace: "nowrap" }}>{expense.date}</td>
                      <td style={{ padding: "6px 10px", fontSize: 11, color: theme.accent, cursor: "pointer" }} onClick={() => router.push(`/pipeline/${expense.dealId}`)}>{expense.dealName}</td>
                      <td style={{ padding: "6px 10px" }}>
                        <span style={{ fontSize: 8, fontWeight: 600, color: catInfo?.color || theme.textDim, background: `${catInfo?.color || theme.textDim}15`, padding: "2px 5px", borderRadius: 3 }}>{catInfo?.label || expense.category}</span>
                      </td>
                      <td style={{ padding: "6px 10px", fontSize: 11, color: theme.text }}>{expense.description}</td>
                      <td style={{ padding: "6px 10px", fontSize: 10, color: theme.textDim }}>{expense.vendor || "\u2014"}</td>
                      <td style={{ padding: "6px 10px", fontSize: 11, fontWeight: 600, ...styles.mono as React.CSSProperties, color: theme.text }}>{fmt(expense.amount)}</td>
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
  );
}
