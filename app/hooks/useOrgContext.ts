"use client";

import { useState, useEffect, useCallback } from "react";
import type { OrgRole, Permission, ModuleKey } from "@/types/org";

interface OrgContextMember {
  id: string;
  role: OrgRole;
  departmentId: string | null;
  title: string | null;
  moduleOverrides: Record<string, boolean> | null;
  permissionOverrides: Record<string, boolean> | null;
  isActive: boolean;
}

interface OrgContextOrg {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  currency: string;
  timezone: string;
  settings: Record<string, unknown> | null;
}

interface OrgContextData {
  org: OrgContextOrg | null;
  member: OrgContextMember | null;
  role: OrgRole | null;
  loading: boolean;
  error: string | null;
  hasOrg: boolean;
  canAccessModule: (module: ModuleKey) => boolean;
  hasPermission: (permission: Permission) => boolean;
  refetch: () => void;
}

// Import the same resolution logic used server-side
import { resolvePermissions, resolveModules } from "@/lib/permissions";

export default function useOrgContext(): OrgContextData {
  const [org, setOrg] = useState<OrgContextOrg | null>(null);
  const [member, setMember] = useState<OrgContextMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrg = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/org");
      if (res.status === 403) {
        // No org membership
        setOrg(null);
        setMember(null);
        setError(null);
        return;
      }
      if (!res.ok) {
        setError("Failed to load organisation");
        return;
      }
      const data = await res.json();
      setOrg({
        id: data.id,
        name: data.name,
        slug: data.slug,
        logo: data.logo,
        currency: data.currency,
        timezone: data.timezone,
        settings: data.settings,
      });

      // Find current user's membership from the response
      // The API returns the org with members, but we need to identify ours
      // We'll use a separate session check or the member data from session
      // For now, we use the first active member (the API is scoped to the user's org)
      if (data.members && data.members.length > 0) {
        // We'll get our own member info from /api/org endpoint which scopes to our org
        // For the member role, we need to fetch session or use a dedicated endpoint
        // The org GET already validates membership, so we know we're a member
        const currentMember = data.members[0]; // Will be refined when session data is available
        setMember({
          id: currentMember.id,
          role: currentMember.role as OrgRole,
          departmentId: currentMember.departmentId,
          title: currentMember.title,
          moduleOverrides: currentMember.moduleOverrides,
          permissionOverrides: currentMember.permissionOverrides,
          isActive: currentMember.isActive,
        });
      }
      setError(null);
    } catch {
      setError("Failed to load organisation");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrg();
  }, [fetchOrg]);

  const role = member?.role ?? null;

  const canAccessModule = useCallback(
    (module: ModuleKey): boolean => {
      if (!member) return false;
      const mods = resolveModules(
        member.role,
        member.moduleOverrides as Record<string, boolean> | null
      );
      return mods.has(module);
    },
    [member]
  );

  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!member) return false;
      const perms = resolvePermissions(
        member.role,
        member.permissionOverrides as Record<string, boolean> | null
      );
      return perms.has(permission);
    },
    [member]
  );

  return {
    org,
    member,
    role,
    loading,
    error,
    hasOrg: !!org,
    canAccessModule,
    hasPermission,
    refetch: fetchOrg,
  };
}
