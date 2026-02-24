import { describe, it, expect } from "vitest";
import {
  DEFAULT_ROLE_PERMISSIONS,
  resolvePermissions,
  resolveModules,
  hasPermission,
  canAccessModule,
  canManageRole,
  type OrgMemberLike,
} from "../permissions";

describe("DEFAULT_ROLE_PERMISSIONS", () => {
  it("executive has all permission categories", () => {
    const execPerms = DEFAULT_ROLE_PERMISSIONS.executive;
    expect(execPerms).toContain("deals:read");
    expect(execPerms).toContain("deals:write");
    expect(execPerms).toContain("deals:delete");
    expect(execPerms).toContain("expenses:approve");
    expect(execPerms).toContain("team:manage");
    expect(execPerms).toContain("settings:write");
    expect(execPerms).toContain("org:write");
    expect(execPerms).toContain("accounting:write");
  });

  it("viewer has only read permissions", () => {
    const viewerPerms = DEFAULT_ROLE_PERMISSIONS.viewer;
    // All viewer permissions should end with ":read"
    for (const perm of viewerPerms) {
      expect(perm).toMatch(/:read$/);
    }
    // Viewer should NOT have any write/delete/manage/approve permissions
    expect(viewerPerms).not.toContain("deals:write");
    expect(viewerPerms).not.toContain("deals:delete");
    expect(viewerPerms).not.toContain("expenses:write");
    expect(viewerPerms).not.toContain("expenses:approve");
    expect(viewerPerms).not.toContain("team:manage");
    expect(viewerPerms).not.toContain("settings:write");
  });
});

describe("resolvePermissions", () => {
  it("returns default permissions for a role with no overrides", () => {
    const perms = resolvePermissions("viewer");
    expect(perms.has("deals:read")).toBe(true);
    expect(perms.has("deals:write")).toBe(false);
  });

  it("adds permissions via overrides", () => {
    const perms = resolvePermissions("viewer", { "deals:write": true });
    expect(perms.has("deals:write")).toBe(true);
    // Still has the original read permissions
    expect(perms.has("deals:read")).toBe(true);
  });

  it("removes permissions via overrides", () => {
    const perms = resolvePermissions("executive", { "deals:delete": false });
    expect(perms.has("deals:delete")).toBe(false);
    // Other permissions remain
    expect(perms.has("deals:read")).toBe(true);
    expect(perms.has("deals:write")).toBe(true);
  });

  it("handles null overrides gracefully", () => {
    const perms = resolvePermissions("viewer", null);
    expect(perms.has("deals:read")).toBe(true);
  });
});

describe("hasPermission", () => {
  it("returns true for permissions included in the role", () => {
    const member: OrgMemberLike = { role: "executive", permissionOverrides: null };
    expect(hasPermission(member, "deals:write")).toBe(true);
    expect(hasPermission(member, "org:write")).toBe(true);
  });

  it("returns false for unauthorized actions", () => {
    const member: OrgMemberLike = { role: "viewer", permissionOverrides: null };
    expect(hasPermission(member, "deals:write")).toBe(false);
    expect(hasPermission(member, "deals:delete")).toBe(false);
    expect(hasPermission(member, "expenses:approve")).toBe(false);
  });

  it("respects permission overrides that grant extra access", () => {
    const member: OrgMemberLike = {
      role: "viewer",
      permissionOverrides: { "deals:write": true },
    };
    expect(hasPermission(member, "deals:write")).toBe(true);
    // Original read still works
    expect(hasPermission(member, "deals:read")).toBe(true);
  });

  it("respects permission overrides that revoke access", () => {
    const member: OrgMemberLike = {
      role: "executive",
      permissionOverrides: { "deals:delete": false },
    };
    expect(hasPermission(member, "deals:delete")).toBe(false);
  });

  it("returns false for a completely unknown role", () => {
    const member: OrgMemberLike = {
      role: "nonexistent_role",
      permissionOverrides: null,
    };
    expect(hasPermission(member, "deals:read")).toBe(false);
  });
});

describe("canAccessModule", () => {
  it("executive can access all modules", () => {
    const member: OrgMemberLike = { role: "executive", moduleOverrides: null };
    expect(canAccessModule(member, "dashboard")).toBe(true);
    expect(canAccessModule(member, "accounting")).toBe(true);
    expect(canAccessModule(member, "settings")).toBe(true);
  });

  it("field_worker has limited module access", () => {
    const member: OrgMemberLike = { role: "field_worker", moduleOverrides: null };
    expect(canAccessModule(member, "dashboard")).toBe(true);
    expect(canAccessModule(member, "projects")).toBe(true);
    expect(canAccessModule(member, "accounting")).toBe(false);
    expect(canAccessModule(member, "reports")).toBe(false);
  });

  it("module overrides can grant access", () => {
    const member: OrgMemberLike = {
      role: "field_worker",
      moduleOverrides: { reports: true },
    };
    expect(canAccessModule(member, "reports")).toBe(true);
  });
});

describe("canManageRole", () => {
  it("executive can manage all lower roles", () => {
    expect(canManageRole("executive", "project_manager")).toBe(true);
    expect(canManageRole("executive", "viewer")).toBe(true);
  });

  it("viewer cannot manage anyone", () => {
    expect(canManageRole("viewer", "executive")).toBe(false);
    expect(canManageRole("viewer", "field_worker")).toBe(false);
  });

  it("cannot manage same-level role", () => {
    expect(canManageRole("executive", "executive")).toBe(false);
  });

  it("lower role cannot manage higher role", () => {
    expect(canManageRole("field_worker", "project_manager")).toBe(false);
  });
});
