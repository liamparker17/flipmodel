"use client";
import { useState, useMemo } from "react";
import { theme, fmt, Card, SectionDivider, MetricBox, Select } from "./theme";
import { EXPENSE_CATEGORIES } from "../data/constants";

const STORAGE_KEY = "justhousesErp_expenses";

function loadExpenses(profileId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw);
    return (all[profileId] || []).map((e) => ({
      ...e,
      date: e.date || new Date().toISOString().slice(0, 10),
    }));
  } catch { return []; }
}

function persistExpenses(profileId, expenses) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all = raw ? JSON.parse(raw) : {};
    all[profileId] = expenses;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export default function ExpensesStep({ profileId, isMobile }) {
  const [expenses, setExpenses] = useState(() => loadExpenses(profileId || "default"));
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    description: "", amount: 0, category: EXPENSE_CATEGORIES[0],
    date: new Date().toISOString().slice(0, 10), type: "receipt",
    fileData: null, fileName: "",
  });
  const [filterCategory, setFilterCategory] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(null);

  const pid = profileId || "default";

  const save = (updated) => {
    setExpenses(updated);
    persistExpenses(pid, updated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((p) => ({ ...p, fileData: reader.result, fileName: file.name }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!form.description.trim() || form.amount <= 0) return;
    const entry = {
      id: editId || String(Date.now()),
      description: form.description.trim(),
      amount: form.amount,
      category: form.category,
      date: form.date,
      type: form.type,
      fileData: form.fileData,
      fileName: form.fileName,
      createdAt: editId ? (expenses.find((e) => e.id === editId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
    };
    let updated;
    if (editId) {
      updated = expenses.map((e) => e.id === editId ? entry : e);
    } else {
      updated = [...expenses, entry];
    }
    save(updated);
    resetForm();
  };

  const resetForm = () => {
    setForm({ description: "", amount: 0, category: EXPENSE_CATEGORIES[0], date: new Date().toISOString().slice(0, 10), type: "receipt", fileData: null, fileName: "" });
    setShowForm(false);
    setEditId(null);
  };

  const startEdit = (expense) => {
    setForm({
      description: expense.description, amount: expense.amount,
      category: expense.category, date: expense.date,
      type: expense.type, fileData: expense.fileData || null,
      fileName: expense.fileName || "",
    });
    setEditId(expense.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      save(expenses.filter((e) => e.id !== id));
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  const viewFile = (expense) => {
    if (!expense.fileData) return;
    const w = window.open();
    if (w) {
      if (expense.fileData.startsWith("data:image")) {
        w.document.write(`<img src="${expense.fileData}" style="max-width:100%"/>`);
      } else if (expense.fileData.startsWith("data:application/pdf")) {
        w.document.write(`<iframe src="${expense.fileData}" style="width:100%;height:100vh;border:none"></iframe>`);
      } else {
        w.document.write(`<p>File: ${expense.fileName}</p><a href="${expense.fileData}" download="${expense.fileName}">Download</a>`);
      }
    }
  };

  // Filtered expenses
  const filtered = useMemo(() => {
    return expenses.filter((e) => {
      if (filterCategory !== "all" && e.category !== filterCategory) return false;
      if (dateFrom && e.date < dateFrom) return false;
      if (dateTo && e.date > dateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [expenses, filterCategory, dateFrom, dateTo]);

  // Category totals
  const categoryTotals = useMemo(() => {
    const totals = {};
    filtered.forEach((e) => {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
    });
    return totals;
  }, [filtered]);

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const totalAll = expenses.reduce((s, e) => s + e.amount, 0);

  // Download filtered expenses as CSV
  const downloadCSV = () => {
    const header = "Date,Description,Category,Type,Amount\n";
    const rows = filtered.map((e) =>
      `${e.date},"${e.description.replace(/"/g, '""')}","${e.category}",${e.type},${e.amount}`
    ).join("\n");
    const csv = header + rows + `\n\nTotal,,,,${totalFiltered}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fromStr = dateFrom || "start";
    const toStr = dateTo || "end";
    a.download = `expenses_${fromStr}_to_${toStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download filtered expenses as JSON with file data
  const downloadJSON = () => {
    const data = {
      exportDate: new Date().toISOString(),
      dateRange: { from: dateFrom || null, to: dateTo || null },
      category: filterCategory,
      total: totalFiltered,
      expenses: filtered,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expenses_export_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const inputStyle = {
    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
    padding: "10px 12px", color: theme.text, fontSize: 16, width: "100%", outline: "none",
    minHeight: 44,
  };

  return (
    <div>
      {/* Summary */}
      <Card title="Expense Summary">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="Total Expenses" value={fmt(totalAll)} color={theme.orange} isMobile={isMobile} />
          <MetricBox label="Receipts" value={String(expenses.filter((e) => e.type === "receipt").length)} isMobile={isMobile} />
          <MetricBox label="Invoices" value={String(expenses.filter((e) => e.type === "invoice").length)} isMobile={isMobile} />
        </div>
        <div style={{ textAlign: "right" }}>
          <button onClick={() => { setEditId(null); setShowForm(!showForm); }} style={{
            background: theme.accent, color: "#000", border: "none", borderRadius: 8,
            padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44,
          }}>
            {showForm ? "Cancel" : "+ Add Expense"}
          </button>
        </div>
      </Card>

      {/* Add/Edit Form */}
      {showForm && (
        <Card style={{ borderColor: theme.accent }}>
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: theme.accent, fontWeight: 600 }}>
            {editId ? "Edit Expense" : "New Expense"}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 16px" }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Description</label>
              <input value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="e.g. Roof tiles from Builders" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Amount (R)</label>
              <div style={{ ...inputStyle, display: "flex", alignItems: "center" }}>
                <span style={{ color: theme.textDim, marginRight: 4 }}>R</span>
                <input type="number" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: Number(e.target.value) }))}
                  style={{ background: "transparent", border: "none", color: theme.text, fontSize: 16, width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }}
                />
              </div>
            </div>
            <Select label="Category" value={form.category} onChange={(v) => setForm((p) => ({ ...p, category: v }))}
              options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
            />
            <Select label="Type" value={form.type} onChange={(v) => setForm((p) => ({ ...p, type: v }))}
              options={[{ value: "receipt", label: "Receipt" }, { value: "invoice", label: "Invoice" }]}
            />
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                Attach File (image/PDF, max 5MB)
              </label>
              <input type="file" accept="image/*,.pdf" onChange={handleFileUpload}
                style={{ ...inputStyle, padding: "8px 12px", cursor: "pointer" }}
              />
              {form.fileName && (
                <div style={{ fontSize: 12, color: theme.green, marginTop: 4 }}>
                  Attached: {form.fileName}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <button onClick={handleSubmit} style={{
              background: theme.accent, color: "#000", border: "none", borderRadius: 8,
              padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44,
            }}>
              {editId ? "Save Changes" : "Add Expense"}
            </button>
            <button onClick={resetForm} style={{
              background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 8,
              padding: "12px 24px", fontSize: 14, color: theme.text, cursor: "pointer", minHeight: 44,
            }}>
              Cancel
            </button>
          </div>
        </Card>
      )}

      {/* Filters & Download */}
      <SectionDivider label="Filter & Download" />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: "0 16px" }}>
          <Select label="Category" value={filterCategory} onChange={setFilterCategory}
            options={[{ value: "all", label: "All Categories" }, ...EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>From Date</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>To Date</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={downloadCSV} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
            padding: "12px 20px", fontSize: 13, color: theme.text, cursor: "pointer", fontWeight: 600, minHeight: 44,
          }}>
            Download CSV ({filtered.length} items)
          </button>
          <button onClick={downloadJSON} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
            padding: "12px 20px", fontSize: 13, color: theme.text, cursor: "pointer", fontWeight: 600, minHeight: 44,
          }}>
            Download JSON (with files)
          </button>
          {(dateFrom || dateTo || filterCategory !== "all") && (
            <button onClick={() => { setDateFrom(""); setDateTo(""); setFilterCategory("all"); }} style={{
              background: "transparent", border: `1px solid ${theme.red}40`, borderRadius: 8,
              padding: "12px 20px", fontSize: 13, color: theme.red, cursor: "pointer", minHeight: 44,
            }}>
              Clear Filters
            </button>
          )}
        </div>
        {(dateFrom || dateTo || filterCategory !== "all") && (
          <div style={{ marginTop: 10, fontSize: 12, color: theme.textDim }}>
            Showing {filtered.length} of {expenses.length} expenses &middot; Filtered total: {fmt(totalFiltered)}
          </div>
        )}
      </Card>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <>
          <SectionDivider label="By Category" />
          <Card>
            {Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]).map(([cat, total]) => (
              <div key={cat} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
                <span style={{ color: theme.text }}>{cat}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent, fontWeight: 600 }}>{fmt(total)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: theme.text }}>Total</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(totalFiltered)}</span>
            </div>
          </Card>
        </>
      )}

      {/* Expense List */}
      <SectionDivider label="Expense Records" />
      {filtered.length === 0 ? (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
            {expenses.length === 0
              ? "No expenses yet. Add your first receipt or invoice above."
              : "No expenses match your filters."}
          </div>
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((e) => (
            <Card key={e.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{e.description}</div>
                  <div style={{ fontSize: 12, color: theme.textDim }}>
                    {e.date} &middot; {e.category} &middot;
                    <span style={{ color: e.type === "invoice" ? theme.orange : theme.green, marginLeft: 4, textTransform: "capitalize" }}>{e.type}</span>
                  </div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace", marginLeft: 12 }}>
                  {fmt(e.amount)}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {e.fileData && (
                  <button onClick={() => viewFile(e)} style={{
                    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                    padding: "8px 14px", fontSize: 12, color: theme.text, cursor: "pointer", minHeight: 36,
                  }}>
                    View {e.fileName?.split(".").pop()?.toUpperCase() || "File"}
                  </button>
                )}
                <button onClick={() => startEdit(e)} style={{
                  background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
                  padding: "8px 14px", fontSize: 12, color: theme.text, cursor: "pointer", minHeight: 36,
                }}>
                  Edit
                </button>
                <button onClick={() => handleDelete(e.id)} style={{
                  background: confirmDelete === e.id ? theme.red : "transparent",
                  border: `1px solid ${confirmDelete === e.id ? theme.red : `${theme.red}40`}`,
                  borderRadius: 6, padding: "8px 14px", fontSize: 12,
                  color: confirmDelete === e.id ? "#fff" : theme.red, cursor: "pointer", minHeight: 36,
                }}>
                  {confirmDelete === e.id ? "Confirm" : "Delete"}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
