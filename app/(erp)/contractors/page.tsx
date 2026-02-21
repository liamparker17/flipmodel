"use client";
import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { theme, fmt } from "../../components/theme";
import useDeals from "../../hooks/useDeals";
import type { Deal, DealContact } from "../../types/deal";

interface ContractorProfile {
  name: string;
  company?: string;
  profession?: string;
  phone?: string;
  email?: string;
  notes?: string;
  dailyRate?: number;
  bankName?: string;
  accountNumber?: string;
  branchCode?: string;
  accountType?: string;
  projects: { dealId: string; dealName: string; dealAddress: string; dealStage: string; daysWorked: number; totalPaid: number; contactId: string }[];
  totalDaysWorked: number;
  totalEarned: number;
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, color: theme.textDim }}>Loading...</div>}>
      <ContractorsPageInner />
    </Suspense>
  );
}

function ContractorsPageInner() {
  const { deals, loaded } = useDeals();
  const searchParams = useSearchParams();
  const [selectedContractor, setSelectedContractor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-select contractor from URL query param (e.g. /contractors?name=Thabo%20Mokoena)
  useEffect(() => {
    const name = searchParams.get("name");
    if (name && loaded) setSelectedContractor(name);
  }, [searchParams, loaded]);

  // Aggregate contractors across all deals
  const contractors = useMemo(() => {
    const map: Record<string, ContractorProfile> = {};

    for (const deal of deals) {
      const contacts = (deal.contacts || []).filter((c) => c.role === "contractor");
      for (const c of contacts) {
        const key = c.name.toLowerCase().trim();
        if (!map[key]) {
          map[key] = {
            name: c.name,
            company: c.company,
            profession: c.profession,
            phone: c.phone,
            email: c.email,
            notes: c.notes,
            dailyRate: c.dailyRate,
            bankName: c.bankName,
            accountNumber: c.accountNumber,
            branchCode: c.branchCode,
            accountType: c.accountType,
            projects: [],
            totalDaysWorked: 0,
            totalEarned: 0,
          };
        }

        // Merge latest details (prefer most recent deal's data)
        const p = map[key];
        if (c.phone) p.phone = c.phone;
        if (c.email) p.email = c.email;
        if (c.company) p.company = c.company;
        if (c.profession) p.profession = c.profession;
        if (c.dailyRate) p.dailyRate = c.dailyRate;
        if (c.bankName) p.bankName = c.bankName;
        if (c.accountNumber) p.accountNumber = c.accountNumber;
        if (c.branchCode) p.branchCode = c.branchCode;
        if (c.accountType) p.accountType = c.accountType;
        if (c.notes && !p.notes?.includes(c.notes)) p.notes = c.notes;

        const daysWorked = c.daysWorked || 0;
        const totalPaid = daysWorked * (c.dailyRate || 0);

        // Also check expenses for actual payments
        const expenseTotal = (deal.expenses || [])
          .filter((e) => !e.isProjected && e.category === "labour" && e.vendor && e.vendor.toLowerCase().includes(key.split(" ")[0].toLowerCase()))
          .reduce((sum, e) => sum + e.amount, 0);

        const paid = expenseTotal > 0 ? expenseTotal : totalPaid;

        p.projects.push({
          dealId: deal.id,
          dealName: deal.name,
          dealAddress: deal.address,
          dealStage: deal.stage,
          daysWorked,
          totalPaid: paid,
          contactId: c.id,
        });

        p.totalDaysWorked += daysWorked;
        p.totalEarned += paid;
      }
    }

    return Object.values(map).sort((a, b) => b.totalEarned - a.totalEarned);
  }, [deals]);

  const filtered = useMemo(() => {
    if (!searchTerm) return contractors;
    const q = searchTerm.toLowerCase();
    return contractors.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.profession || "").toLowerCase().includes(q) ||
      (c.company || "").toLowerCase().includes(q)
    );
  }, [contractors, searchTerm]);

  const selected = selectedContractor ? contractors.find((c) => c.name === selectedContractor) : null;

  if (!loaded) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  // ─── Detail View ───
  if (selected) {
    return (
      <div style={{ padding: 28, maxWidth: 900 }}>
        <button onClick={() => setSelectedContractor(null)}
          style={{ background: "transparent", border: "none", color: theme.accent, fontSize: 12, cursor: "pointer", padding: 0, marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
          &larr; All Contractors
        </button>

        {/* Profile Header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {selected.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>{selected.name}</h1>
            {selected.company && <div style={{ fontSize: 13, color: theme.textDim }}>{selected.company}</div>}
            {selected.profession && (
              <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${theme.accent}15`, color: theme.accent, marginTop: 4, display: "inline-block" }}>{selected.profession}</span>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 }}>Total Earned</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: theme.green, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(selected.totalEarned)}</div>
          </div>
        </div>

        {/* Contact & Banking Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
          {/* Contact Details */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Contact Details</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
              {selected.phone && <Row label="Phone" value={selected.phone} />}
              {selected.email && <Row label="Email" value={selected.email} />}
              {selected.dailyRate && <Row label="Day Rate" value={fmt(selected.dailyRate)} />}
              {selected.notes && <Row label="Notes" value={selected.notes} />}
            </div>
          </div>

          {/* Banking Details */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: "0 0 12px" }}>Banking Details</h3>
            {selected.bankName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <Row label="Bank" value={selected.bankName} />
                {selected.accountNumber && <Row label="Account" value={selected.accountNumber} mono />}
                {selected.branchCode && <Row label="Branch Code" value={selected.branchCode} mono />}
                {selected.accountType && <Row label="Type" value={selected.accountType.charAt(0).toUpperCase() + selected.accountType.slice(1)} />}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.textDim, padding: "12px 0" }}>No banking details recorded</div>
            )}
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24 }}>
          <KPI label="Projects" value={String(selected.projects.length)} />
          <KPI label="Total Days" value={String(selected.totalDaysWorked)} />
          <KPI label="Day Rate" value={selected.dailyRate ? fmt(selected.dailyRate) : "—"} />
          <KPI label="Active Now" value={String(selected.projects.filter((p) => p.dealStage === "renovating").length)} color={theme.orange} />
        </div>

        {/* Project History */}
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ padding: "12px 16px", borderBottom: `1px solid ${theme.cardBorder}` }}>
            <h3 style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 }}>Project History</h3>
          </div>
          <div style={{ fontSize: 10, color: theme.textDim, display: "grid", gridTemplateColumns: "1.5fr 1fr 80px 100px 80px", gap: 0, padding: "8px 16px 4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
            <span>Property</span><span>Stage</span><span style={{ textAlign: "right" }}>Days</span><span style={{ textAlign: "right" }}>Paid</span><span style={{ textAlign: "right" }}>Action</span>
          </div>
          {selected.projects.map((p) => {
            const stageColor = p.dealStage === "renovating" ? theme.orange : p.dealStage === "sold" ? theme.green : theme.accent;
            return (
              <div key={p.dealId} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 80px 100px 80px", gap: 0, padding: "10px 16px", alignItems: "center", borderBottom: `1px solid ${theme.cardBorder}20` }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.text }}>{p.dealName}</div>
                  <div style={{ fontSize: 10, color: theme.textDim }}>{p.dealAddress}</div>
                </div>
                <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${stageColor}15`, color: stageColor, display: "inline-block", width: "fit-content" }}>{p.dealStage}</span>
                <span style={{ textAlign: "right", fontSize: 13, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{p.daysWorked}</span>
                <span style={{ textAlign: "right", fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: theme.text }}>{fmt(p.totalPaid)}</span>
                <div style={{ textAlign: "right" }}>
                  <a href={`/projects/${p.dealId}`} style={{ fontSize: 10, color: theme.accent, fontWeight: 600, textDecoration: "none" }}>View &rarr;</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── List View ───
  return (
    <div style={{ padding: 28, maxWidth: 1100 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>Contractors</h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>All contractors across your portfolio</p>
      </div>

      {/* KPI Row */}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
        <KPI label="Total Contractors" value={String(contractors.length)} />
        <KPI label="Active (on site)" value={String(contractors.filter((c) => c.projects.some((p) => p.dealStage === "renovating" && p.daysWorked > 0)).length)} color={theme.orange} />
        <KPI label="Total Paid" value={fmt(contractors.reduce((s, c) => s + c.totalEarned, 0))} color={theme.green} />
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Search contractors..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "8px 12px", color: theme.text, fontSize: 13, outline: "none", minWidth: 280, minHeight: 36 }} />
      </div>

      {filtered.length === 0 && (
        <div style={{ padding: 60, textAlign: "center", color: theme.textDim, fontSize: 14 }}>
          {searchTerm ? "No contractors match your search." : "No contractors found. Add contractors to your property contacts."}
        </div>
      )}

      {/* Contractor Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 14 }}>
        {filtered.map((c) => {
          const isActive = c.projects.some((p) => p.dealStage === "renovating");
          return (
            <div key={c.name} onClick={() => setSelectedContractor(c.name)}
              style={{ background: theme.card, border: `1px solid ${isActive ? `${theme.orange}40` : theme.cardBorder}`, borderRadius: 8, padding: 16, cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{c.name}</div>
                  {c.company && <div style={{ fontSize: 11, color: theme.textDim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</div>}
                </div>
                {isActive && <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 4, fontWeight: 600, background: `${theme.orange}20`, color: theme.orange }}>ACTIVE</span>}
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                {c.profession && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, fontWeight: 500, background: `${theme.accent}12`, color: theme.accent }}>{c.profession}</span>}
                {c.dailyRate && <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 4, fontWeight: 500, background: theme.input, color: theme.textDim }}>{fmt(c.dailyRate)}/day</span>}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: theme.textDim, paddingTop: 10, borderTop: `1px solid ${theme.cardBorder}` }}>
                <span>{c.projects.length} project{c.projects.length !== 1 ? "s" : ""}</span>
                <span>{c.totalDaysWorked} days worked</span>
                <span style={{ color: theme.green, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(c.totalEarned)}</span>
              </div>

              <div style={{ marginTop: 8, fontSize: 11, color: theme.accent, fontWeight: 600 }}>View Profile &rarr;</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Helpers ───
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: theme.textDim, fontSize: 12 }}>{label}</span>
      <span style={{ color: theme.text, fontWeight: 500, fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit" }}>{value}</span>
    </div>
  );
}

function KPI({ label, value, color = theme.text }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: theme.input, borderRadius: 6, padding: "10px 14px", flex: 1, minWidth: 130, border: `1px solid ${theme.inputBorder}` }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    </div>
  );
}
