// ─── QuickBooks Online OAuth2 + API Client ───

import type { OAuthTokens, AccountingProvider, AccountingAccount, AccountingContact, AccountingInvoice } from "./providers";
import { getRedirectUri } from "./providers";

const AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

// QuickBooks uses different base URLs for sandbox vs production
function getApiBase(realmId: string): string {
  const sandbox = process.env.QUICKBOOKS_SANDBOX === "true";
  const host = sandbox
    ? "https://sandbox-quickbooks.api.intuit.com"
    : "https://quickbooks.api.intuit.com";
  return `${host}/v3/company/${realmId}`;
}

const SCOPES = "com.intuit.quickbooks.accounting";

function getClientId(): string {
  const id = process.env.QUICKBOOKS_CLIENT_ID;
  if (!id) throw new Error("QUICKBOOKS_CLIENT_ID is not configured");
  return id;
}

function getClientSecret(): string {
  const secret = process.env.QUICKBOOKS_CLIENT_SECRET;
  if (!secret) throw new Error("QUICKBOOKS_CLIENT_SECRET is not configured");
  return secret;
}

async function qbFetch(url: string, tokens: OAuthTokens, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`QuickBooks API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const quickbooksProvider: AccountingProvider = {
  name: "quickbooks",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: getClientId(),
      redirect_uri: getRedirectUri("quickbooks"),
      scope: SCOPES,
      state,
    });
    return `${AUTH_URL}?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri("quickbooks"),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks token exchange failed: ${text}`);
    }

    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      // tenantId (realmId) is passed via the callback URL query param
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`QuickBooks token refresh failed: ${text}`);
    }

    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
    };
  },

  async getOrganisation(tokens: OAuthTokens) {
    const realmId = tokens.tenantId;
    if (!realmId) throw new Error("No QuickBooks realm ID");
    const data = await qbFetch(`${getApiBase(realmId)}/companyinfo/${realmId}`, tokens);
    const info = data.CompanyInfo;
    return {
      id: realmId,
      name: info?.CompanyName || "",
    };
  },

  async getAccounts(tokens: OAuthTokens): Promise<AccountingAccount[]> {
    const realmId = tokens.tenantId;
    if (!realmId) throw new Error("No QuickBooks realm ID");
    const data = await qbFetch(
      `${getApiBase(realmId)}/query?query=${encodeURIComponent("SELECT * FROM Account MAXRESULTS 1000")}`,
      tokens
    );
    return (data.QueryResponse?.Account || []).map((a: Record<string, string>) => ({
      externalId: a.Id,
      code: a.AcctNum || "",
      name: a.Name,
      type: a.AccountType,
      status: a.Active === "true" ? "ACTIVE" : "ARCHIVED",
    }));
  },

  async getContacts(tokens: OAuthTokens): Promise<AccountingContact[]> {
    const realmId = tokens.tenantId;
    if (!realmId) throw new Error("No QuickBooks realm ID");

    // QuickBooks separates vendors and customers
    const [vendorData, customerData] = await Promise.all([
      qbFetch(`${getApiBase(realmId)}/query?query=${encodeURIComponent("SELECT * FROM Vendor MAXRESULTS 1000")}`, tokens),
      qbFetch(`${getApiBase(realmId)}/query?query=${encodeURIComponent("SELECT * FROM Customer MAXRESULTS 1000")}`, tokens),
    ]);

    const vendors: AccountingContact[] = (vendorData.QueryResponse?.Vendor || []).map((v: Record<string, unknown>) => ({
      externalId: v.Id as string,
      name: v.DisplayName as string,
      email: (v.PrimaryEmailAddr as Record<string, string>)?.Address || undefined,
      phone: (v.PrimaryPhone as Record<string, string>)?.FreeFormNumber || undefined,
      isSupplier: true,
      isCustomer: false,
    }));

    const customers: AccountingContact[] = (customerData.QueryResponse?.Customer || []).map((c: Record<string, unknown>) => ({
      externalId: c.Id as string,
      name: c.DisplayName as string,
      email: (c.PrimaryEmailAddr as Record<string, string>)?.Address || undefined,
      phone: (c.PrimaryPhone as Record<string, string>)?.FreeFormNumber || undefined,
      isSupplier: false,
      isCustomer: true,
    }));

    return [...vendors, ...customers];
  },

  async getInvoices(tokens: OAuthTokens): Promise<AccountingInvoice[]> {
    const realmId = tokens.tenantId;
    if (!realmId) throw new Error("No QuickBooks realm ID");
    const data = await qbFetch(
      `${getApiBase(realmId)}/query?query=${encodeURIComponent("SELECT * FROM Invoice ORDERBY TxnDate DESC MAXRESULTS 100")}`,
      tokens
    );
    return (data.QueryResponse?.Invoice || []).map((inv: Record<string, unknown>) => ({
      externalId: inv.Id as string,
      invoiceNumber: inv.DocNumber as string || "",
      contactName: (inv.CustomerRef as Record<string, string>)?.name || "",
      status: mapQBInvoiceStatus(inv),
      total: inv.TotalAmt as number,
      currency: (inv.CurrencyRef as Record<string, string>)?.value || "ZAR",
      date: inv.TxnDate as string || "",
      dueDate: inv.DueDate as string || undefined,
    }));
  },

  async createInvoice(tokens: OAuthTokens, invoice: Partial<AccountingInvoice>): Promise<AccountingInvoice> {
    const realmId = tokens.tenantId;
    if (!realmId) throw new Error("No QuickBooks realm ID");
    const data = await qbFetch(`${getApiBase(realmId)}/invoice`, tokens, {
      method: "POST",
      body: JSON.stringify({
        DocNumber: invoice.invoiceNumber,
        TxnDate: invoice.date,
        DueDate: invoice.dueDate,
        CustomerRef: { name: invoice.contactName },
        CurrencyRef: { value: invoice.currency || "ZAR" },
        Line: [],
      }),
    });
    const inv = data.Invoice;
    return {
      externalId: inv?.Id || "",
      invoiceNumber: inv?.DocNumber || "",
      contactName: inv?.CustomerRef?.name || "",
      status: "DRAFT",
      total: inv?.TotalAmt || 0,
      currency: inv?.CurrencyRef?.value || "ZAR",
      date: inv?.TxnDate || "",
      dueDate: inv?.DueDate,
    };
  },
};

function mapQBInvoiceStatus(inv: Record<string, unknown>): string {
  const balance = inv.Balance as number;
  if (balance === 0) return "PAID";
  const dueDate = inv.DueDate as string;
  if (dueDate && new Date(dueDate) < new Date()) return "OVERDUE";
  return "AUTHORISED";
}
