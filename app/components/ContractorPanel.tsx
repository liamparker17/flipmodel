// @ts-nocheck
"use client";
import { useState } from "react";
import { theme, fmt, NumInput, Card, SectionDivider, MetricBox, Select, Tooltip, Accordion } from "./theme";
import { SA_PROFESSIONS, SA_BANKS, ACCOUNT_TYPES } from "../data/constants";

interface Contractor {
  id: number;
  name: string;
  profession: string;
  phone: string;
  dailyRate: number;
  daysWorked: number;
  assignedRooms: number[];
  bank: string;
  branchCode: string;
  accountNumber: string;
  accountType: string;
}

interface Room {
  id: number;
  name: string;
  [key: string]: unknown;
}

interface ContractorPanelProps {
  contractors: Contractor[];
  setContractors: React.Dispatch<React.SetStateAction<Contractor[]>>;
  rooms: Room[];
  isMobile: boolean;
}

const emptyContractor = (): Omit<Contractor, 'id'> => ({
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

export default function ContractorPanel({ contractors, setContractors, rooms, isMobile }: ContractorPanelProps) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>(emptyContractor() as unknown as Record<string, unknown>);

  const totalLabour = contractors.reduce((s, c) => s + c.dailyRate * c.daysWorked, 0);

  const startAdd = () => {
    setForm(emptyContractor() as unknown as Record<string, unknown>);
    setEditing("new");
  };

  const startEdit = (c: Contractor) => {
    setForm({ ...c } as unknown as Record<string, unknown>);
    setEditing(c.id);
  };

  const save = () => {
    if (!(form.name as string).trim()) return;
    if (editing === "new") {
      setContractors((prev) => [...prev, { ...form, id: Date.now() } as unknown as Contractor]);
    } else {
      setContractors((prev) => prev.map((c) => (c.id === editing ? { ...form } as unknown as Contractor : c)));
    }
    setEditing(null);
  };

  const remove = (id: number) => {
    setContractors((prev) => prev.filter((c) => c.id !== id));
    if (editing === id) setEditing(null);
  };

  const updateForm = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const handleBankChange = (bankName: string) => {
    const bank = SA_BANKS.find((b) => b.name === bankName);
    setForm((p) => ({ ...p, bank: bankName, branchCode: bank ? bank.branchCode : "" }));
  };

  const toggleRoomAssignment = (roomId: number) => {
    setForm((p) => {
      const assignedRooms = p.assignedRooms as number[];
      const assigned = assignedRooms.includes(roomId);
      return { ...p, assignedRooms: assigned ? assignedRooms.filter((r) => r !== roomId) : [...assignedRooms, roomId] };
    });
  };

  const byProfession: Record<string, { count: number; cost: number }> = {};
  contractors.forEach((c) => {
    if (!byProfession[c.profession]) byProfession[c.profession] = { count: 0, cost: 0 };
    byProfession[c.profession].count++;
    byProfession[c.profession].cost += c.dailyRate * c.daysWorked;
  });

  const inputStyle: React.CSSProperties = {
    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
    padding: "10px 12px", color: theme.text, fontSize: 16, width: "100%", outline: "none",
    minHeight: 44,
  };

  return (
    <div>
      <Card subtitle="Manage contractors working on this project. Add their details, daily rates, and assign them to rooms.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>
            {contractors.length} contractor{contractors.length !== 1 ? "s" : ""} &middot; Total: {fmt(totalLabour)}
          </span>
          <button onClick={startAdd} style={{
            background: theme.accent, color: "#000", border: "none", borderRadius: 8,
            padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
          }}>+ Add Contractor</button>
        </div>
      </Card>

      {contractors.length === 0 && editing === null && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
            No contractors added yet. Tap &quot;+ Add Contractor&quot; to get started.
          </div>
        </Card>
      )}

      {contractors.map((c) => (
        <Card key={c.id} style={{ padding: 14 }}>
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
            <button onClick={() => startEdit(c)} style={{
              background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
              padding: "8px 16px", fontSize: 12, color: theme.text, cursor: "pointer", minHeight: 40,
            }}>Edit</button>
            <button onClick={() => remove(c.id)} style={{
              background: "none", border: `1px solid ${theme.red}40`, borderRadius: 8,
              padding: "8px 16px", fontSize: 12, color: theme.red, cursor: "pointer", minHeight: 40,
            }}>Remove</button>
          </div>
        </Card>
      ))}

      {editing !== null && (
        <>
          <SectionDivider label={editing === "new" ? "Add Contractor" : "Edit Contractor"} />
          <Card style={{ borderColor: theme.accent }}>
            <Accordion title="Contact & Cost" defaultOpen={true}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Name *</label>
                  <input value={form.name as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm("name", e.target.value)} placeholder="Contractor name" style={inputStyle} />
                  {(form.name as string).trim() === "" && editing !== null && (
                    <div style={{ fontSize: 11, color: theme.red, marginTop: 4 }}>Name is required</div>
                  )}
                </div>
                <Select label="Profession" value={form.profession as string} onChange={(v: string) => updateForm("profession", v)} options={SA_PROFESSIONS.map((p) => ({ value: p, label: p }))} />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Phone</label>
                  <input value={form.phone as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm("phone", e.target.value)} placeholder="e.g. 082 123 4567" style={inputStyle} />
                </div>
                <NumInput label="Daily Rate (R)" value={form.dailyRate} onChange={(v: number) => updateForm("dailyRate", v)} isMobile={isMobile} />
                <NumInput label="Days Worked" value={form.daysWorked} onChange={(v: number) => updateForm("daysWorked", v)} prefix="" suffix="days" isMobile={isMobile} />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>
                    Total Cost <Tooltip text="Daily rate x days worked" />
                  </label>
                  <div style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: theme.accent }}>
                    {fmt((form.dailyRate as number) * (form.daysWorked as number))}
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="Bank Details">
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
                <Select label="Bank" value={form.bank as string} onChange={handleBankChange} options={SA_BANKS.map((b) => ({ value: b.name, label: b.name }))} />
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Branch Code (auto-filled)</label>
                  <input value={form.branchCode as string} readOnly style={{ ...inputStyle, opacity: 0.7 }} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, color: theme.textDim, marginBottom: 5, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Account Number</label>
                  <input value={form.accountNumber as string} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateForm("accountNumber", e.target.value)} placeholder="Account number" style={inputStyle} />
                </div>
                <Select label="Account Type" value={form.accountType as string} onChange={(v: string) => updateForm("accountType", v)} options={ACCOUNT_TYPES.map((t) => ({ value: t.value, label: t.label }))} />
              </div>
            </Accordion>

            <Accordion title="Room Assignment">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {rooms.length === 0 ? (
                  <div style={{ color: theme.textDim, fontSize: 13 }}>No rooms to assign. Add rooms in the Rooms step first.</div>
                ) : (
                  rooms.map((room) => {
                    const assigned = (form.assignedRooms as number[]).includes(room.id);
                    return (
                      <button key={room.id} onClick={() => toggleRoomAssignment(room.id)} style={{
                        background: assigned ? theme.accentDim : theme.input,
                        border: `1px solid ${assigned ? theme.accent : theme.inputBorder}`,
                        borderRadius: 8, padding: "10px 16px", fontSize: 13,
                        color: assigned ? theme.accent : theme.textDim, cursor: "pointer",
                        fontWeight: assigned ? 600 : 400, minHeight: 44,
                      }}>
                        {assigned ? "# " : ""}{room.name}
                      </button>
                    );
                  })
                )}
              </div>
            </Accordion>

            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button onClick={save} style={{
                background: theme.accent, color: "#000", border: "none", borderRadius: 8,
                padding: "12px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", minHeight: 44,
              }}>
                {editing === "new" ? "Add Contractor" : "Save Changes"}
              </button>
              <button onClick={() => setEditing(null)} style={{
                background: "transparent", border: `1px solid ${theme.cardBorder}`, borderRadius: 8,
                padding: "12px 24px", fontSize: 14, color: theme.text, cursor: "pointer", minHeight: 44,
              }}>
                Cancel
              </button>
            </div>
          </Card>
        </>
      )}

      {contractors.length > 0 && (
        <>
          <SectionDivider label="Labour Summary" />
          <Card title="Cost by Profession" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
            {Object.entries(byProfession).map(([prof, data]) => (
              <div key={prof} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
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
