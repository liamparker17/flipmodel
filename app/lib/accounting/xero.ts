// ─── Xero OAuth2 + API Client ───

import type { OAuthTokens, AccountingProvider, AccountingAccount, AccountingContact, AccountingInvoice } from "./providers";
import { getRedirectUri } from "./providers";

const AUTH_URL = "https://login.xero.com/identity/connect/authorize";
const TOKEN_URL = "https://identity.xero.com/connect/token";
const API_BASE = "https://api.xero.com/api.xro/2.0";
const CONNECTIONS_URL = "https://api.xero.com/connections";

const SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "accounting.transactions",
  "accounting.contacts",
  "accounting.settings",
  "accounting.reports.read",
].join(" ");

// Credentials can be injected from DB or fall back to env vars
let _injectedClientId: string | null = null;
let _injectedClientSecret: string | null = null;

export function setXeroCredentials(clientId: string, clientSecret: string) {
  _injectedClientId = clientId;
  _injectedClientSecret = clientSecret;
}

function getClientId(): string {
  if (_injectedClientId) return _injectedClientId;
  const id = process.env.XERO_CLIENT_ID;
  if (!id) throw new Error("XERO_CLIENT_ID is not configured. Add credentials in Settings > Accounting.");
  return id;
}

function getClientSecret(): string {
  if (_injectedClientSecret) return _injectedClientSecret;
  const secret = process.env.XERO_CLIENT_SECRET;
  if (!secret) throw new Error("XERO_CLIENT_SECRET is not configured. Add credentials in Settings > Accounting.");
  return secret;
}

async function xeroFetch(url: string, tokens: OAuthTokens, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.accessToken}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(tokens.tenantId ? { "Xero-Tenant-Id": tokens.tenantId } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Xero API error ${res.status}: ${text}`);
  }
  return res.json();
}

export const xeroProvider: AccountingProvider = {
  name: "xero",

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: "code",
      client_id: getClientId(),
      redirect_uri: getRedirectUri("xero"),
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
        Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: getRedirectUri("xero"),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Xero token exchange failed: ${text}`);
    }

    const data = await res.json();

    // Get tenant ID from connections endpoint
    const connectionsRes = await fetch(CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const connections = await connectionsRes.json();
    const tenantId = connections[0]?.tenantId;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tenantId,
    };
  },

  async refreshTokens(refreshToken: string): Promise<OAuthTokens> {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Xero token refresh failed: ${text}`);
    }

    const data = await res.json();

    // Get tenant ID from connections
    const connectionsRes = await fetch(CONNECTIONS_URL, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    const connections = await connectionsRes.json();
    const tenantId = connections[0]?.tenantId;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      tenantId,
    };
  },

  async getOrganisation(tokens: OAuthTokens) {
    const data = await xeroFetch(`${API_BASE}/Organisation`, tokens);
    const org = data.Organisations?.[0];
    return {
      id: org?.OrganisationID || "",
      name: org?.Name || "",
    };
  },

  async getAccounts(tokens: OAuthTokens): Promise<AccountingAccount[]> {
    const data = await xeroFetch(`${API_BASE}/Accounts`, tokens);
    return (data.Accounts || []).map((a: Record<string, string>) => ({
      externalId: a.AccountID,
      code: a.Code || "",
      name: a.Name,
      type: a.Type,
      status: a.Status,
    }));
  },

  async getContacts(tokens: OAuthTokens): Promise<AccountingContact[]> {
    const data = await xeroFetch(`${API_BASE}/Contacts`, tokens);
    return (data.Contacts || []).map((c: Record<string, string | boolean>) => ({
      externalId: c.ContactID as string,
      name: c.Name as string,
      email: c.EmailAddress as string || undefined,
      phone: undefined,
      isSupplier: c.IsSupplier === true,
      isCustomer: c.IsCustomer === true,
    }));
  },

  async getInvoices(tokens: OAuthTokens): Promise<AccountingInvoice[]> {
    const data = await xeroFetch(`${API_BASE}/Invoices?order=Date DESC&page=1`, tokens);
    return (data.Invoices || []).map((inv: Record<string, unknown>) => ({
      externalId: inv.InvoiceID as string,
      invoiceNumber: inv.InvoiceNumber as string || "",
      contactName: (inv.Contact as Record<string, string>)?.Name || "",
      status: inv.Status as string,
      total: inv.Total as number,
      currency: inv.CurrencyCode as string || "ZAR",
      date: inv.DateString as string || "",
      dueDate: inv.DueDateString as string || undefined,
    }));
  },

  async createInvoice(tokens: OAuthTokens, invoice: Partial<AccountingInvoice>): Promise<AccountingInvoice> {
    const data = await xeroFetch(`${API_BASE}/Invoices`, tokens, {
      method: "POST",
      body: JSON.stringify({
        Invoices: [{
          Type: "ACCREC",
          Contact: { Name: invoice.contactName },
          InvoiceNumber: invoice.invoiceNumber,
          DateString: invoice.date,
          DueDateString: invoice.dueDate,
          Status: "DRAFT",
          CurrencyCode: invoice.currency || "ZAR",
          LineItems: [],
        }],
      }),
    });
    const inv = data.Invoices?.[0];
    return {
      externalId: inv?.InvoiceID || "",
      invoiceNumber: inv?.InvoiceNumber || "",
      contactName: inv?.Contact?.Name || "",
      status: inv?.Status || "DRAFT",
      total: inv?.Total || 0,
      currency: inv?.CurrencyCode || "ZAR",
      date: inv?.DateString || "",
      dueDate: inv?.DueDateString,
    };
  },
};
