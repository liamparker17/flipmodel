"use client";
import { useState } from "react";
import { theme } from "../../../components/theme";

export function AddCustomItemForm({ dealId, onAdd, onCancel }: {
  dealId: string;
  onAdd: (item: { label: string; category: string; qty: number; unit: string; unitPrice: number; vendor?: string }) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("unit");
  const [unitPrice, setUnitPrice] = useState("");
  const [vendor, setVendor] = useState("");
  const inputStyle = { background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 4, padding: "6px 10px", color: theme.text, fontSize: 13, outline: "none" as const, minHeight: 34 };

  return (
    <div style={{ background: theme.card, border: `1px solid ${theme.orange}40`, borderRadius: 8, padding: 16, marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.orange, marginBottom: 12 }}>Add Unanticipated Item</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <div style={{ flex: 2, minWidth: 180 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Item Name</label>
          <input type="text" placeholder="e.g. Extra basin mixer" value={label} onChange={(e) => setLabel(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ flex: 0, minWidth: 70 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Qty</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
        <div style={{ flex: 0, minWidth: 90 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Unit</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)} style={{ ...inputStyle, width: "100%" }}>
            {["unit", "sqm", "bag", "bucket", "roll", "length", "pack", "set", "tube", "kit"].map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 110 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Unit Price (R)</label>
          <input type="number" placeholder="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} style={{ ...inputStyle, width: "100%", fontFamily: "'JetBrains Mono', monospace" }} />
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, display: "block", marginBottom: 4 }}>Vendor (optional)</label>
          <input type="text" placeholder="e.g. Builders" value={vendor} onChange={(e) => setVendor(e.target.value)} style={{ ...inputStyle, width: "100%" }} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => { if (!label.trim() || !unitPrice) return; onAdd({ label: label.trim(), category: "unanticipated", qty: parseInt(qty) || 1, unit, unitPrice: parseFloat(unitPrice) || 0, vendor: vendor.trim() || undefined }); }}
          style={{ background: theme.orange, color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: (!label.trim() || !unitPrice) ? 0.5 : 1 }}>Add Item</button>
        <button onClick={onCancel} style={{ background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, padding: "8px 18px", fontSize: 12, cursor: "pointer" }}>Cancel</button>
      </div>
    </div>
  );
}
