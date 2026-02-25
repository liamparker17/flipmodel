import { unstable_cache } from "next/cache";

// Cache tags for invalidation
export const CacheTags = {
  deals: (orgId: string) => `deals-${orgId}`,
  contacts: (orgId: string) => `contacts-${orgId}`,
  invoices: (orgId: string) => `invoices-${orgId}`,
  expenses: (orgId: string) => `expenses-${orgId}`,
  tools: (orgId: string) => `tools-${orgId}`,
  glEntries: (orgId: string) => `gl-${orgId}`,
  inventory: (orgId: string) => `inventory-${orgId}`,
  employees: (orgId: string) => `employees-${orgId}`,
  bankAccounts: (orgId: string) => `bank-${orgId}`,
} as const;

// Revalidation periods in seconds
export const CacheTTL = {
  short: 30,       // 30 seconds - for frequently changing data
  medium: 300,     // 5 minutes - for moderately changing data
  long: 3600,      // 1 hour - for rarely changing data
  chartOfAccounts: 86400, // 24 hours - very stable data
} as const;
