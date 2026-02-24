// ─── Shared accounting provider interface & utilities ───

import prisma from "@/lib/db";

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  tenantId?: string; // Xero tenant ID or QuickBooks realm ID
}

export interface AccountingContact {
  externalId: string;
  name: string;
  email?: string;
  phone?: string;
  isSupplier: boolean;
  isCustomer: boolean;
}

export interface AccountingAccount {
  externalId: string;
  code: string;
  name: string;
  type: string;
  status: string;
}

export interface AccountingInvoice {
  externalId: string;
  invoiceNumber: string;
  contactName: string;
  status: string;
  total: number;
  currency: string;
  date: string;
  dueDate?: string;
}

/** Credentials passed per-request (no module-level state) */
export interface ProviderCredentials {
  clientId: string;
  clientSecret: string;
  sandbox?: boolean;
}

export interface AccountingProvider {
  name: string;

  // OAuth — credentials passed per-request for thread safety
  getAuthUrl(state: string, creds: ProviderCredentials): string;
  exchangeCode(code: string, creds: ProviderCredentials): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string, creds: ProviderCredentials): Promise<OAuthTokens>;

  // API calls (all require tokens)
  getOrganisation(tokens: OAuthTokens): Promise<{ id: string; name: string }>;
  getAccounts(tokens: OAuthTokens): Promise<AccountingAccount[]>;
  getContacts(tokens: OAuthTokens): Promise<AccountingContact[]>;
  getInvoices(tokens: OAuthTokens): Promise<AccountingInvoice[]>;
  createInvoice(tokens: OAuthTokens, invoice: Partial<AccountingInvoice>): Promise<AccountingInvoice>;
}

// Build redirect URI from the request origin
export function getRedirectUri(provider: "xero" | "quickbooks"): string {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  return `${base}/api/accounting/${provider}/callback`;
}

// Generate a random state parameter for OAuth CSRF protection
export function generateOAuthState(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Database-backed OAuth state validation ───

export async function storeOAuthState(orgId: string, returnTo?: string): Promise<string> {
  const state = generateOAuthState();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

  await prisma.oAuthState.create({
    data: { state, orgId, returnTo: returnTo || null, expiresAt },
  });

  // Cleanup expired states (non-blocking)
  prisma.oAuthState.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  }).catch(() => {});

  return state;
}

export async function validateOAuthState(state: string): Promise<{ orgId: string; returnTo: string | null } | null> {
  const record = await prisma.oAuthState.findUnique({ where: { state } });

  if (!record || record.expiresAt < new Date()) {
    // Clean up if expired
    if (record) await prisma.oAuthState.delete({ where: { id: record.id } }).catch(() => {});
    return null;
  }

  // Consume the state (one-time use)
  await prisma.oAuthState.delete({ where: { id: record.id } });

  return { orgId: record.orgId, returnTo: record.returnTo };
}
