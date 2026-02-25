"use client";

import { useState, useEffect, useCallback } from "react";

const theme = {
  bg: "#0B0E13", card: "#12151C", cardBorder: "#1C2030", accent: "#3B82F6",
  text: "#E2E4E9", textDim: "#6B7280", input: "#161A24", inputBorder: "#252B3B",
  green: "#22C55E", red: "#EF4444", orange: "#F59E0B",
};

interface Doc {
  id: string; name: string; type: string; url?: string; notes?: string;
  dealId?: string; createdAt: string;
}

const DOC_TYPES = [
  "offer_to_purchase", "title_deed", "valuation", "inspection_report", "floor_plan",
  "quote", "invoice", "receipt", "compliance_certificate", "photo", "contract", "other",
];

const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function DocumentsPage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", type: "other", url: "", notes: "" });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchDocs = useCallback(async () => {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const json = await res.json();
      setDocs(json.data ?? []);
    }
  }, []);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const handleAdd = async () => {
    if (!form.name) return;
    await fetch("/api/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ name: "", type: "other", url: "", notes: "" });
    setShowAdd(false);
    fetchDocs();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this document?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    fetchDocs();
  };

  const filtered = docs.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false;
    if (filter && !d.name.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 12px", background: theme.input,
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0 }}>Document Vault</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{
          padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
          borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}>+ Add Document</button>
      </div>

      {showAdd && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>Name</label>
              <input style={inputStyle} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Document name" />
            </div>
            <div>
              <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>Type</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>URL</label>
              <input style={inputStyle} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
            </div>
            <div>
              <label style={{ display: "block", color: theme.textDim, fontSize: 11, marginBottom: 4 }}>Notes</label>
              <input style={inputStyle} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleAdd} style={{ padding: "8px 16px", background: theme.green, color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Save</button>
            <button onClick={() => setShowAdd(false)} style={{ padding: "8px 16px", background: "transparent", color: theme.textDim, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, fontSize: 13, cursor: "pointer" }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input style={{ ...inputStyle, maxWidth: 300 }} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Search documents..." />
        <select style={{ ...inputStyle, maxWidth: 200, cursor: "pointer" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All types</option>
          {DOC_TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: 60, color: theme.textDim }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>&#128196;</div>
          <div style={{ fontSize: 15, fontWeight: 500 }}>No documents yet</div>
          <div style={{ fontSize: 13, marginTop: 6 }}>Upload documents to keep everything in one place</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
          {filtered.map((doc) => (
            <div key={doc.id} style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{doc.name}</div>
                <button onClick={() => handleDelete(doc.id)} style={{ background: "transparent", border: "none", color: theme.red, fontSize: 14, cursor: "pointer", padding: 0 }}>&times;</button>
              </div>
              <div style={{ display: "inline-block", padding: "2px 8px", background: `${theme.accent}15`, color: theme.accent, borderRadius: 4, fontSize: 11, fontWeight: 500, marginBottom: 8 }}>
                {typeLabel(doc.type)}
              </div>
              {doc.url && (
                <div style={{ marginBottom: 6 }}>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: theme.accent, fontSize: 12, textDecoration: "none" }}>
                    Open &rarr;
                  </a>
                </div>
              )}
              {doc.notes && <div style={{ fontSize: 12, color: theme.textDim }}>{doc.notes}</div>}
              <div style={{ fontSize: 11, color: theme.textDim, marginTop: 8 }}>
                {new Date(doc.createdAt).toLocaleDateString("en-ZA")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
