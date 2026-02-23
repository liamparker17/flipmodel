import type { OrgRole, Permission, ModuleKey } from "@/types/org";
import { ORG_ROLE_LEVELS } from "@/types/org";

// ─── Default Permission Matrix ───

export const DEFAULT_ROLE_PERMISSIONS: Record<OrgRole, Permission[]> = {
  executive: [
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
    "accounting:read", "accounting:write",
    "org:read", "org:write",
    "shopping:read", "shopping:write",
    "activities:read", "activities:write",
    "notifications:read", "notifications:write",
    "departments:read", "departments:write",
  ],
  finance_manager: [
    "deals:read",
    "expenses:read", "expenses:write", "expenses:approve",
    "milestones:read",
    "tasks:read",
    "contacts:read", "contacts:write",
    "tools:read",
    "documents:read", "documents:write",
    "invoices:read", "invoices:write",
    "reports:read",
    "settings:read", "settings:write",
    "accounting:read", "accounting:write",
    "org:read",
    "shopping:read",
    "activities:read",
    "notifications:read", "notifications:write",
    "departments:read",
  ],
  project_manager: [
    "deals:read", "deals:write",
    "expenses:read", "expenses:write", "expenses:approve",
    "milestones:read", "milestones:write",
    "tasks:read", "tasks:write",
    "contacts:read", "contacts:write",
    "tools:read", "tools:write", "tools:checkout",
    "documents:read", "documents:write",
    "invoices:read",
    "reports:read",
    "team:read", "team:manage",
    "settings:read",
    "org:read",
    "shopping:read", "shopping:write",
    "activities:read", "activities:write",
    "notifications:read", "notifications:write",
    "departments:read",
  ],
  site_supervisor: [
    "deals:read",
    "expenses:read", "expenses:write",
    "milestones:read", "milestones:write",
    "tasks:read", "tasks:write",
    "contacts:read",
    "tools:read", "tools:checkout",
    "documents:read", "documents:write",
    "invoices:read",
    "settings:read",
    "org:read",
    "shopping:read", "shopping:write",
    "activities:read", "activities:write",
    "notifications:read", "notifications:write",
    "departments:read",
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
    "org:read",
    "shopping:read",
    "activities:read",
    "notifications:read",
  ],
  viewer: [
    "deals:read",
    "expenses:read",
    "milestones:read",
    "tasks:read",
    "contacts:read",
    "tools:read",
    "documents:read",
    "invoices:read",
    "reports:read",
    "settings:read",
    "org:read",
    "shopping:read",
    "activities:read",
    "notifications:read",
  ],
};

// ─── Default Module Access Matrix ───

export const DEFAULT_ROLE_MODULES: Record<OrgRole, ModuleKey[]> = {
  executive: [
    "dashboard", "pipeline", "projects", "contacts", "finance", "invoices",
    "tools", "reports", "team", "accounting", "settings", "suppliers", "documents",
  ],
  finance_manager: [
    "dashboard", "pipeline", "contacts", "finance", "invoices",
    "reports", "accounting", "settings", "suppliers", "documents",
  ],
  project_manager: [
    "dashboard", "pipeline", "projects", "contacts",
    "tools", "reports", "team", "settings", "suppliers", "documents",
  ],
  site_supervisor: [
    "dashboard", "pipeline", "projects", "contacts",
    "tools", "settings", "suppliers", "documents",
  ],
  field_worker: [
    "dashboard", "projects", "tools", "settings", "suppliers", "documents",
  ],
  viewer: [
    "dashboard", "pipeline", "projects", "contacts", "finance", "invoices",
    "reports", "settings", "suppliers", "documents",
  ],
};

// ─── Resolution Functions ───

export interface OrgMemberLike {
  role: string;
  permissionOverrides?: Record<string, boolean> | null;
  moduleOverrides?: Record<string, boolean> | null;
}

export function resolvePermissions(
  role: OrgRole,
  overrides?: Record<string, boolean> | null
): Set<Permission> {
  const defaults = new Set<Permission>(DEFAULT_ROLE_PERMISSIONS[role] || []);
  if (overrides) {
    for (const [perm, granted] of Object.entries(overrides)) {
      if (granted) {
        defaults.add(perm as Permission);
      } else {
        defaults.delete(perm as Permission);
      }
    }
  }
  return defaults;
}

export function resolveModules(
  role: OrgRole,
  overrides?: Record<string, boolean> | null
): Set<ModuleKey> {
  const defaults = new Set<ModuleKey>(DEFAULT_ROLE_MODULES[role] || []);
  if (overrides) {
    for (const [mod, granted] of Object.entries(overrides)) {
      if (granted) {
        defaults.add(mod as ModuleKey);
      } else {
        defaults.delete(mod as ModuleKey);
      }
    }
  }
  return defaults;
}

export function hasPermission(member: OrgMemberLike, permission: Permission): boolean {
  const perms = resolvePermissions(
    member.role as OrgRole,
    member.permissionOverrides as Record<string, boolean> | null
  );
  return perms.has(permission);
}

export function canAccessModule(member: OrgMemberLike, module: ModuleKey): boolean {
  const mods = resolveModules(
    member.role as OrgRole,
    member.moduleOverrides as Record<string, boolean> | null
  );
  return mods.has(module);
}

export function canManageRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  return ORG_ROLE_LEVELS[actorRole] > ORG_ROLE_LEVELS[targetRole];
}

export function getPermissions(role: OrgRole): Permission[] {
  return DEFAULT_ROLE_PERMISSIONS[role] || [];
}
