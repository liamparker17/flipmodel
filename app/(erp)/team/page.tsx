"use client";

import { useState, useEffect, useCallback } from "react";
import { theme } from "../../components/theme";
import useOrgContext from "@/hooks/useOrgContext";
import { ORG_ROLE_LABELS, ORG_ROLE_DESCRIPTIONS } from "@/types/org";
import type { OrgRole, Permission, ModuleKey } from "@/types/org";
import { DEFAULT_ROLE_PERMISSIONS, DEFAULT_ROLE_MODULES } from "@/lib/permissions";

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

const PERMISSION_GROUPS: { label: string; permissions: Permission[] }[] = [
  { label: "Deals", permissions: ["deals:read", "deals:write", "deals:delete"] },
  { label: "Expenses", permissions: ["expenses:read", "expenses:write", "expenses:approve"] },
  { label: "Milestones", permissions: ["milestones:read", "milestones:write"] },
  { label: "Tasks", permissions: ["tasks:read", "tasks:write"] },
  { label: "Contacts", permissions: ["contacts:read", "contacts:write"] },
  { label: "Tools", permissions: ["tools:read", "tools:write", "tools:checkout"] },
  { label: "Documents", permissions: ["documents:read", "documents:write"] },
  { label: "Invoices", permissions: ["invoices:read", "invoices:write"] },
  { label: "Reports", permissions: ["reports:read"] },
  { label: "Team", permissions: ["team:read", "team:manage"] },
  { label: "Settings", permissions: ["settings:read", "settings:write"] },
  { label: "Accounting", permissions: ["accounting:read", "accounting:write"] },
  { label: "Organisation", permissions: ["org:read", "org:write"] },
  { label: "Shopping", permissions: ["shopping:read", "shopping:write"] },
  { label: "Activities", permissions: ["activities:read", "activities:write"] },
  { label: "Notifications", permissions: ["notifications:read", "notifications:write"] },
  { label: "Departments", permissions: ["departments:read", "departments:write"] },
];

const ALL_MODULES: ModuleKey[] = ["dashboard", "pipeline", "projects", "contacts", "finance", "invoices", "tools", "reports", "team", "accounting", "settings", "suppliers", "documents"];

const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard", pipeline: "Pipeline", projects: "Projects", contacts: "Contacts",
  finance: "Finance", invoices: "Invoices", tools: "Tools", reports: "Reports",
  team: "Team", accounting: "Accounting", settings: "Settings", suppliers: "Suppliers", documents: "Documents",
  gl: "General Ledger", payables: "Accounts Payable", receivables: "Accounts Receivable",
  purchase_orders: "Purchase Orders", inventory: "Inventory", banking: "Banking",
  hr: "Human Resources", payroll: "Payroll",
};

function formatPermission(perm: string): string {
  const [, action] = perm.split(":");
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export default function TeamPage() {
  const [isMobile, setIsMobile] = useState(false);
  const { hasPermission, role: currentRole, member: currentMember } = useOrgContext();

  const [members, setMembers] = useState<MemberData[]>([]);
  const [departments, setDepartments] = useState<DepartmentData[]>([]);
  const [loading, setLoading] = useState(true);

  // Create member form
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState<OrgRole>("viewer");
  const [createDept, setCreateDept] = useState("");
  const [createTitle, setCreateTitle] = useState("");
  const [createMsg, setCreateMsg] = useState("");
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  // Department form
  const [newDeptName, setNewDeptName] = useState("");

  // Active tab
  const [tab, setTab] = useState<"members" | "departments" | "roles">("members");

  // Permission editor state
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);

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
      if (membersRes.ok) {
        const membersJson = await membersRes.json();
        setMembers(membersJson.data ?? membersJson);
      }
      if (deptsRes.ok) {
        const deptsJson = await deptsRes.json();
        setDepartments(deptsJson.data ?? deptsJson);
      }
    } catch (e) { console.error("Failed to load team data:", e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const canManage = hasPermission("team:manage");

  const handleCreateMember = async () => {
    if (!createName || !createEmail) return;
    setCreateMsg("");
    setCreatedCredentials(null);
    try {
      const res = await fetch("/api/org/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          password: createPassword || undefined,
          role: createRole,
          departmentId: createDept || undefined,
          title: createTitle || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.credentials) {
          setCreatedCredentials(data.credentials);
          setCreateMsg("Account created! Share the login details below with the team member.");
        } else {
          setCreateMsg("Member added successfully");
        }
        setCreateName(""); setCreateEmail(""); setCreatePassword(""); setCreateTitle("");
        fetchData();
      } else {
        setCreateMsg(data.error || "Failed to add member");
      }
    } catch {
      setCreateMsg("Failed to add member");
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

  const handlePermissionToggle = async (member: MemberData, permission: Permission, granted: boolean) => {
    const roleDefaults = new Set<Permission>(DEFAULT_ROLE_PERMISSIONS[member.role as OrgRole] || []);
    const currentOverrides = { ...(member.permissionOverrides || {}) };

    // If the new value matches the role default, remove the override
    if (roleDefaults.has(permission) === granted) {
      delete currentOverrides[permission];
    } else {
      currentOverrides[permission] = granted;
    }

    await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: member.id,
        permissionOverrides: Object.keys(currentOverrides).length > 0 ? currentOverrides : null,
      }),
    });
    fetchData();
  };

  const handleModuleToggle = async (member: MemberData, mod: ModuleKey, granted: boolean) => {
    const roleDefaults = new Set<ModuleKey>(DEFAULT_ROLE_MODULES[member.role as OrgRole] || []);
    const currentOverrides = { ...(member.moduleOverrides || {}) };

    if (roleDefaults.has(mod) === granted) {
      delete currentOverrides[mod];
    } else {
      currentOverrides[mod] = granted;
    }

    await fetch("/api/org/members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: member.id,
        moduleOverrides: Object.keys(currentOverrides).length > 0 ? currentOverrides : null,
      }),
    });
    fetchData();
  };

  const getEffectivePermissions = (member: MemberData): Set<Permission> => {
    const defaults = new Set<Permission>(DEFAULT_ROLE_PERMISSIONS[member.role as OrgRole] || []);
    if (member.permissionOverrides) {
      for (const [perm, granted] of Object.entries(member.permissionOverrides)) {
        if (granted) defaults.add(perm as Permission);
        else defaults.delete(perm as Permission);
      }
    }
    return defaults;
  };

  const getEffectiveModules = (member: MemberData): Set<ModuleKey> => {
    const defaults = new Set<ModuleKey>(DEFAULT_ROLE_MODULES[member.role as OrgRole] || []);
    if (member.moduleOverrides) {
      for (const [mod, granted] of Object.entries(member.moduleOverrides)) {
        if (granted) defaults.add(mod as ModuleKey);
        else defaults.delete(mod as ModuleKey);
      }
    }
    return defaults;
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

  const activeMembers = members.filter((m) => m.isActive);

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
          {/* Create Member Section */}
          {canManage && (
            <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 4 }}>Create Team Member</div>
              <p style={{ fontSize: 11, color: theme.textDim, margin: "0 0 12px" }}>
                Create a login for your team member. They&apos;ll use these credentials to sign in.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <input style={{ ...inputStyle }} type="text" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Full name *" />
                <input style={{ ...inputStyle }} type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Email address *" />
                <input style={{ ...inputStyle }} type="text" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Password (auto-generated if empty)" />
                <select style={{ ...inputStyle, cursor: "pointer" }} value={createRole} onChange={(e) => setCreateRole(e.target.value as OrgRole)}>
                  {ROLES.filter((r) => r !== "executive" || currentRole === "executive").map((r) => (
                    <option key={r} value={r}>{ORG_ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <input style={{ ...inputStyle }} type="text" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Job title (optional)" />
                <select style={{ ...inputStyle, cursor: "pointer" }} value={createDept} onChange={(e) => setCreateDept(e.target.value)}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <button onClick={handleCreateMember} disabled={!createName || !createEmail} style={{
                padding: "8px 16px", background: (!createName || !createEmail) ? theme.input : theme.accent,
                color: (!createName || !createEmail) ? theme.textDim : "#fff", border: "none",
                borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: (!createName || !createEmail) ? "not-allowed" : "pointer",
              }}>Create Member</button>

              {createMsg && (
                <div style={{ marginTop: 10, fontSize: 12, color: createMsg.includes("created") || createMsg.includes("success") ? theme.green : theme.red }}>
                  {createMsg}
                </div>
              )}

              {/* Show created credentials */}
              {createdCredentials && (
                <div style={{
                  marginTop: 12, padding: 14, background: `${theme.green}10`, border: `1px solid ${theme.green}30`,
                  borderRadius: 8,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.green, marginBottom: 8 }}>
                    Login Credentials — share these with the team member
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 13 }}>
                    <span style={{ color: theme.textDim }}>Email:</span>
                    <span style={{ color: theme.text, fontFamily: "'JetBrains Mono', monospace", userSelect: "all" }}>{createdCredentials.email}</span>
                    <span style={{ color: theme.textDim }}>Password:</span>
                    <span style={{ color: theme.text, fontFamily: "'JetBrains Mono', monospace", userSelect: "all" }}>{createdCredentials.password}</span>
                  </div>
                  <p style={{ fontSize: 10, color: theme.textDim, margin: "8px 0 0" }}>
                    This password is shown once. The member can change it after logging in.
                  </p>
                  <button onClick={() => {
                    navigator.clipboard.writeText(`Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`);
                  }} style={{
                    marginTop: 8, padding: "5px 12px", background: "transparent", border: `1px solid ${theme.green}40`,
                    borderRadius: 4, fontSize: 11, color: theme.green, cursor: "pointer",
                  }}>
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Member List */}
          <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 16 }}>Members ({activeMembers.length})</div>
            {activeMembers.map((m) => {
              const isEditing = editingMemberId === m.id;
              const isSelf = m.user.id === currentMember?.userId;
              const effectivePerms = getEffectivePermissions(m);
              const effectiveModules = getEffectiveModules(m);

              return (
                <div key={m.id} style={{ borderBottom: `1px solid ${theme.cardBorder}15`, paddingBottom: isEditing ? 0 : 12, marginBottom: 12 }}>
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    gap: 12, flexWrap: "wrap",
                  }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>
                        {m.user.name || m.user.email}
                        {isSelf && <span style={{ fontSize: 10, color: theme.accent, marginLeft: 6 }}>(you)</span>}
                      </div>
                      <div style={{ fontSize: 12, color: theme.textDim }}>{m.user.email}{m.title ? ` · ${m.title}` : ""}</div>
                      {m.department && <div style={{ fontSize: 11, color: theme.accent }}>{m.department.name}</div>}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {canManage && !isSelf ? (
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
                      {canManage && !isSelf && (
                        <>
                          <button onClick={() => setEditingMemberId(isEditing ? null : m.id)} style={{
                            background: isEditing ? theme.accent : "transparent",
                            border: isEditing ? "none" : `1px solid ${theme.cardBorder}`,
                            borderRadius: 4, padding: "4px 8px",
                            color: isEditing ? "#000" : theme.textDim, fontSize: 11, cursor: "pointer",
                          }}>
                            {isEditing ? "Close" : "Permissions"}
                          </button>
                          <button onClick={() => handleDeactivate(m.id)} style={{
                            background: "transparent", border: `1px solid ${theme.red}30`, borderRadius: 4,
                            padding: "4px 8px", color: theme.red, fontSize: 11, cursor: "pointer",
                          }}>Remove</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Permission Editor */}
                  {isEditing && canManage && (
                    <div style={{ marginTop: 12, padding: 16, background: theme.input, borderRadius: 8, marginBottom: 12 }}>
                      {/* Module Access */}
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Module Access</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {ALL_MODULES.map((mod) => {
                            const isEnabled = effectiveModules.has(mod);
                            return (
                              <button key={mod} onClick={() => handleModuleToggle(m, mod, !isEnabled)} style={{
                                padding: "4px 10px", borderRadius: 4, fontSize: 11, cursor: "pointer",
                                background: isEnabled ? `${theme.green}20` : `${theme.red}10`,
                                border: `1px solid ${isEnabled ? theme.green : theme.red}30`,
                                color: isEnabled ? theme.green : theme.red,
                                fontWeight: 500,
                              }}>
                                {MODULE_LABELS[mod]}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Permission Toggles */}
                      <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Permissions</div>
                      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                        {PERMISSION_GROUPS.map((group) => (
                          <div key={group.label} style={{ padding: 10, background: theme.card, borderRadius: 6, border: `1px solid ${theme.cardBorder}` }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: theme.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.3 }}>{group.label}</div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                              {group.permissions.map((perm) => {
                                const isEnabled = effectivePerms.has(perm);
                                const isDefault = new Set(DEFAULT_ROLE_PERMISSIONS[m.role as OrgRole] || []).has(perm);
                                const isOverridden = m.permissionOverrides?.[perm] !== undefined;
                                return (
                                  <button key={perm} onClick={() => handlePermissionToggle(m, perm, !isEnabled)} style={{
                                    padding: "3px 8px", borderRadius: 3, fontSize: 10, cursor: "pointer",
                                    background: isEnabled ? `${theme.green}15` : `${theme.red}08`,
                                    border: `1px solid ${isEnabled ? theme.green : theme.red}${isOverridden ? "60" : "20"}`,
                                    color: isEnabled ? theme.green : theme.red,
                                    fontWeight: isOverridden ? 700 : 400,
                                    textDecoration: isOverridden && !isDefault === isEnabled ? "" : undefined,
                                  }} title={`${isEnabled ? "Enabled" : "Disabled"}${isOverridden ? " (custom override)" : " (role default)"}`}>
                                    {formatPermission(perm)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      <p style={{ fontSize: 10, color: theme.textDim, margin: "10px 0 0" }}>
                        Bold = custom override. Click to toggle. Changes are saved immediately.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
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
