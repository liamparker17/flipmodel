export type TeamRole = "owner" | "admin" | "manager" | "field_worker" | "viewer";

export type Permission =
  | "deals:read" | "deals:write" | "deals:delete"
  | "expenses:read" | "expenses:write" | "expenses:approve"
  | "milestones:read" | "milestones:write"
  | "tasks:read" | "tasks:write"
  | "contacts:read" | "contacts:write"
  | "tools:read" | "tools:write" | "tools:checkout"
  | "documents:read" | "documents:write"
  | "invoices:read" | "invoices:write"
  | "reports:read"
  | "team:read" | "team:manage"
  | "settings:read" | "settings:write";

const ROLE_PERMISSIONS: Record<TeamRole, Permission[]> = {
  owner: [
    "deals:read", "deals:write", "deals:delete",
    "expenses:read", "expenses:write", "expenses:approve",
    "milestones:read", "milestones:write",
    "tasks:read", "tasks:write",
    "contacts:read", "contacts:write",
    "tools:read", "tools:write", "tools:checkout",
    "documents:read", "documents:write",
    "invoices:read", "invoices:write",
    "reports:read",
    "team:read", "team:manage",
    "settings:read", "settings:write",
  ],
  admin: [
    "deals:read", "deals:write", "deals:delete",
    "expenses:read", "expenses:write", "expenses:approve",
    "milestones:read", "milestones:write",
    "tasks:read", "tasks:write",
    "contacts:read", "contacts:write",
    "tools:read", "tools:write", "tools:checkout",
    "documents:read", "documents:write",
    "invoices:read", "invoices:write",
    "reports:read",
    "team:read", "team:manage",
    "settings:read", "settings:write",
  ],
  manager: [
    "deals:read", "deals:write",
    "expenses:read", "expenses:write", "expenses:approve",
    "milestones:read", "milestones:write",
    "tasks:read", "tasks:write",
    "contacts:read", "contacts:write",
    "tools:read", "tools:checkout",
    "documents:read", "documents:write",
    "invoices:read", "invoices:write",
    "reports:read",
    "team:read",
    "settings:read",
  ],
  field_worker: [
    "deals:read",
    "expenses:read", "expenses:write",
    "milestones:read",
    "tasks:read", "tasks:write",
    "contacts:read",
    "tools:read", "tools:checkout",
    "documents:read",
    "settings:read",
  ],
  viewer: [
    "deals:read",
    "expenses:read",
    "milestones:read",
    "tasks:read",
    "contacts:read",
    "tools:read",
    "documents:read",
    "reports:read",
    "settings:read",
  ],
};

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: TeamRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}
