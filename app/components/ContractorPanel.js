"use client";
import { useState } from "react";
import { theme, fmt, NumInput, Card, SectionDivider, MetricBox, Select, Tooltip } from "./theme";
import { SA_PROFESSIONS, SA_BANKS, ACCOUNT_TYPES } from "../data/constants";

const emptyContractor = () => ({
  name: "",
  profession: SA_PROFESSIONS[0],
  phone: "",
  dailyRate: 650,
  daysWorked: 0,
  assignedRooms: [],
  bank: SA_BANKS[0].name,
  branchCode: SA_BANKS[0].branchCode,
  accountNumber: "",
  accountType: "cheque",
});

export default function ContractorPanel({ contractors, setContractors, rooms, isMobile }) {
  const [editing, setEditing] = useState(null); // contractor id or null
  const [form, setForm] = useState(emptyContractor());

  const totalLabour = contractors.reduce((s, c) => s + c.dailyRate * c.daysWorked, 0);

  const startAdd = () => {
    setForm(emptyContractor());
    setEditing("new");
  };

  const startEdit = (c) => {
    setForm({ ...c });
    setEditing(c.id);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (editing === "new") {
      setContractors((prev) => [...prev, { ...form, id: Date.now() }]);
    } else {
      setContractors((prev) => prev.map((c) => (c.id === editing ? { ...form } : c)));
    }
    setEditing(null);
  };

  const remove = (id) => {
    setContractors((prev) => prev.filter((c) => c.id !== id));
    if (editing === id) setEditing(null);
  };

  const updateForm = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleBankChange = (bankName) => {
    const bank = SA_BANKS.find((b) => b.name === bankName);
    setForm((p) => ({ ...p, bank: bankName, branchCode: bank ? bank.branchCode : "" }));
  };

  const toggleRoomAssignment = (roomId) => {
    setForm((p) => {
      const assigned = p.assignedRooms.includes(roomId);
      return { ...p, assignedRooms: assigned ? p.assignedRooms.filter((r) => r !== roomId) : [...p.assignedRooms, roomId] };
    });
  };

  // Group by profession for summary
  const byProfession = {};
  contractors.forEach((c) => {
    if (!byProfession[c.profession]) byProfession[c.profession] = { count: 0, cost: 0 };
    byProfession[c.profession].count++;
    byProfession[c.profession].cost += c.dailyRate * c.daysWorked;
  });

  const inputStyle = { background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "8px 10px", color: theme.text, fontSize: isMobile ? 16 : 14, width: "100%", outline: "none" };

  return (
    <div>
      <Card subtitle="Manage contractors working on this project. Add their details, daily rates, and assign them to rooms.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>
            {contractors.length} contractor{contractors.length !== 1 ? "s" : ""} &middot; Total labour: {fmt(totalLabour)}
          </span>
          <button onClick={startAdd} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: isMobile ? "10px 18px" : "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Contractor</button>
        </div>
      </Card>

      {/* Contractor list */}
      {contractors.map((c) => (
        <Card key={c.id} style={{ padding: isMobile ? 12 : 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text }}>{c.name}</div>
              <div style={{ fontSize: 12, color: theme.textDim }}>{c.profession}</div>
              {c.phone && <div style={{ fontSize: 12, color: theme.textDim }}>{c.phone}</div>}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.dailyRate * c.daysWorked)}</div>
              <div style={{ fontSize: 11, color: theme.textDim }}>{fmt(c.dailyRate)}/day x {c.daysWorked} days</div>
            </div>
          </div>
          {c.assignedRooms.length > 0 && (
            <div style={{ fontSize: 11, color: theme.textDim, marginBottom: 8 }}>
              Rooms: {c.assignedRooms.map((rid) => rooms.find((r) => r.id === rid)?.name || "?").join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => startEdit(c)} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "5px 12px", fontSize: 11, color: theme.text, cursor: "pointer" }}>Edit</button>
            <button onClick={() => remove(c.id)} style={{ background: "none", border: `1px solid ${theme.red}40`, borderRadius: 6, padding: "5px 12px", fontSize: 11, color: theme.red, cursor: "pointer" }}>Remove</button>
          </div>
        </Card>
      ))}

      {/* Edit / Add form */}
      {editing !== null && (
        <>
          <SectionDivider label={editing === "new" ? "Add Contractor" : "Edit Contractor"} />
          <Card style={{ borderColor: theme.accent }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Name</label>
                <input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Contractor name" style={inputStyle} />
              </div>
              <Select label="Profession" value={form.profession} onChange={(v) => updateForm("profession", v)} options={SA_PROFESSIONS.map((p) => ({ value: p, label: p }))} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Phone</label>
                <input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} placeholder="e.g. 082 123 4567" style={inputStyle} />
              </div>
              <NumInput label="Daily Rate (R)" value={form.dailyRate} onChange={(v) => updateForm("dailyRate", v)} isMobile={isMobile} />
              <NumInput label="Days Worked" value={form.daysWorked} onChange={(v) => updateForm("daysWorked", v)} prefix="" suffix="days" isMobile={isMobile} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                  Total Cost <Tooltip text="Daily rate x days worked" />
                </label>
                <div style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: theme.accent }}>
                  {fmt(form.dailyRate * form.daysWorked)}
                </div>
              </div>
            </div>

            <SectionDivider label="Bank Details" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
              <Select label="Bank" value={form.bank} onChange={handleBankChange} options={SA_BANKS.map((b) => ({ value: b.name, label: b.name }))} />
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Branch Code (auto-filled)</label>
                <input value={form.branchCode} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Account Number</label>
                <input value={form.accountNumber} onChange={(e) => updateForm("accountNumber", e.target.value)} placeholder="Account number" style={inputStyle} />
              </div>
              <Select label="Account Type" value={form.accountType} onChange={(v) => updateForm("accountType", v)} options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
            </div>

            <SectionDivider label="Room Assignment" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {rooms.map((room) => {
                const assigned = form.assignedRooms.includes(room.id);
                return (
                  <button key={room.id} onClick={() => toggleRoomAssignment(room.id)} style={{
                    background: assigned ? theme.accentDim : theme.input,
                    border: `1px solid ${assigned ? theme.accent : theme.inputBorder}`,
                    borderRadius: 8, padding: "6px 12px", fontSize: 12,
                    color: assigned ? theme.accent : theme.textDim, cursor: "pointer",
                    fontWeight: assigned ? 600 : 400,
                  }}>
                    {assigned ? "✓ " : ""}{room.name}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={save} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: "10px 24px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {editing === "new" ? "Add Contractor" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(null)} style={{ background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: "10px 24px", fontSize: 13, color: theme.text, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </Card>
        </>
      )}

      {/* Summary by profession */}
      {contractors.length > 0 && (
        <>
          <SectionDivider label="Labour Summary" />
          <Card title="Cost by Profession" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
            {Object.entries(byProfession).map(([prof, data]) => (
              <div key={prof} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
                <span style={{ color: theme.text }}>{prof} <span style={{ color: theme.textDim, fontSize: 11 }}>({data.count})</span></span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(data.cost)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: theme.text }}>Total Contractor Labour</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(totalLabour)}</span>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
