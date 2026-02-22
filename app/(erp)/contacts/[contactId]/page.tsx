"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { theme } from "../../../components/theme";

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

interface DealLink {
  deal: { id: string; name: string };
}

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
  dealContacts?: DealLink[];
  createdAt?: string;
  updatedAt?: string;
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

export default function ContactDetailPage() {
  const router = useRouter();
  const params = useParams();
  const contactId = params.contactId as string;

  const [contact, setContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [form, setForm] = useState({
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
  });

  useEffect(() => {
    const fetchContact = async () => {
      try {
        const res = await fetch("/api/contacts");
        if (!res.ok) throw new Error("Failed to load contacts");
        const json = await res.json();
        const list: Contact[] = json.data || json;
        const found = list.find((c) => c.id === contactId);
        if (!found) {
          setError("Contact not found");
          setLoading(false);
          return;
        }
        setContact(found);
        populateForm(found);
      } catch {
        setError("Failed to load contact");
      } finally {
        setLoading(false);
      }
    };
    fetchContact();
  }, [contactId]);

  const populateForm = (c: Contact) => {
    setForm({
      name: c.name || "",
      role: c.role || "other",
      company: c.company || "",
      phone: c.phone || "",
      email: c.email || "",
      notes: c.notes || "",
      profession: c.profession || "",
      dailyRate: c.dailyRate || 0,
      bankName: c.bankName || "",
      accountNumber: c.accountNumber || "",
      branchCode: c.branchCode || "",
      accountType: c.accountType || "",
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        role: form.role,
        company: form.company.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        profession: form.profession.trim() || null,
        dailyRate: form.dailyRate > 0 ? form.dailyRate : null,
        bankName: form.bankName.trim() || null,
        accountNumber: form.accountNumber.trim() || null,
        branchCode: form.branchCode.trim() || null,
        accountType: form.accountType.trim() || null,
      };

      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update contact");
      const json = await res.json();
      const updated = json.data || json;
      setContact({ ...contact, ...updated, dealContacts: contact?.dealContacts });
      setEditing(false);
    } catch {
      setError("Failed to update contact");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete contact");
      router.push("/contacts");
    } catch {
      setError("Failed to delete contact");
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    if (contact) populateForm(contact);
    setEditing(false);
  };

  if (loading) {
    return <div style={{ padding: 40, color: theme.textDim }}>Loading contact...</div>;
  }

  if (!contact) {
    return (
      <div style={{ padding: 40 }}>
        <button
          onClick={() => router.push("/contacts")}
          style={{
            background: "transparent",
            border: "none",
            color: theme.accent,
            fontSize: 12,
            cursor: "pointer",
            padding: 0,
            marginBottom: 16,
          }}
        >
          &larr; Back to Contacts
        </button>
        <div style={{ color: theme.red, fontSize: 14 }}>{error || "Contact not found"}</div>
      </div>
    );
  }

  const roleColor = ROLE_COLORS[contact.role] || theme.textDim;
  const initials = contact.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const isContractor = editing ? form.role === "contractor" : contact.role === "contractor";
  const dealLinks = contact.dealContacts || [];

  return (
    <div style={{ padding: 28, maxWidth: 900 }}>
      {/* Back Button */}
      <button
        onClick={() => router.push("/contacts")}
        style={{
          background: "transparent",
          border: "none",
          color: theme.accent,
          fontSize: 12,
          cursor: "pointer",
          padding: 0,
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        &larr; All Contacts
      </button>

      {error && (
        <div
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

      {/* Profile Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: `${roleColor}20`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 22,
            fontWeight: 700,
            color: roleColor,
            flexShrink: 0,
          }}
        >
          {initials}
        </div>
        <div style={{ flex: 1 }}>
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: theme.text,
              margin: "0 0 4px",
            }}
          >
            {contact.name}
          </h1>
          {contact.company && (
            <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 4 }}>
              {contact.company}
            </div>
          )}
          <span
            style={{
              fontSize: 10,
              padding: "3px 10px",
              borderRadius: 4,
              fontWeight: 600,
              background: `${roleColor}15`,
              color: roleColor,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              display: "inline-block",
            }}
          >
            {contact.role}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {!editing ? (
            <>
              <button
                onClick={() => setEditing(true)}
                style={{
                  background: theme.accent,
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
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  background: "transparent",
                  border: `1px solid ${theme.red}50`,
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.red,
                  cursor: "pointer",
                  minHeight: 36,
                }}
              >
                Delete
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleCancelEdit}
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
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                style={{
                  background: theme.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 6,
                  padding: "8px 16px",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: saving ? "not-allowed" : "pointer",
                  minHeight: 36,
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          style={{
            background: `${theme.red}10`,
            border: `1px solid ${theme.red}40`,
            borderRadius: 8,
            padding: 16,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: theme.red, marginBottom: 4 }}>
              Delete this contact?
            </div>
            <div style={{ fontSize: 12, color: theme.textDim }}>
              This action cannot be undone. The contact will be permanently removed.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
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
              onClick={handleDelete}
              disabled={deleting}
              style={{
                background: theme.red,
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "8px 16px",
                fontSize: 12,
                fontWeight: 600,
                cursor: deleting ? "not-allowed" : "pointer",
                minHeight: 36,
                opacity: deleting ? 0.6 : 1,
              }}
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </button>
          </div>
        </div>
      )}

      {/* Contact Details + Contractor Banking Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isContractor ? "1fr 1fr" : "1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Contact Details Card */}
        <div
          style={{
            background: theme.card,
            border: `1px solid ${theme.cardBorder}`,
            borderRadius: 8,
            padding: 16,
          }}
        >
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.textDim,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              margin: "0 0 14px",
            }}
          >
            Contact Details
          </h3>
          {editing ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <EditField
                label="Name"
                value={form.name}
                onChange={(v) => setForm({ ...form, name: v })}
              />
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 10,
                    color: theme.textDim,
                    marginBottom: 3,
                    textTransform: "uppercase",
                    letterSpacing: 0.6,
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
                    padding: "7px 10px",
                    color: theme.text,
                    fontSize: 12,
                    outline: "none",
                    minHeight: 34,
                  }}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <EditField
                label="Company"
                value={form.company}
                onChange={(v) => setForm({ ...form, company: v })}
              />
              <EditField
                label="Phone"
                value={form.phone}
                onChange={(v) => setForm({ ...form, phone: v })}
              />
              <EditField
                label="Email"
                value={form.email}
                onChange={(v) => setForm({ ...form, email: v })}
              />
              <EditField
                label="Notes"
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
              />
              {form.role === "contractor" && (
                <>
                  <EditField
                    label="Profession"
                    value={form.profession}
                    onChange={(v) => setForm({ ...form, profession: v })}
                  />
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 10,
                        color: theme.textDim,
                        marginBottom: 3,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        fontWeight: 500,
                      }}
                    >
                      Daily Rate
                    </label>
                    <input
                      type="number"
                      value={form.dailyRate || ""}
                      onChange={(e) => setForm({ ...form, dailyRate: Number(e.target.value) })}
                      style={{
                        width: "100%",
                        background: theme.input,
                        border: `1px solid ${theme.inputBorder}`,
                        borderRadius: 6,
                        padding: "7px 10px",
                        color: theme.text,
                        fontSize: 12,
                        outline: "none",
                        minHeight: 34,
                        fontFamily: "'JetBrains Mono', monospace",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <DetailRow label="Name" value={contact.name} />
              {contact.company && <DetailRow label="Company" value={contact.company} />}
              {contact.phone && <DetailRow label="Phone" value={contact.phone} />}
              {contact.email && <DetailRow label="Email" value={contact.email} />}
              {contact.notes && <DetailRow label="Notes" value={contact.notes} />}
              {isContractor && contact.profession && (
                <DetailRow label="Profession" value={contact.profession} />
              )}
              {isContractor && contact.dailyRate != null && contact.dailyRate > 0 && (
                <DetailRow label="Daily Rate" value={zarFmt(contact.dailyRate)} mono />
              )}
            </div>
          )}
        </div>

        {/* Banking Details Card (contractors only) */}
        {isContractor && (
          <div
            style={{
              background: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <h3
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: theme.textDim,
                textTransform: "uppercase",
                letterSpacing: 0.8,
                margin: "0 0 14px",
              }}
            >
              Banking Details
            </h3>
            {editing ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <EditField
                  label="Bank Name"
                  value={form.bankName}
                  onChange={(v) => setForm({ ...form, bankName: v })}
                />
                <EditField
                  label="Account Number"
                  value={form.accountNumber}
                  onChange={(v) => setForm({ ...form, accountNumber: v })}
                />
                <EditField
                  label="Branch Code"
                  value={form.branchCode}
                  onChange={(v) => setForm({ ...form, branchCode: v })}
                />
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 10,
                      color: theme.textDim,
                      marginBottom: 3,
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
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
                      padding: "7px 10px",
                      color: theme.text,
                      fontSize: 12,
                      outline: "none",
                      minHeight: 34,
                    }}
                  >
                    <option value="">Select type</option>
                    <option value="cheque">Cheque</option>
                    <option value="savings">Savings</option>
                    <option value="transmission">Transmission</option>
                  </select>
                </div>
              </div>
            ) : contact.bankName ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                <DetailRow label="Bank" value={contact.bankName} />
                {contact.accountNumber && (
                  <DetailRow label="Account" value={contact.accountNumber} mono />
                )}
                {contact.branchCode && (
                  <DetailRow label="Branch Code" value={contact.branchCode} mono />
                )}
                {contact.accountType && (
                  <DetailRow
                    label="Type"
                    value={contact.accountType.charAt(0).toUpperCase() + contact.accountType.slice(1)}
                  />
                )}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: theme.textDim, padding: "12px 0" }}>
                No banking details recorded
              </div>
            )}
          </div>
        )}
      </div>

      {/* Deal History */}
      <div
        style={{
          background: theme.card,
          border: `1px solid ${theme.cardBorder}`,
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${theme.cardBorder}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h3
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: theme.textDim,
              textTransform: "uppercase",
              letterSpacing: 0.8,
              margin: 0,
            }}
          >
            Deal History
          </h3>
          <span
            style={{
              fontSize: 10,
              color: theme.textDim,
              fontWeight: 500,
            }}
          >
            {dealLinks.length} deal{dealLinks.length !== 1 ? "s" : ""}
          </span>
        </div>
        {dealLinks.length === 0 ? (
          <div
            style={{
              padding: "32px 16px",
              textAlign: "center",
              fontSize: 12,
              color: theme.textDim,
            }}
          >
            No deals linked to this contact yet.
          </div>
        ) : (
          <div>
            {dealLinks.map((dl) => (
              <div
                key={dl.deal.id}
                onClick={() => router.push(`/pipeline/${dl.deal.id}`)}
                style={{
                  padding: "12px 16px",
                  borderBottom: `1px solid ${theme.cardBorder}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  transition: "background 0.1s",
                }}
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>
                    {dl.deal.name}
                  </div>
                </div>
                <span style={{ fontSize: 11, color: theme.accent, fontWeight: 600 }}>
                  View Deal &rarr;
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Helpers ----

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ color: theme.textDim, fontSize: 12 }}>{label}</span>
      <span
        style={{
          color: theme.text,
          fontWeight: 500,
          fontFamily: mono ? "'JetBrains Mono', monospace" : "inherit",
          textAlign: "right",
          maxWidth: "60%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 10,
          color: theme.textDim,
          marginBottom: 3,
          textTransform: "uppercase",
          letterSpacing: 0.6,
          fontWeight: 500,
        }}
      >
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          background: theme.input,
          border: `1px solid ${theme.inputBorder}`,
          borderRadius: 6,
          padding: "7px 10px",
          color: theme.text,
          fontSize: 12,
          outline: "none",
          minHeight: 34,
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
