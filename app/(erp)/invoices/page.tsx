"use client";

import { useState, useEffect, useCallback } from "react";

const theme = {
  bg: "#0B0E13", card: "#12151C", cardBorder: "#1C2030", accent: "#3B82F6",
  text: "#E2E4E9", textDim: "#6B7280", input: "#161A24", inputBorder: "#252B3B",
  green: "#22C55E", red: "#EF4444", orange: "#F59E0B",
};

const fmt = (n: number) => new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);

interface Invoice {
  id: string; invoiceNumber: string; status: string; issueDate: string;
  dueDate?: string; subtotal: number; tax: number; total: number;
  notes?: string; dealId?: string; contactId?: string;
  lineItems: { description: string; quantity: number; unitPrice: number; total: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: theme.textDim, sent: theme.accent, paid: theme.green, overdue: theme.red,
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ invoiceNumber: "", notes: "", lineItems: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }] });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchInvoices = useCallback(async () => {
    const res = await fetch("/api/invoices");
    if (res.ok) {
      const json = await res.json();
      setInvoices(json.data ?? []);
    }
  }, []);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const handleCreate = async () => {
    const subtotal = form.lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0);
    const tax = subtotal * 0.15; // SA VAT
    await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        invoiceNumber: form.invoiceNumber || `INV-${Date.now().toString(36).toUpperCase()}`,
        subtotal, tax, total: subtotal + tax,
        notes: form.notes,
        lineItems: form.lineItems.map((li) => ({ ...li, total: li.quantity * li.unitPrice })),
      }),
    });
    setShowForm(false);
    setForm({ invoiceNumber: "", notes: "", lineItems: [{ description: "", quantity: 1, unitPrice: 0, total: 0 }] });
    fetchInvoices();
  };

  const updateLineItem = (idx: number, field: string, value: string | number) => {
    const items = [...form.lineItems];
    items[idx] = { ...items[idx], [field]: value };
    setForm({ ...form, lineItems: items });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", background: theme.input,
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0 }}>Invoices</h1>
        <button onClick={() => setShowForm(!showForm)} style={{
          padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
          borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ New Invoice</button>
      </div>

      {showForm && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>Invoice Number</label>
            <input style={{ ...inputStyle, maxWidth: 300 }} value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="Auto-generated if empty" />
          </div>

          <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginBottom: 8 }}>Line Items</div>
          {form.lineItems.map((li, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "3fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
              <input style={inputStyle} value={li.description} onChange={(e) => updateLineItem(i, "description", e.target.value)} placeholder="Description" />
              <input style={inputStyle} type="number" value={li.quantity} onChange={(e) => updateLineItem(i, "quantity", Number(e.target.value))} placeholder="Qty" />
              <input style={inputStyle} type="number" value={li.unitPrice} onChange={(e) => updateLineItem(i, "unitPrice", Number(e.target.value))} placeholder="Unit price" />
            </div>
          ))}
          <button onClick={() => setForm({ ...form, lineItems: [...form.lineItems, { description: "", quantity: 1, unitPrice: 0, total: 0 }] })} style={{ background: "transparent", border: `1px dashed ${theme.cardBorder}`, borderRadius: 6, padding: "6px 12px", color: theme.textDim, fontSize: 12, cursor: "pointer", marginBottom: 12 }}>+ Add line</button>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>Notes</label>
            <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleCreate} style={{ padding: "8px 16px", background: theme.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Create Invoice</button>
            <button onClick={() => setShowForm(false)} style={{ padding: "8px 16px", background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: theme.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#128203;</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>No invoices yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Create invoices to track contractor payments</div>
        </div>
      ) : (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                {["Invoice #", "Status", "Date", "Total"].map((h) => (
                  <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: theme.textDim, fontWeight: 500, fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} style={{ borderBottom: `1px solid ${theme.cardBorder}08` }}>
                  <td style={{ padding: "10px 14px", color: theme.text, fontWeight: 500 }}>{inv.invoiceNumber}</td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, color: STATUS_COLORS[inv.status] || theme.textDim, background: `${STATUS_COLORS[inv.status] || theme.textDim}15` }}>
                      {inv.status.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: theme.textDim }}>{new Date(inv.issueDate).toLocaleDateString("en-ZA")}</td>
                  <td style={{ padding: "10px 14px", color: theme.text, fontWeight: 600 }}>{fmt(inv.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
