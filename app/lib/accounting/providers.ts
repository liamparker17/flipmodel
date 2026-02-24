// ─── Shared accounting provider interface & utilities ───

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

export interface AccountingProvider {
  name: string;

  // OAuth
  getAuthUrl(state: string): string;
  exchangeCode(code: string): Promise<OAuthTokens>;
  refreshTokens(refreshToken: string): Promise<OAuthTokens>;

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

// ─── OAuth state validation store ───

const pendingStates = new Map<string, number>(); // state -> expiry timestamp

export function storeOAuthState(state: string): void {
  pendingStates.set(state, Date.now() + 10 * 60 * 1000); // 10 min expiry
  // Cleanup expired entries
  for (const [key, expiry] of pendingStates.entries()) {
    if (Date.now() > expiry) pendingStates.delete(key);
  }
}

export function validateOAuthState(state: string): boolean {
  const expiry = pendingStates.get(state);
  if (!expiry || Date.now() > expiry) return false;
  pendingStates.delete(state);
  return true;
}
