"use client";
import { useMemo } from "react";
import { theme, fmt } from "../../../components/theme";
import { groupBySupplier } from "../lib/groupBySupplier";
import type { ShoppingListItem } from "../../../types/deal";

interface EstimatedItem {
  key: string;
  label: string;
  qty: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  category: string;
}

export function PrintableShoppingList({ propertyName, estimatedItems, customItems, shoppingList, onClose }: {
  propertyName: string;
  estimatedItems: EstimatedItem[];
  customItems: ShoppingListItem[];
  shoppingList: ShoppingListItem[];
  onClose: () => void;
}) {
  const groups = useMemo(
    () => groupBySupplier(estimatedItems, customItems, shoppingList),
    [estimatedItems, customItems, shoppingList]
  );

  const grandTotal = groups.reduce((s, g) => s + g.subtotal, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      {/* Screen overlay */}
      <div className="print-overlay" style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          background: theme.bg, borderRadius: 12, padding: 24, maxWidth: 700, width: "90%",
          maxHeight: "85vh", overflow: "auto", border: `1px solid ${theme.cardBorder}`,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: theme.text, margin: 0 }}>Shopping List Preview</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handlePrint} style={{
                background: theme.accent, color: "#fff", border: "none", borderRadius: 6,
                padding: "8px 20px", fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}>Print</button>
              <button onClick={onClose} style={{
                background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`,
                borderRadius: 6, padding: "8px 16px", fontSize: 12, cursor: "pointer",
              }}>Close</button>
            </div>
          </div>

          {/* Print content preview (also printed) */}
          <div className="printable-content">
            <div style={{ textAlign: "center", marginBottom: 20, paddingBottom: 12, borderBottom: `2px solid ${theme.cardBorder}` }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.text }}>Shopping List</div>
              <div style={{ fontSize: 13, color: theme.textDim, marginTop: 4 }}>Property: {propertyName}</div>
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>Generated {new Date().toLocaleDateString("en-ZA")}</div>
            </div>

            {groups.map((group) => (
              <div key={group.supplierKey} style={{ marginBottom: 20 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700, color: theme.text, padding: "8px 0",
                  borderBottom: `2px solid ${theme.accent}`, marginBottom: 8,
                  textTransform: "uppercase", letterSpacing: 1,
                }}>
                  {group.supplierLabel}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                      <th style={{ textAlign: "left", padding: "6px 4px", color: theme.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600 }}>Item</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: theme.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, width: 60 }}>Qty</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: theme.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, width: 60 }}>Unit</th>
                      <th style={{ textAlign: "right", padding: "6px 4px", color: theme.textDim, fontSize: 10, textTransform: "uppercase", letterSpacing: 0.5, fontWeight: 600, width: 100 }}>Est. Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items.map((item, idx) => (
                      <tr key={idx} style={{ borderBottom: `1px solid ${theme.cardBorder}20` }}>
                        <td style={{ padding: "6px 4px", color: theme.text }}>{item.label}</td>
                        <td style={{ padding: "6px 4px", color: theme.text, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{item.qty}</td>
                        <td style={{ padding: "6px 4px", color: theme.textDim, textAlign: "right" }}>{item.unit}{item.qty !== 1 ? "s" : ""}</td>
                        <td style={{ padding: "6px 4px", color: theme.text, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(item.estPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
                      <td colSpan={3} style={{ padding: "8px 4px", fontWeight: 700, color: theme.text, textAlign: "right" }}>SUBTOTAL:</td>
                      <td style={{ padding: "8px 4px", fontWeight: 700, color: theme.text, textAlign: "right", fontFamily: "'JetBrains Mono', monospace" }}>{fmt(group.subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ))}

            <div style={{ borderTop: `3px solid ${theme.accent}`, paddingTop: 12, marginTop: 8, display: "flex", justifyContent: "flex-end", gap: 20, fontSize: 16, fontWeight: 700 }}>
              <span style={{ color: theme.textDim }}>GRAND TOTAL:</span>
              <span style={{ color: theme.text, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print styles injected via style tag */}
      <style>{`
        @media print {
          body > *:not(.print-overlay) { display: none !important; }
          .print-overlay { position: static !important; background: none !important; }
          .print-overlay > div { max-width: 100% !important; max-height: none !important; border: none !important; padding: 0 !important; background: white !important; }
          .print-overlay > div > div:first-child { display: none !important; }
          .printable-content * { color: #000 !important; border-color: #ccc !important; }
        }
      `}</style>
    </>
  );
}
