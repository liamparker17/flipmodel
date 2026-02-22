"use client";

import { useState, useEffect } from "react";

const theme = {
  bg: "#0B0E13", card: "#12151C", cardBorder: "#1C2030", accent: "#3B82F6",
  text: "#E2E4E9", textDim: "#6B7280", input: "#161A24", inputBorder: "#252B3B",
  green: "#22C55E", red: "#EF4444",
};

const ROLES = [
  { key: "owner", label: "Owner", desc: "Full access to everything" },
  { key: "admin", label: "Admin", desc: "Manage deals, expenses, and team" },
  { key: "manager", label: "Manager", desc: "Manage deals and expenses" },
  { key: "field_worker", label: "Field Worker", desc: "Update tasks, log expenses, checkout tools" },
  { key: "viewer", label: "Viewer", desc: "View-only access" },
];

export default function TeamPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("viewer");
  const [inviteSent, setInviteSent] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const handleInvite = () => {
    if (!inviteEmail) return;
    // Placeholder — will be implemented with team management API
    setInviteSent(true);
    setInviteEmail("");
    setTimeout(() => setInviteSent(false), 3000);
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", background: theme.input,
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, marginBottom: 20 }}>Team Management</h1>

      {/* Invite Section */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 12 }}>Invite Team Member</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 200 }}
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="colleague@example.com"
          />
          <select style={{ ...inputStyle, width: 140, cursor: "pointer" }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
            {ROLES.filter((r) => r.key !== "owner").map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
          <button onClick={handleInvite} style={{
            padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
            borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>Send Invite</button>
        </div>
        {inviteSent && (
          <div style={{ marginTop: 8, fontSize: 12, color: theme.green }}>
            Invite sent! (Team invitations will be enabled in a future update)
          </div>
        )}
      </div>

      {/* Roles Guide */}
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Role Permissions</div>
        <div style={{ display: "grid", gap: 12 }}>
          {ROLES.map((role) => (
            <div key={role.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${theme.cardBorder}08` }}>
              <div style={{
                width: 8, height: 8, borderRadius: "50%",
                background: role.key === "owner" ? theme.green : role.key === "admin" ? theme.accent : theme.textDim,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{role.label}</div>
                <div style={{ fontSize: 12, color: theme.textDim }}>{role.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
