"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { theme, fmt } from "../../components/theme";
import useOrgContext from "../../hooks/useOrgContext";

type ContactRole =
  | "agent"
  | "contractor"
  | "attorney"
  | "bank"
  | "inspector"
  | "architect"
  | "municipality"
  | "tenant"
  | "buyer"
  | "seller"
  | "other";

interface Contact {
  id: string;
  name: string;
  role: ContactRole;
  company?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  profession?: string | null;
  dailyRate?: number | null;
  bankName?: string | null;
  accountNumber?: string | null;
  branchCode?: string | null;
  accountType?: string | null;
  dealContacts?: { deal: { id: string; name: string } }[];
}

const ROLES: { value: ContactRole; label: string }[] = [
  { value: "agent", label: "Agent" },
  { value: "contractor", label: "Contractor" },
  { value: "attorney", label: "Attorney" },
  { value: "bank", label: "Bank" },
  { value: "inspector", label: "Inspector" },
  { value: "architect", label: "Architect" },
  { value: "municipality", label: "Municipality" },
  { value: "tenant", label: "Tenant" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "other", label: "Other" },
];

const ROLE_COLORS: Record<ContactRole, string> = {
  agent: "#3B82F6",
  contractor: "#F59E0B",
  attorney: "#8B5CF6",
  bank: "#22C55E",
  inspector: "#EF4444",
  architect: "#06B6D4",
  municipality: "#EC4899",
  tenant: "#14B8A6",
  buyer: "#22C55E",
  seller: "#F97316",
  other: "#6B7280",
};

const zarFmt = (n: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(n);

const emptyForm = {
  name: "",
  role: "other" as ContactRole,
  company: "",
  phone: "",
  email: "",
  notes: "",
  profession: "",
  dailyRate: 0,
  bankName: "",
  accountNumber: "",
  branchCode: "",
  accountType: "",
};

export default function ContactsPage() {
  const router = useRouter();
  const { role, hasPermission } = useOrgContext();
  const canWriteContacts = hasPermission("contacts:write");
  const pageHeading = role === "finance_manager" ? "Customers" : role === "project_manager" ? "Contacts & Contractors" : role === "site_supervisor" ? "Site Contacts" : "Contacts";
  const pageSubtitle = role === "finance_manager" ? "customers" : role === "project_manager" ? "contacts & contractors" : role === "site_supervisor" ? "site contacts" : "contacts";
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<ContactRole | "all">(role === "finance_manager" ? "all" : "all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchContacts = async () => {
    try {
      const res = await fetch("/api/contacts");
      if (!res.ok) throw new Error("Failed to load contacts");
      const json = await res.json();
      setContacts(json.data || json);
    } catch {
      setError("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
  }, []);

  const filtered = useMemo(() => {
    let result = contacts;
    if (roleFilter !== "all") {
      result = result.filter((c) => c.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.company || "").toLowerCase().includes(q) ||
          (c.email || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [contacts, roleFilter, search]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of contacts) {
      counts[c.role] = (counts[c.role] || 0) + 1;
    }
    return counts;
  }, [contacts]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
      };
      if (form.company.trim()) body.company = form.company.trim();
      if (form.phone.trim()) body.phone = form.phone.trim();
      if (form.email.trim()) body.email = form.email.trim();
      if (form.notes.trim()) body.notes = form.notes.trim();
      if (form.role === "contractor") {
        if (form.profession.trim()) body.profession = form.profession.trim();
        if (form.dailyRate > 0) body.dailyRate = form.dailyRate;
        if (form.bankName.trim()) body.bankName = form.bankName.trim();
        if (form.accountNumber.trim()) body.accountNumber = form.accountNumber.trim();
        if (form.branchCode.trim()) body.branchCode = form.branchCode.trim();
        if (form.accountType.trim()) body.accountType = form.accountType.trim();
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to create contact");
      const json = await res.json();
      setContacts((prev) => [...prev, json.data || json]);
      setForm({ ...emptyForm });
      setShowAddForm(false);
    } catch {
      setError("Failed to create contact");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: 40, color: theme.textDim }}>Loading contacts...</div>
    );
  }

  return (
    <div style={{ padding: 28, maxWidth: 1200 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: "0 0 4px" }}>
            {pageHeading}
          </h1>
          <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>
            {contacts.length} {pageSubtitle} in your network
          </p>
        </div>
        {canWriteContacts && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            aria-expanded={showAddForm}
            aria-label={showAddForm ? "Cancel adding contact" : "Add new contact"}
            style={{
              background: showAddForm ? theme.red : theme.accent,
              color: "#fff",
              border: "none",
              borderRadius: 6,
              padding: "8px 16px",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              minHeight: 36,
            }}
          >
            {showAddForm ? "Cancel" : "+ Add Contact"}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          style={{
            background: `${theme.red}15`,
            border: `1px solid ${theme.red}40`,
            borderRadius: 6,
            padding: "10px 14px",
            marginBottom: 16,
            fontSize: 12,
            color: theme.red,
          }}
        >
          {error}
        </div>
      )}

      {/* Add Contact Form */}
      {canWriteContacts && showAddForm && (
        <div
          style={{
            background: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 8,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: theme.text,
              margin: "0 0 16px",
            }}
          >
            New Contact
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <FormField
              label="Name *"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
              placeholder="Full name"
            />
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 11,
                  color: theme.textDim,
                  marginBottom: 4,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  fontWeight: 500,
                }}
              >
                Role
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as ContactRole })}
                style={{
                  width: "100%",
                  background: theme.input,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 6,
                  padding: "8px 10px",
                  color: theme.text,
                  fontSize: 13,
                  outline: "none",
                  minHeight: 38,
                }}
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <FormField
              label="Company"
              value={form.company}
              onChange={(v) => setForm({ ...form, company: v })}
              placeholder="Company name"
            />
            <FormField
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
              placeholder="+27 ..."
            />
            <FormField
              label="Email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
              placeholder="email@example.com"
            />
            <FormField
              label="Notes"
              value={form.notes}
              onChange={(v) => setForm({ ...form, notes: v })}
              placeholder="Additional notes"
            />
          </div>

          {/* Contractor-specific fields */}
          {form.role === "contractor" && (
            <>
              <div
                style={{
                  height: 1,
                  background: theme.cardBorder,
                  margin: "16px 0",
                }}
              />
              <h4
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: theme.textDim,
                  textTransform: "uppercase",
                  letterSpacing: 0.8,
                  margin: "0 0 12px",
                }}
              >
                Contractor Details
              </h4>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <FormField
                  label="Profession"
                  value={form.profession}
                  onChange={(v) => setForm({ ...form, profession: v })}
                  placeholder="e.g. Plumber, Electrician"
                />
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: theme.textDim,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      fontWeight: 500,
                    }}
                  >
                    Daily Rate
                  </label>
                  <input
                    type="number"
                    value={form.dailyRate || ""}
                    onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })}
                    placeholder="0"
                    style={{
                      width: "100%",
                      background: theme.input,
                      border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: theme.text,
                      fontSize: 13,
                      outline: "none",
                      minHeight: 38,
                      fontFamily: "'JetBrains Mono', monospace",
                      boxSizing: "border-box",
                    }}
                  />
                </div>
                <FormField
                  label="Bank Name"
                  value={form.bankName}
                  onChange={(v) => setForm({ ...form, bankName: v })}
                  placeholder="e.g. FNB, Standard Bank"
                />
                <FormField
                  label="Account Number"
                  value={form.accountNumber}
                  onChange={(v) => setForm({ ...form, accountNumber: v })}
                  placeholder="Account number"
                />
                <FormField
                  label="Branch Code"
                  value={form.branchCode}
                  onChange={(v) => setForm({ ...form, branchCode: v })}
                  placeholder="Branch code"
                />
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: theme.textDim,
                      marginBottom: 4,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      fontWeight: 500,
                    }}
                  >
                    Account Type
                  </label>
                  <select
                    value={form.accountType}
                    onChange={(e) => setForm({ ...form, accountType: e.target.value })}
                    style={{
                      width: "100%",
                      background: theme.input,
                      border: `1px solid ${theme.inputBorder}`,
                      borderRadius: 6,
                      padding: "8px 10px",
                      color: theme.text,
                      fontSize: 13,
                      outline: "none",
                      minHeight: 38,
                    }}
                  >
                    <option value="">Select type</option>
                    <option value="cheque">Cheque</option>
                    <option value="savings">Savings</option>
                    <option value="transmission">Transmission</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button
              onClick={() => {
                setShowAddForm(false);
                setForm({ ...emptyForm });
              }}
              style={{
                background: "transparent",
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                color: theme.textDim,
                cursor: "pointer",
                minHeight: 36,
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !form.name.trim()}
              style={{
                background: !form.name.trim() ? theme.inputBorder : theme.accent,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: !form.name.trim() ? "not-allowed" : "pointer",
                minHeight: 36,
                opacity: saving ? 0.6 : 1,
              }}
            >
              {saving ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: Search + Role Filter */}
      <div
        style={{
          display: "flex",
          gap: 10,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <input
          type="text"
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search contacts"
          style={{
            background: theme.input,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 6,
            padding: "8px 12px",
            color: theme.text,
            fontSize: 13,
            outline: "none",
            minWidth: 260,
            minHeight: 36,
            flex: "0 1 320px",
          }}
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as ContactRole | "all")}
          aria-label="Filter by role"
          style={{
            background: theme.input,
            border: `1px solid ${theme.inputBorder}`,
            borderRadius: 6,
            padding: "8px 10px",
            color: theme.text,
            fontSize: 12,
            cursor: "pointer",
            minHeight: 36,
          }}
        >
          <option value="all">All Roles ({contacts.length})</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label} ({roleCounts[r.value] || 0})
            </option>
          ))}
        </select>
      </div>

      {/* Role Chips */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
        <button
          onClick={() => setRoleFilter("all")}
          style={{
            background: roleFilter === "all" ? theme.accent : theme.input,
            color: roleFilter === "all" ? "#fff" : theme.textDim,
            border: `1px solid ${roleFilter === "all" ? theme.accent : theme.inputBorder}`,
            borderRadius: 16,
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          All
        </button>
        {ROLES.map((r) => {
          const count = roleCounts[r.value] || 0;
          if (count === 0) return null;
          const active = roleFilter === r.value;
          const color = ROLE_COLORS[r.value];
          return (
            <button
              key={r.value}
              onClick={() => setRoleFilter(active ? "all" : r.value)}
              style={{
                background: active ? `${color}20` : theme.input,
                color: active ? color : theme.textDim,
                border: `1px solid ${active ? `${color}50` : theme.inputBorder}`,
                borderRadius: 16,
                padding: "4px 12px",
                fontSize: 11,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {r.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div
          style={{
            padding: 60,
            textAlign: "center",
            color: theme.textDim,
            fontSize: 14,
          }}
        >
          {search || roleFilter !== "all"
            ? "No contacts match your filters."
            : "No contacts yet. Add your first contact above."}
        </div>
      )}

      {/* Contact Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 14,
        }}
      >
        {filtered.map((contact) => {
          const roleColor = ROLE_COLORS[contact.role] || theme.textDim;
          const initials = contact.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div
              key={contact.id}
              onClick={() => router.push(`/contacts/${contact.id}`)}
              role="button"
              tabIndex={0}
              aria-label={`${contact.name}, ${contact.role}${contact.company ? `, ${contact.company}` : ""}`}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") router.push(`/contacts/${contact.id}`); }}
              style={{
                background: theme.card,
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: 8,
                padding: 16,
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {/* Top row: avatar + name + role badge */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: `${roleColor}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 14,
                    fontWeight: 700,
                    color: roleColor,
                    flexShrink: 0,
                  }}
                >
                  {initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      color: theme.text,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {contact.name}
                  </div>
                  {contact.company && (
                    <div
                      style={{
                        fontSize: 11,
                        color: theme.textDim,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {contact.company}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    fontSize: 9,
                    padding: "3px 8px",
                    borderRadius: 4,
                    fontWeight: 600,
                    background: `${roleColor}15`,
                    color: roleColor,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    flexShrink: 0,
                  }}
                >
                  {contact.role}
                </span>
              </div>

              {/* Contact details */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  fontSize: 12,
                  color: theme.textDim,
                  marginBottom: 10,
                }}
              >
                {contact.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, textAlign: "center", fontSize: 11, flexShrink: 0 }}>
                      T
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {contact.phone}
                    </span>
                  </div>
                )}
                {contact.email && (
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 14, textAlign: "center", fontSize: 11, flexShrink: 0 }}>
                      @
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {contact.email}
                    </span>
                  </div>
                )}
              </div>

              {/* Contractor extras */}
              {contact.role === "contractor" && contact.profession && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                  <span
                    style={{
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: `${theme.accent}12`,
                      color: theme.accent,
                      fontWeight: 500,
                    }}
                  >
                    {contact.profession}
                  </span>
                  {contact.dailyRate != null && contact.dailyRate > 0 && (
                    <span
                      style={{
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        background: theme.input,
                        color: theme.textDim,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {zarFmt(contact.dailyRate)}/day
                    </span>
                  )}
                </div>
              )}

              {/* Footer: deal count */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTop: `1px solid ${theme.cardBorder}`,
                  fontSize: 11,
                }}
              >
                <span style={{ color: theme.textDim }}>
                  {contact.dealContacts?.length || 0} deal
                  {(contact.dealContacts?.length || 0) !== 1 ? "s" : ""}
                </span>
                <span style={{ color: theme.accent, fontWeight: 600 }}>View Profile &rarr;</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- Helpers ----

function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = `contact-field-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  const isRequired = label.includes("*");
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 11,
          color: theme.textDim,
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.8,
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-required={isRequired || undefined}
        style={{
          width: "100%",
          background: theme.input,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 6,
          padding: "8px 10px",
          color: theme.text,
          fontSize: 13,
          outline: "none",
          minHeight: 38,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
