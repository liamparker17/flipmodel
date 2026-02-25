// ─── Organisation Roles ───

export type OrgRole =
  | "executive"
  | "finance_manager"
  | "project_manager"
  | "site_supervisor"
  | "field_worker"
  | "viewer";

export const ORG_ROLE_LEVELS: Record<OrgRole, number> = {
  executive: 100,
  finance_manager: 70,
  project_manager: 60,
  site_supervisor: 40,
  field_worker: 20,
  viewer: 10,
};

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  executive: "Executive",
  finance_manager: "Finance Manager",
  project_manager: "Project Manager",
  site_supervisor: "Site Supervisor",
  field_worker: "Field Worker",
  viewer: "Viewer",
};

export const ORG_ROLE_DESCRIPTIONS: Record<OrgRole, string> = {
  executive: "Owner/Director — full access to everything",
  finance_manager: "Accountant — finance, invoices, expenses, reports",
  project_manager: "PM — deals, projects, contractors, tools",
  site_supervisor: "On-site lead — assigned projects, tasks, tools",
  field_worker: "Labourer — assigned tasks only",
  viewer: "Read-only stakeholder/investor",
};

// ─── Permissions ───

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
  | "settings:read" | "settings:write"
  | "accounting:read" | "accounting:write"
  | "org:read" | "org:write"
  | "shopping:read" | "shopping:write"
  | "activities:read" | "activities:write"
  | "notifications:read" | "notifications:write"
  | "departments:read" | "departments:write"
  | "gl:read" | "gl:write"
  | "payables:read" | "payables:write"
  | "receivables:read" | "receivables:write"
  | "purchase_orders:read" | "purchase_orders:write" | "purchase_orders:approve"
  | "inventory:read" | "inventory:write"
  | "bank:read" | "bank:write" | "bank:reconcile"
  | "hr:read" | "hr:write" | "hr:approve"
  | "payroll:read" | "payroll:write";

// ─── Module Keys ───

export type ModuleKey =
  | "dashboard"
  | "pipeline"
  | "projects"
  | "contacts"
  | "finance"
  | "invoices"
  | "tools"
  | "reports"
  | "team"
  | "accounting"
  | "settings"
  | "suppliers"
  | "documents"
  | "gl"
  | "payables"
  | "receivables"
  | "purchase_orders"
  | "inventory"
  | "banking"
  | "hr"
  | "payroll";

// ─── Interfaces ───

export interface OrgSettings {
  defaultCurrency: string;
  timezone: string;
  fiscalYearStart: number; // month 1-12
  defaultBondRate: number;
  defaultAgentCommission: number;
  defaultContingencyPct: number;
  defaultPmPct: number;
  defaultRenovationMonths: number;
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  defaultCurrency: "ZAR",
  timezone: "Africa/Johannesburg",
  fiscalYearStart: 3, // March for SA
  defaultBondRate: 12.75,
  defaultAgentCommission: 5,
  defaultContingencyPct: 10,
  defaultPmPct: 8,
  defaultRenovationMonths: 4,
};

export interface Organisation {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  currency: string;
  timezone: string;
  settings: OrgSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrgMember {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  departmentId: string | null;
  title: string | null;
  moduleOverrides: Record<ModuleKey, boolean> | null;
  permissionOverrides: Record<Permission, boolean> | null;
  isActive: boolean;
  invitedBy: string | null;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  orgId: string;
  name: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
