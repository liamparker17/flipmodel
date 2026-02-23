"use client";

import { useState, useEffect, useCallback } from "react";
import { theme } from "../../components/theme";
import useOrgContext from "@/hooks/useOrgContext";
import { ORG_ROLE_LABELS, ORG_ROLE_DESCRIPTIONS } from "@/types/org";
import type { OrgRole } from "@/types/org";

interface MemberData {
  id: string;
  role: string;
  title: string | null;
  departmentId: string | null;
  isActive: boolean;
  joinedAt: string;
  moduleOverrides: Record<string, boolean> | null;
  permissionOverrides: Record<string, boolean> | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  department: { id: string; name: string } | null;
}

interface DepartmentData {
  id: string;
  name: string;
  parentId: string | null;
}

const ROLES: OrgRole[] = ["executive", "finance_manager", "project_manager", "site_supervisor", "field_worker", "viewer"];

export default function TeamPage() {
  const [isMobile, setIsMobile] = useState(false);
  const { hasPermission, role: currentRole } = useOrgContext();

  const [members, setMembers] = useState<MemberData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<OrgRole>("viewer");
  const [inviteDept, setInviteDept] = useState("");
  const [inviteTitle, setInviteTitle] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  // Department form
  const [newDeptName, setNewDeptName] = useState("");

  // Active tab
  const [tab, setTab] = useState<"members" | "departments" | "roles">("members");

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check(); window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [membersRes, deptsRes] = await Promise.all([
        fetch("/api/org/members"),
        fetch("/api/org/departments"),
      ]);
      if (membersRes.ok) setMembers(await membersRes.json());
      if (deptsRes.ok) setDepartments(await deptsRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canManage = hasPermission("team:manage");

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviteMsg("");
    try {
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          departmentId: inviteDept || undefined,
          title: inviteTitle || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteMsg("Member added successfully");
        setInviteEmail("");
        setInviteTitle("");
        fetchData();
      } else {
        setInviteMsg(data.error || "Failed to add member");
      }
    } catch {
      setInviteMsg("Failed to add member");
    }
  };

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, role: newRole }),
    });
    fetchData();
  };

  const handleDeactivate = async (memberId: string) => {
    if (!window.confirm("Remove this member from the organisation?")) return;
    await fetch(`/api/org/members?memberId=${memberId}`, { method: "DELETE" });
    fetchData();
  };

  const handleAddDept = async () => {
    if (!newDeptName) return;
    const res = await fetch("/api/org/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newDeptName }),
    });
    if (res.ok) {
      setNewDeptName("");
      fetchData();
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!window.confirm("Delete this department?")) return;
    await fetch(`/api/org/departments?id=${id}`, { method: "DELETE" });
    fetchData();
  };

  const inputStyle: React.CSSProperties = {
    padding: "8px 12px", background: theme.input,
    border: `1px solid ${theme.inputBorder}`, borderRadius: 6, color: theme.text,
    fontSize: 13, outline: "none", boxSizing: "border-box",
  };

  if (loading) return <div style={{ padding: 40, color: theme.textDim }}>Loading...</div>;

  return (
    <div style={{ padding: isMobile ? 16 : 28, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: theme.text, margin: 0, marginBottom: 20 }}>Team Management</h1>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {(["members", "departments", "roles"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? theme.accent : "transparent",
            color: tab === t ? "#000" : theme.textDim,
            border: tab === t ? "none" : `1px solid ${theme.cardBorder}`,
            borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: tab === t ? 600 : 400,
            cursor: "pointer", textTransform: "capitalize",
          }}>{t}</button>
        ))}
      </div>

      {tab === "members" && (
        <>
          {/* Invite Section */}
          {canManage && (
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 12 }}>Add Team Member</div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle }} type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" />
                <select style={{ ...inputStyle, cursor: "pointer" }} value={inviteRole} onChange={(e) => setInviteRole(e.target.value as OrgRole)}>
                  {ROLES.filter((r) => r !== "executive" || currentRole === "executive").map((r) => (
                    <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <input style={{ ...inputStyle }} type="text" value={inviteTitle} onChange={(e) => setInviteTitle(e.target.value)} placeholder="Job title (optional)" />
                <select style={{ ...inputStyle, cursor: "pointer" }} value={inviteDept} onChange={(e) => setInviteDept(e.target.value)}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button onClick={handleInvite} style={{
                padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
                borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Add Member</button>
              {inviteMsg && <div style={{ marginTop: 8, fontSize: 12, color: inviteMsg.includes("success") ? theme.green : theme.red }}>{inviteMsg}</div>}
            </div>
          )}

          {/* Member List */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Members ({members.filter((m) => m.isActive).length})</div>
            {members.filter((m) => m.isActive).map((m) => (
              <div key={m.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 0", borderBottom: `1px solid ${theme.cardBorder}10`, gap: 12,
                flexWrap: "wrap",
              }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>{m.user.name || m.user.email}</div>
                  <div style={{ fontSize: 12, color: theme.textDim }}>{m.user.email}{m.title ? ` - ${m.title}` : ""}</div>
                  {m.department && <div style={{ fontSize: 11, color: theme.accent }}>{m.department.name}</div>}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {canManage ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value as OrgRole)}
                      style={{ ...inputStyle, width: 160, cursor: "pointer", fontSize: 12 }}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>)}
                    </select>
                  ) : (
                    <span style={{ fontSize: 12, color: theme.textDim, background: theme.input, padding: "4px 10px", borderRadius: 4 }}>
                      {ORG_ROLE_LABELS[m.role as OrgRole] || m.role}
                    </span>
                  )}
                  {canManage && (
                    <button onClick={() => handleDeactivate(m.id)} style={{
                      background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 4,
                      padding: "4px 8px", color: theme.red, fontSize: 11, cursor: "pointer",
                    }}>Remove</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "departments" && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Departments</div>
          {canManage && (
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <input style={{ ...inputStyle, flex: 1 }} value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} placeholder="Department name" />
              <button onClick={handleAddDept} style={{
                padding: "8px 16px", background: theme.accent, color: "#fff", border: "none",
                borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>Add</button>
            </div>
          )}
          {departments.length === 0 ? (
            <div style={{ fontSize: 12, color: theme.textDim }}>No departments yet</div>
          ) : (
            departments.map((d) => (
              <div key={d.id} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid ${theme.cardBorder}10`,
              }}>
                <span style={{ fontSize: 13, color: theme.text }}>{d.name}</span>
                {canManage && (
                  <button onClick={() => handleDeleteDept(d.id)} style={{
                    background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 4,
                    padding: "4px 8px", color: theme.red, fontSize: 11, cursor: "pointer",
                  }}>Delete</button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "roles" && (
        <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Role Definitions</div>
          <div style={{ display: "grid", gap: 12 }}>
            {ROLES.map((role) => (
              <div key={role} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${theme.cardBorder}08` }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: role === "executive" ? theme.green : role === "finance_manager" ? theme.accent : theme.textDim,
                }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: theme.text }}>{ORG_ROLE_LABELS[role]}</div>
                  <div style={{ fontSize: 12, color: theme.textDim }}>{ORG_ROLE_DESCRIPTIONS[role]}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
