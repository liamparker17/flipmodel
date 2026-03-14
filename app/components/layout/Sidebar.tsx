"use client";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { theme } from "../theme";
import type { ModuleKey, OrgRole } from "@/types/org";
import useOrgContext from "@/hooks/useOrgContext";

// ─── Navigation Types ───

interface NavItem {
  href: string;
  label: string;
  icon: string;
  module?: ModuleKey;
}

interface NavGroup {
  label?: string;
  items: NavItem[];
}

// ─── Role-specific Navigation Configs ───

const ROLE_NAV: Record<OrgRole, NavGroup[]> = {
  executive: [
    { label: "Overview", items: [
      { href: "/dashboard", label: "Portfolio Overview", icon: "\u25E6", module: "dashboard" },
      { href: "/pipeline", label: "Deal Pipeline", icon: "\u25B6", module: "pipeline" },
      { href: "/listings", label: "Listings", icon: "\uD83C\uDFE0", module: "pipeline" },
    ]},
    { label: "Finance", items: [
      { href: "/finance", label: "Financials", icon: "\u2234", module: "finance" },
      { href: "/invoices", label: "Invoices", icon: "\uD83D\uDCC4", module: "invoices" },
      { href: "/reports", label: "Reports", icon: "\u2261", module: "reports" },
    ]},
    { label: "Organisation", items: [
      { href: "/team", label: "Team", icon: "\uD83D\uDC65", module: "team" },
      { href: "/settings", label: "Settings", icon: "\u2699", module: "settings" },
    ]},
  ],

  finance_manager: [
    { label: "Overview", items: [
      { href: "/dashboard", label: "Finance Dashboard", icon: "\u25E6", module: "dashboard" },
    ]},
    { label: "Money In", items: [
      { href: "/invoices", label: "Invoices", icon: "\uD83D\uDCC4", module: "invoices" },
      { href: "/contacts", label: "Customers", icon: "\uD83D\uDCCB", module: "contacts" },
    ]},
    { label: "Money Out", items: [
      { href: "/finance", label: "Expense Claims", icon: "\u2234", module: "finance" },
      { href: "/suppliers", label: "Vendors", icon: "\uD83D\uDED2", module: "suppliers" },
    ]},
    { label: "Accounting", items: [
      { href: "/reports", label: "Financial Reports", icon: "\u2261", module: "reports" },
    ]},
    { label: "People", items: [
      { href: "/team", label: "Payroll", icon: "\uD83D\uDC65", module: "team" },
    ]},
  ],

  project_manager: [
    { label: "Overview", items: [
      { href: "/dashboard", label: "My Projects", icon: "\u25E6", module: "dashboard" },
      { href: "/pipeline", label: "Properties", icon: "\u25B6", module: "pipeline" },
    ]},
    { label: "Site Work", items: [
      { href: "/projects", label: "Site Progress", icon: "\u2692", module: "projects" },
      { href: "/assignments", label: "Task Board", icon: "\u2611", module: "projects" },
      { href: "/contractors", label: "Contractors", icon: "\uD83D\uDC77", module: "contacts" },
    ]},
    { label: "Materials", items: [
      { href: "/suppliers", label: "Materials & Orders", icon: "\uD83D\uDED2", module: "suppliers" },
      { href: "/tools", label: "Tool Locker", icon: "\uD83D\uDD27", module: "tools" },
    ]},
    { label: "Admin", items: [
      { href: "/finance", label: "Costs", icon: "\u2234", module: "finance" },
      { href: "/documents", label: "Site Documents", icon: "\uD83D\uDCC2", module: "documents" },
    ]},
  ],

  site_supervisor: [
    { items: [
      { href: "/dashboard", label: "Today's Work", icon: "\u25E6", module: "dashboard" },
      { href: "/assignments", label: "My Tasks", icon: "\u2611", module: "projects" },
      { href: "/projects", label: "Site Status", icon: "\u2692", module: "projects" },
      { href: "/tools", label: "Tools", icon: "\uD83D\uDD27", module: "tools" },
      { href: "/documents", label: "Plans & Docs", icon: "\uD83D\uDCC2", module: "documents" },
      { href: "/finance", label: "Log Expense", icon: "\u2234", module: "finance" },
    ]},
  ],

  field_worker: [
    { items: [
      { href: "/dashboard", label: "My Day", icon: "\u25E6", module: "dashboard" },
      { href: "/assignments", label: "Tasks", icon: "\u2611", module: "projects" },
      { href: "/tools", label: "My Tools", icon: "\uD83D\uDD27", module: "tools" },
      { href: "/documents", label: "Site Info", icon: "\uD83D\uDCC2", module: "documents" },
    ]},
  ],

  viewer: [
    { items: [
      { href: "/dashboard", label: "Investment Overview", icon: "\u25E6", module: "dashboard" },
      { href: "/projects", label: "Project Progress", icon: "\u2692", module: "projects" },
      { href: "/reports", label: "Reports", icon: "\u2261", module: "reports" },
      { href: "/documents", label: "Documents", icon: "\uD83D\uDCC2", module: "documents" },
    ]},
  ],
};

// ─── Role-specific Primary Action ───

interface PrimaryAction {
  label: string;
  collapsedLabel: string;
  action: "newDeal" | "navigate";
  href?: string;
}

const ROLE_PRIMARY_ACTION: Partial<Record<OrgRole, PrimaryAction>> = {
  executive: { label: "+ New Property", collapsedLabel: "+", action: "newDeal" },
  project_manager: { label: "+ New Property", collapsedLabel: "+", action: "newDeal" },
  finance_manager: { label: "+ New Invoice", collapsedLabel: "+", action: "navigate", href: "/invoices" },
  site_supervisor: { label: "Log Expense", collapsedLabel: "$", action: "navigate", href: "/finance" },
};

// ─── Sidebar Component ───

interface SidebarProps {
  onNewDeal: () => void;
}

export default function Sidebar({ onNewDeal }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { canAccessModule, hasOrg, role } = useOrgContext();

  const effectiveRole: OrgRole = role ?? "executive";

  useEffect(() => {
    const check = () => {
      setIsMobile(window.innerWidth < 640);
      setIsTablet(window.innerWidth >= 640 && window.innerWidth < 1024);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const collapsed = isTablet;
  const sidebarWidth = collapsed ? 56 : 220;

  const isActive = (href: string): boolean => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const handleNav = (href: string) => {
    router.push(href);
    setMobileOpen(false);
  };

  const handleNewDeal = () => {
    onNewDeal();
    setMobileOpen(false);
  };

  // Build filtered nav groups for current role
  const navGroups = ROLE_NAV[effectiveRole].map((group) => ({
    ...group,
    items: group.items.filter((item) =>
      !hasOrg || !item.module || canAccessModule(item.module)
    ),
  })).filter((group) => group.items.length > 0);

  const primaryAction = ROLE_PRIMARY_ACTION[effectiveRole] ?? null;

  const handlePrimaryAction = () => {
    if (!primaryAction) return;
    if (primaryAction.action === "newDeal") {
      handleNewDeal();
    } else if (primaryAction.href) {
      handleNav(primaryAction.href);
    }
  };

  if (isMobile) {
    return (
      <>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          style={{
            position: "fixed", top: 12, left: 12, zIndex: 200,
            width: 40, height: 40, borderRadius: 6,
            background: theme.card, border: `1px solid ${theme.cardBorder}`,
            color: theme.textDim, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          &#9776;
        </button>
        {mobileOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 300 }}>
            <div onClick={() => setMobileOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)" }} />
            <div style={{
              position: "relative", width: 240, height: "100%",
              background: theme.bg, borderRight: `1px solid ${theme.cardBorder}`,
              display: "flex", flexDirection: "column", overflow: "auto",
            }}>
              <SidebarContent
                collapsed={false} isActive={isActive} onNav={handleNav}
                onPrimaryAction={handlePrimaryAction} primaryAction={primaryAction}
                onClose={() => setMobileOpen(false)}
                navGroups={navGroups}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div style={{
      width: sidebarWidth, minHeight: "100vh", flexShrink: 0,
      background: theme.bg, borderRight: `1px solid ${theme.cardBorder}`,
      display: "flex", flexDirection: "column", transition: "width 0.2s",
      position: "sticky", top: 0, height: "100vh", overflow: "auto",
    }}>
      <SidebarContent
        collapsed={collapsed} isActive={isActive} onNav={handleNav}
        onPrimaryAction={handlePrimaryAction} primaryAction={primaryAction}
        navGroups={navGroups}
      />
    </div>
  );
}

// ─── SidebarContent ───

interface SidebarContentProps {
  collapsed: boolean;
  isActive: (href: string) => boolean;
  onNav: (href: string) => void;
  onPrimaryAction: () => void;
  primaryAction: PrimaryAction | null;
  onClose?: () => void;
  navGroups: NavGroup[];
}

function SidebarContent({ collapsed, isActive, onNav, onPrimaryAction, primaryAction, onClose, navGroups }: SidebarContentProps) {
  return (
    <>
      {/* Logo / Brand Header */}
      <div style={{
        padding: collapsed ? "14px 8px" : "14px 16px",
        borderBottom: `1px solid ${theme.cardBorder}`,
        display: "flex", alignItems: "center", gap: 10,
        justifyContent: collapsed ? "center" : "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => onNav("/dashboard")}>
          <div style={{
            width: 28, height: 28, background: theme.accent, borderRadius: 6,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
          }}>JH</div>
          {!collapsed && <span style={{ fontSize: 14, fontWeight: 600, color: theme.text }}>JustHouses</span>}
        </div>
        {onClose && (
          <button onClick={onClose} aria-label="Close navigation menu" style={{
            background: "transparent", border: "none", borderRadius: 4,
            width: 28, height: 28, color: theme.textDim, fontSize: 16, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>&times;</button>
        )}
      </div>

      {/* Primary Action Button (role-specific) */}
      {primaryAction && (
        <div style={{ padding: collapsed ? "10px 8px" : "10px 12px" }}>
          <button
            onClick={onPrimaryAction}
            data-tour="new-deal"
            style={{
              width: "100%", padding: collapsed ? "8px 0" : "8px 14px",
              background: theme.accent, color: "#fff", border: "none",
              borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: "pointer",
              minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>
              {collapsed ? primaryAction.collapsedLabel : null}
            </span>
            {!collapsed && primaryAction.label}
          </button>
        </div>
      )}

      {/* Navigation Groups */}
      <nav style={{ flex: 1, padding: collapsed ? "2px 8px" : "2px 8px" }}>
        {navGroups.map((group, groupIdx) => (
          <div key={group.label ?? `group-${groupIdx}`}>
            {/* Section Header */}
            {group.label && !collapsed && (
              <div style={{
                fontSize: 9,
                color: theme.textDim,
                letterSpacing: 1,
                textTransform: "uppercase" as const,
                padding: "10px 10px 4px 10px",
                ...(groupIdx > 0 ? { marginTop: 6 } : {}),
              }}>
                {group.label}
              </div>
            )}
            {/* Collapsed: add a small divider between groups */}
            {group.label && collapsed && groupIdx > 0 && (
              <div style={{
                height: 1,
                background: theme.cardBorder,
                margin: "6px 4px",
              }} />
            )}
            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <button
                  key={item.href}
                  onClick={() => onNav(item.href)}
                  data-tour={`nav-${item.href.replace("/", "")}`}
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    gap: 8, padding: collapsed ? "8px 0" : "8px 10px",
                    background: active ? `${theme.accent}12` : "transparent",
                    border: active ? `1px solid ${theme.accent}20` : "1px solid transparent",
                    borderRadius: 6, cursor: "pointer",
                    color: active ? theme.accent : theme.textDim,
                    fontSize: 13, fontWeight: active ? 600 : 400,
                    marginBottom: 1, minHeight: 36,
                    justifyContent: collapsed ? "center" : "flex-start",
                    transition: "all 0.1s",
                  }}
                >
                  <span style={{
                    width: 24, height: 24, borderRadius: 4,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 13, flexShrink: 0,
                  }}>
                    {item.icon}
                  </span>
                  {!collapsed && item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? "10px 8px" : "10px 16px",
        borderTop: `1px solid ${theme.cardBorder}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          style={{
            display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
            gap: 8, padding: "8px 10px", borderRadius: 6,
            border: "none", background: "transparent", color: theme.textDim,
            cursor: "pointer", fontSize: 13, width: "100%",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = theme.cardBorder; e.currentTarget.style.color = "#e74c3c"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = theme.textDim; }}
          title="Sign out"
        >
          <span style={{ width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>
            ↪
          </span>
          {!collapsed && "Sign out"}
        </button>
        {!collapsed && (
          <div style={{ fontSize: 10, color: theme.textDim, letterSpacing: 0.5, paddingLeft: 2 }}>
            JustHouses ERP v1.0
          </div>
        )}
      </div>
    </>
  );
}
