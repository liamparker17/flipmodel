// ─── Accounting Provider Types ───

export type AccountingProvider = "quickbooks" | "xero" | "sage" | "manual";

export type AccountingConnectionStatus = "disconnected" | "connected" | "expired" | "error";

export type SyncStatus = "pending" | "syncing" | "synced" | "error";

export type SyncDirection = "inbound" | "outbound" | "bidirectional";

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";

export type AccountSubtype =
  // Assets
  | "cash" | "bank" | "accounts_receivable" | "inventory" | "fixed_asset" | "other_asset"
  // Liabilities
  | "accounts_payable" | "credit_card" | "loan" | "mortgage" | "other_liability"
  // Equity
  | "owners_equity" | "retained_earnings"
  // Revenue
  | "sales" | "other_income"
  // Expenses
  | "materials" | "labour" | "subcontractor" | "professional_fees" | "operating" | "other_expense";

// ─── Interfaces ───

export interface AccountingConnection {
  id: string;
  orgId: string;
  provider: AccountingProvider;
  status: AccountingConnectionStatus;
  externalOrgId: string | null;
  lastSyncAt: Date | null;
  settings: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChartOfAccount {
  id: string;
  orgId: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
  externalId: string | null;
  isActive: boolean;
  isSystemAccount: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AccountingSync {
  id: string;
  orgId: string;
  entityType: string;
  entityId: string;
  externalId: string | null;
  direction: SyncDirection;
  status: SyncStatus;
  errorMessage: string | null;
  lastSyncedAt: Date | null;
  createdAt: Date;
}

// ─── Default Chart of Accounts for Property Flipping ───

export interface DefaultAccount {
  code: string;
  name: string;
  type: AccountType;
  subtype: AccountSubtype;
}

export const DEFAULT_CHART_OF_ACCOUNTS: DefaultAccount[] = [
  // Assets
  { code: "1000", name: "Business Bank Account", type: "asset", subtype: "bank" },
  { code: "1100", name: "Accounts Receivable", type: "asset", subtype: "accounts_receivable" },
  { code: "1200", name: "Property Inventory", type: "asset", subtype: "inventory" },
  { code: "1300", name: "Tools & Equipment", type: "asset", subtype: "fixed_asset" },

  // Liabilities
  { code: "2000", name: "Accounts Payable", type: "liability", subtype: "accounts_payable" },
  { code: "2100", name: "Credit Card", type: "liability", subtype: "credit_card" },
  { code: "2200", name: "Property Bonds / Loans", type: "liability", subtype: "mortgage" },

  // Equity
  { code: "3000", name: "Owner's Equity", type: "equity", subtype: "owners_equity" },
  { code: "3100", name: "Retained Earnings", type: "equity", subtype: "retained_earnings" },

  // Revenue
  { code: "4000", name: "Property Sales Revenue", type: "revenue", subtype: "sales" },
  { code: "4100", name: "Rental Income", type: "revenue", subtype: "other_income" },

  // Expenses
  { code: "5000", name: "Materials & Supplies", type: "expense", subtype: "materials" },
  { code: "5100", name: "Labour Costs", type: "expense", subtype: "labour" },
  { code: "5200", name: "Subcontractor Costs", type: "expense", subtype: "subcontractor" },
  { code: "5300", name: "Professional Fees (Legal, Agent, etc.)", type: "expense", subtype: "professional_fees" },
  { code: "5400", name: "Operating Expenses (Rates, Utilities, Insurance)", type: "expense", subtype: "operating" },
  { code: "5500", name: "Transfer & Bond Registration Costs", type: "expense", subtype: "other_expense" },
];
