"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

const theme = {
  bg: "#0B0E13", card: "#12151C", cardBorder: "#1C2030", accent: "#3B82F6",
  text: "#E2E4E9", textDim: "#6B7280", green: "#22C55E",
};

const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);

interface LineItem { description: string; quantity: number; unitPrice: number; total: number; }
interface Invoice {
  id: string; invoiceNumber: string; status: string; issueDate: string;
  dueDate?: string; subtotal: number; tax: number; total: number;
  notes?: string; lineItems: LineItem[];
}

export default function InvoiceDetailPage() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetch("/api/invoices").then((r) => r.json()).then((invoices: Invoice[]) => {
      setInvoice(invoices.find((i) => i.id === invoiceId) || null);
    });
  }, [invoiceId]);

  if (!invoice) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  return (
    <div style={{ padding: 28, maxWidth: 800, margin: "0 auto" }}>
      {/* Print-friendly invoice */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 10, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, color: theme.text }}>INVOICE</div>
            <div style={{ fontSize: 14, color: theme.textDim, marginTop: 4 }}>{invoice.invoiceNumber}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              display: "inline-block", padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600,
              color: invoice.status === "paid" ? theme.green : theme.accent,
              background: invoice.status === "paid" ? `${theme.green}15` : `${theme.accent}15`,
            }}>
              {invoice.status.toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: theme.textDim, marginTop: 8 }}>
              Issued: {new Date(invoice.issueDate).toLocaleDateString("en-ZA")}
            </div>
            {invoice.dueDate && (
              <div style={{ fontSize: 12, color: theme.textDim }}>
                Due: {new Date(invoice.dueDate).toLocaleDateString("en-ZA")}
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
              <th style={{ padding: "8px 0", textAlign: "left", color: theme.textDim, fontSize: 11, fontWeight: 500 }}>Description</th>
              <th style={{ padding: "8px 0", textAlign: "right", color: theme.textDim, fontSize: 11, fontWeight: 500 }}>Qty</th>
              <th style={{ padding: "8px 0", textAlign: "right", color: theme.textDim, fontSize: 11, fontWeight: 500 }}>Unit Price</th>
              <th style={{ padding: "8px 0", textAlign: "right", color: theme.textDim, fontSize: 11, fontWeight: 500 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {(invoice.lineItems || []).map((li: LineItem, i: number) => (
              <tr key={i} style={{ borderBottom: `1px solid ${theme.cardBorder}08` }}>
                <td style={{ padding: "10px 0", color: theme.text, fontSize: 13 }}>{li.description}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: theme.text, fontSize: 13 }}>{li.quantity}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: theme.text, fontSize: 13 }}>{fmt(li.unitPrice)}</td>
                <td style={{ padding: "10px 0", textAlign: "right", color: theme.text, fontSize: 13, fontWeight: 600 }}>{fmt(li.quantity * li.unitPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <div style={{ width: 240 }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: theme.textDim }}>Subtotal</span>
              <span style={{ color: theme.text }}>{fmt(invoice.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13 }}>
              <span style={{ color: theme.textDim }}>VAT (15%)</span>
              <span style={{ color: theme.text }}>{fmt(invoice.tax)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", fontSize: 16, fontWeight: 700, borderTop: `1px solid ${theme.cardBorder}` }}>
              <span style={{ color: theme.text }}>Total</span>
              <span style={{ color: theme.green }}>{fmt(invoice.total)}</span>
            </div>
          </div>
        </div>

        {invoice.notes && (
          <div style={{ marginTop: 24, padding: 16, background: theme.bg, borderRadius: 6, fontSize: 13, color: theme.textDim }}>
            <strong style={{ color: theme.text }}>Notes:</strong> {invoice.notes}
          </div>
        )}

        <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
          <button onClick={() => window.print()} style={{
            padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Print Invoice</button>
        </div>
      </div>
    </div>
  );
}
