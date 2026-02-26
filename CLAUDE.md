# CLAUDE.md - FlipModel Codebase Reference

## Project Overview

FlipModel is a **property flipping ERP** (Enterprise Resource Planning) application for managing real estate renovation deals in South Africa. It tracks deals through a pipeline (lead -> acquisition -> renovation -> sale), manages finances, contractors, tools, inventory, HR/payroll, and full double-entry accounting.

**Tech stack:** Next.js 16.1.6, React 19, TypeScript 5, Prisma 7 (PostgreSQL via `@prisma/adapter-pg`), NextAuth v5 (JWT strategy), Zod 4 validation, Tailwind CSS 4, Sentry error tracking, Vitest + Playwright for testing.

**Deployment target:** Vercel (Node.js runtime). Currency: ZAR (South African Rand). Timezone: Africa/Johannesburg.

**Path alias:** `@/*` maps to `./app/*` (set in tsconfig.json).

---

## Architecture

### Directory Structure

```
app/
  (auth)/              # Auth pages (login, signup, onboarding)
  (erp)/               # Main ERP pages (deals, contacts, invoices, tools, etc.)
  api/                 # API routes (Next.js App Router)
    accounting/        # Xero/QuickBooks integration
    activities/        # Activity log
    auth/              # Auth endpoints (signup, callbacks)
    bank-accounts/     # Banking module
    contacts/          # Contact CRUD
    deals/             # Deal pipeline CRUD
    documents/         # Document management
    expenses/          # Expense tracking
    financial-periods/ # Fiscal period management
    financial-statements/ # P&L, balance sheet
    gl/                # General ledger / journal entries
    health/            # Health check endpoint
    hr/                # HR: employees, leave, payslips
    inventory/         # Inventory items & transactions
    invoices/          # Invoice CRUD
    milestones/        # Project milestones
    notifications/     # User notifications
    org/               # Organisation CRUD
    payables/          # Vendor bills & payments
    purchase-orders/   # PO management
    receivables/       # Customer receivables & payments
    search/            # Global search
    shopping-list/     # Material shopping lists
    tasks/             # Task management
    tools/             # Tool tracking & checkout
    upload/            # File uploads
    user/              # User profile
  components/          # Shared React components
  data/                # Static data files
  hooks/               # React hooks
    api/               # Data fetching hooks (useApiDeals, useApiTools, etc.)
  lib/                 # Server-side utilities
    accounting/        # Accounting provider integrations
    validations/       # Zod schemas (one per domain)
    __tests__/         # Unit tests for lib modules
  types/               # TypeScript type definitions
  utils/               # Client-side utility functions
    __tests__/         # Unit tests for utils
prisma/
  schema.prisma        # Database schema (52+ models)
  seed.ts              # Database seeder
proxy.ts               # Middleware (auth gate + CSRF protection)
```

### Data Flow

```
UI Component (useState/useCallback)
  -> fetch("/api/...") or custom hook (useApiDeals, useApiTools)
    -> API Route (app/api/.../route.ts)
      -> requireOrgMember() / requirePermission() [auth check]
      -> Zod schema.parse(body) [validation]
      -> prisma.model.findMany({ where: { orgId } }) [DB query - always scoped to org]
      -> writeAuditLog() [for financial writes]
      -> apiSuccess(data) / paginatedResult(data, total, pagination)
```

### Auth Flow

```
Browser request
  -> proxy.ts (middleware)
    -> Check JWT cookie (authjs.session-token)
    -> If missing: redirect to /login
    -> If present + mutating API call: validate CSRF double-submit cookie
  -> API Route
    -> requireOrgMember() / requirePermission()
      -> auth() [NextAuth session from JWT]
      -> prisma.orgMember.findFirst({ where: { userId, isActive: true } })
      -> hasPermission(member, permission) [check RBAC matrix]
```

---

## Key Patterns

### Financial Transaction Pattern (REQUIRED for all financial writes)

```typescript
import { withFinancialTransaction } from "@/lib/financial-transaction";

const result = await withFinancialTransaction({
  tx: async (tx) => {
    // All reads and writes use `tx` (not `prisma`) for atomicity
    const bill = await tx.vendorBill.findFirst({ where: { id, orgId } });
    // ... business logic ...
    return result;
  },
  audit: (result) => ({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: "payment",
    entityType: "VendorBill",
    entityId: billId,
    metadata: { paymentId: result.payment.id },
  }),
  isolationLevel: "Serializable", // Default — never weaken for financial ops
});
```

The `withFinancialTransaction` wrapper guarantees:
1. Business logic + audit log are atomically committed or rolled back
2. Serializable isolation prevents phantom reads and write skew
3. No audit gaps from server crashes between commit and audit write

### API Route Template (GET with Pagination)

```typescript
import { NextRequest } from "next/server";
import prisma from "@/lib/db";
import { requireOrgMember, requirePermission, apiSuccess, handleApiError } from "@/lib/api-helpers";
import { parsePagination, paginatedResult } from "@/lib/pagination";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requirePermission("module:read");  // Use requirePermission, not requireOrgMember, for financial routes
    const pagination = parsePagination(req);

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    // Add filters from query params as needed

    const [total, items] = await Promise.all([
      prisma.myModel.count({ where }),
      prisma.myModel.findMany({
        where,
        take: pagination.limit,
        skip: pagination.skip,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    return apiSuccess(paginatedResult(items, total, pagination));
  } catch (error) {
    return handleApiError(error);
  }
}
```

### API Route Template (POST with Validation + Audit)

```typescript
import { writeAuditLog } from "@/lib/audit";
import { createMyModelSchema } from "@/lib/validations/mymodel";

export async function POST(req: NextRequest) {
  try {
    const ctx = await requirePermission("module:write");
    const body = await req.json();
    const data = createMyModelSchema.parse(body);

    const item = await prisma.myModel.create({
      data: {
        orgId: ctx.orgId,
        userId: ctx.userId,
        ...data,
      },
    });

    await writeAuditLog({
      orgId: ctx.orgId,
      userId: ctx.userId,
      action: "create",
      entityType: "MyModel",
      entityId: item.id,
    });

    return apiSuccess(item, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
```

### `withApi` Wrapper (Alternative Pattern)

```typescript
import { withApi } from "@/lib/api-helpers";

export const GET = withApi("deals:read", async (req, ctx) => {
  // ctx has { userId, orgId, member }
  // Error handling is automatic
  const deals = await prisma.deal.findMany({ where: { orgId: ctx.orgId } });
  return apiSuccess(deals);
});
```

### Frontend Page Pattern

```typescript
"use client";
import { useState, useEffect, useMemo } from "react";

export default function MyPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/my-items");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setItems(json.data || json);  // Handle both paginated and raw responses
    } catch { /* handle error */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, []);
  // ... render
}
```

### Frontend Hook Pattern (useApiDeals style)

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";

export default function useApiMyModel() {
  const [items, setItems] = useState<MyModel[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const raw = await api("/api/my-models");
      setItems((raw.data ?? raw).map(dbToClient));
    } catch { }
    finally { setLoaded(true); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const create = useCallback(async (data: CreateInput) => {
    const raw = await api("/api/my-models", { method: "POST", body: JSON.stringify(data) });
    setItems(prev => [dbToClient(raw), ...prev]);
  }, []);

  return { items, loaded, create };
}
```

### Validation Schema Pattern (Zod)

```typescript
// app/lib/validations/mymodel.ts
import { z } from "zod";

export const createMyModelSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  amount: z.number().min(0),
  status: z.string().optional(),
  date: z.string().min(1),
  notes: z.string().optional(),
});

export const updateMyModelSchema = createMyModelSchema.partial();
```

### Test File Pattern

```typescript
// app/lib/validations/__tests__/mymodel.test.ts
import { describe, it, expect } from "vitest";
import { createMyModelSchema } from "../mymodel";

describe("createMyModelSchema", () => {
  it("accepts valid data", () => {
    const result = createMyModelSchema.safeParse({ name: "Test", amount: 100 });
    expect(result.success).toBe(true);
  });

  it("rejects missing required field", () => {
    const result = createMyModelSchema.safeParse({ amount: 100 });
    expect(result.success).toBe(false);
  });
});
```

---

## Database

### All Prisma Models (52 models, grouped by domain)

**Auth & Platform:**
User, Account, Session, VerificationToken, Organisation, Department, OrgMember, AuditLog

**Deal Pipeline:**
Deal, Expense, Milestone, Task, Activity, Contact, DealContact, Document, ShoppingListItem

**Finance & Accounting:**
Invoice, Loan, JournalEntry (has `version` for optimistic locking), JournalLine, JournalEntrySequence, FinancialPeriod, ChartOfAccount, AccountingConnection, AccountingSync, OAuthState

**Accounts Payable:**
VendorBill (has `version`), VendorBillLine, BillPayment (has `idempotencyKey`, unique per org)

**Accounts Receivable:**
CustomerReceivable (has `version`), ReceivablePayment (has `idempotencyKey`, unique per org)

**Procurement & Inventory:**
PurchaseOrder, PurchaseOrderLine, GoodsReceipt, InventoryItem, InventoryTransaction

**Banking:**
BankAccount, BankTransaction

**Tools & Equipment:**
Tool, ToolCheckout, ToolMaintenance, ToolIncident

**HR & Payroll:**
Employee, LeaveRecord, Payslip

**Property & Compliance:**
Inspection, Defect, Permit, ComparableSale, InsurancePolicy, ContractorRating, Notification

### Key Relations

- `Organisation` -> has many `OrgMember`, `Deal`, `Expense`, `Contact`, `Tool`, etc. (all business data)
- `User` -> has many `OrgMember` (can belong to multiple orgs)
- `Deal` -> has many `Expense`, `Milestone`, `Activity`, `DealContact`, `Document`, `ShoppingListItem`
- `Milestone` -> has many `Task`
- `Contact` -> linked to deals via `DealContact` (many-to-many)
- `JournalEntry` -> has many `JournalLine` (double-entry)
- `VendorBill` -> has many `VendorBillLine`, `BillPayment`
- `PurchaseOrder` -> has many `PurchaseOrderLine`, `GoodsReceipt`
- `Employee` -> has many `LeaveRecord`, `Payslip`

### Multi-Tenancy

**ALL database queries MUST include `orgId` in the where clause.** The org context is obtained from `requireOrgMember()` or `requirePermission()` which returns `ctx.orgId`.

---

## RBAC System

### 6 Roles (with hierarchy levels)

| Role | Level | Description |
|------|-------|-------------|
| `executive` | 100 | Owner/Director -- full access |
| `finance_manager` | 70 | Accountant -- finance, invoices, reports |
| `project_manager` | 60 | PM -- deals, projects, contractors, tools |
| `site_supervisor` | 40 | On-site lead -- assigned projects, tasks |
| `field_worker` | 20 | Labourer -- assigned tasks only |
| `viewer` | 10 | Read-only stakeholder/investor |

### Permission Format

`module:action` (e.g., `deals:read`, `expenses:write`, `expenses:approve`, `bank:reconcile`)

### Key Modules & Permissions

- **deals:** read, write, delete
- **expenses:** read, write, approve
- **invoices / contacts / milestones / tasks / documents / tools:** read, write
- **tools:** additional `checkout` action
- **accounting / gl / settings / org:** read, write
- **payables / receivables:** read, write
- **purchase_orders:** read, write, approve
- **inventory:** read, write
- **bank:** read, write, reconcile
- **hr:** read, write, approve
- **payroll:** read, write
- **team:** read, manage

### Permission Overrides

Each `OrgMember` can have `permissionOverrides` and `moduleOverrides` (JSON) to grant/revoke specific permissions beyond their role defaults.

### How to Add a New Permission

1. Add the permission string to the `Permission` type union in `app/types/org.ts`
2. Add it to the relevant roles in `DEFAULT_ROLE_PERMISSIONS` in `app/lib/permissions.ts`
3. If it belongs to a new module, add the module to `ModuleKey` type and `DEFAULT_ROLE_MODULES`
4. Update team settings UI to show the new permission label

---

## API Response Format

```typescript
// Success (single item)
apiSuccess(data, status?)  // -> NextResponse.json(data, { status: 200 })

// Success (paginated)
apiSuccess(paginatedResult(items, total, pagination))
// -> { data: T[], pagination: { page, limit, total, totalPages, hasMore } }

// Error
apiError(message, status?)  // -> NextResponse.json({ error: message }, { status: 400 })
```

**Paginated response shape:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142,
    "totalPages": 3,
    "hasMore": true
  }
}
```

**Frontend extraction pattern:** `const items = json.data || json;` (handles both paginated and raw).

---

## File Locations (Quick Reference)

| What | Path |
|------|------|
| Auth config (NextAuth) | `app/lib/auth.ts` |
| DB client (Prisma) | `app/lib/db.ts` |
| API helpers (auth, response, errors) | `app/lib/api-helpers.ts` |
| Financial transaction wrapper | `app/lib/financial-transaction.ts` |
| Optimistic locking helper | `app/lib/optimistic-lock.ts` |
| Pagination | `app/lib/pagination.ts` |
| RBAC permissions | `app/lib/permissions.ts` |
| Types (Permission, OrgRole, ModuleKey) | `app/types/org.ts` |
| Audit logging | `app/lib/audit.ts` |
| Structured logger | `app/lib/logger.ts` |
| Constants (VAT, budget thresholds) | `app/lib/constants.ts` |
| Caching (tags, TTL) | `app/lib/cache.ts` |
| Field encryption | `app/lib/field-encryption.ts` + `app/lib/encryption.ts` |
| Rate limiting | `app/lib/rate-limit.ts` |
| Email sending | `app/lib/email.ts` |
| Validation schemas | `app/lib/validations/{domain}.ts` |
| Type definitions | `app/types/{domain}.ts` |
| Frontend hooks | `app/hooks/api/useApi{Model}.ts` |
| Middleware (proxy) | `proxy.ts` (root) |
| Prisma schema | `prisma/schema.prisma` |
| Prisma seed | `prisma/seed.ts` |
| Prisma config | `prisma.config.ts` (env vars loaded from `.env.local`) |
| Next.js config | `next.config.mjs` |
| Vitest config | `vitest.config.ts` |
| Playwright config | `playwright.config.ts` |
| Sentry configs | `sentry.{client,server,edge}.config.ts` |

### Validation Schema Files

| File | Exports |
|------|---------|
| `validations/auth.ts` | `signupSchema` |
| `validations/deal.ts` | `createDealSchema`, `updateDealSchema` |
| `validations/expense.ts` | `createExpenseSchema`, `updateExpenseSchema` |
| `validations/contact.ts` | `createContactSchema`, `updateContactSchema` |
| `validations/tool.ts` | `createToolSchema`, `updateToolSchema`, `checkoutToolSchema`, `returnToolSchema` |
| `validations/gl.ts` | `createJournalEntrySchema`, `updateJournalEntrySchema`, `postJournalEntrySchema` |
| `validations/bank.ts` | `createBankAccountSchema`, `updateBankAccountSchema`, `createBankTransactionSchema`, `reconcileTransactionSchema` |
| `validations/hr.ts` | `createEmployeeSchema`, `updateEmployeeSchema`, `createLeaveSchema`, `updateLeaveSchema`, `createPayslipSchema`, `updatePayslipSchema` |
| `validations/payables.ts` | `createVendorBillSchema`, `updateVendorBillSchema`, `createBillPaymentSchema` |
| `validations/receivables.ts` | `createReceivableSchema`, `updateReceivableSchema`, `createReceivablePaymentSchema` |
| `validations/purchase-orders.ts` | `createPurchaseOrderSchema`, `updatePurchaseOrderSchema`, `approvePurchaseOrderSchema` |
| `validations/inventory.ts` | `createInventoryItemSchema`, `updateInventoryItemSchema`, `createInventoryTransactionSchema` |

### Financial API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/gl` | GET | List journal entries (requires `accounting:read`) |
| `/api/gl` | POST | Create draft journal entry (Serializable tx) |
| `/api/gl/[entryId]` | PATCH | Update draft entry (optimistic locking via `version`) |
| `/api/gl/[entryId]/post` | POST | Post entry (re-validates balance, account codes, financial period inside Serializable tx) |
| `/api/gl/[entryId]/reverse` | POST | Reverse a posted entry (mirrors debits/credits, prevents double reversal) |
| `/api/payables` | GET | List vendor bills (requires `payables:read`) |
| `/api/payables` | POST | Create draft vendor bill |
| `/api/payables/[billId]` | PATCH | Update bill (optimistic locking via `version`) |
| `/api/payables/[billId]/approve` | POST | Approve bill (draft -> approved) |
| `/api/payables/[billId]/pay` | POST | Record payment (Serializable tx, idempotency via `x-idempotency-key` header) |
| `/api/payables/[billId]/pay/[paymentId]` | DELETE | Delete payment (Serializable tx, recalculates amountPaid/status) |
| `/api/receivables/[receivableId]/pay` | POST | Record payment (Serializable tx, idempotency via `x-idempotency-key` header) |
| `/api/receivables/[receivableId]/pay/[paymentId]` | DELETE | Delete payment (Serializable tx, recalculates amountPaid/status) |

---

## Common Tasks

### How to Add a New API Endpoint

1. Create `app/api/{resource}/route.ts`
2. Import: `prisma`, `requireOrgMember`/`requirePermission`, `apiSuccess`, `handleApiError`, `parsePagination`, `paginatedResult`
3. Create Zod validation schema in `app/lib/validations/{resource}.ts`
4. Implement GET (with pagination + orgId filter) and POST (with validation + audit)
5. For single-item routes: `app/api/{resource}/[id]/route.ts` with GET, PATCH, DELETE
6. Add tests in `app/lib/validations/__tests__/{resource}.test.ts` or `app/api/{resource}/__tests__/`

### How to Add a New Prisma Model

1. Add the model to `prisma/schema.prisma` (include `orgId String` + relation to Organisation)
2. Run `npx prisma migrate dev --name add_my_model`
3. Run `npx prisma generate` (also runs automatically in `npm run build`)
4. Add the Organisation relation: add field to Organisation model's relation list
5. Create API routes and validation schemas

### How to Add a New Permission

1. Add to `Permission` type in `app/types/org.ts` (e.g., `"mymodule:read" | "mymodule:write"`)
2. Add to `ModuleKey` type if new module (e.g., `"mymodule"`)
3. Add to `DEFAULT_ROLE_PERMISSIONS` in `app/lib/permissions.ts` for each role
4. Add to `DEFAULT_ROLE_MODULES` in `app/lib/permissions.ts` if new module
5. Update settings/team UI to display the new permission labels

### How to Add Tests

- **Validation tests:** `app/lib/validations/__tests__/{name}.test.ts`
- **Lib unit tests:** `app/lib/__tests__/{name}.test.ts`
- **API route tests:** `app/api/{resource}/__tests__/{name}.test.ts`
- **Utility tests:** `app/utils/__tests__/{name}.test.ts`
- Run: `npm test` (single run) or `npm run test:watch` (watch mode)
- Framework: Vitest with `globals: true` (no need to import `describe`/`it`/`expect` but doing so is fine)
- Path alias `@/` works in tests via vitest.config.ts resolve alias

---

## Environment Variables

### Required

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | App base URL (e.g., `http://localhost:3000`) |
| `NEXTAUTH_SECRET` | NextAuth JWT secret (auto-set by NextAuth in dev) |

### Optional

| Variable | Purpose |
|----------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ENCRYPTION_KEY` | AES key for field-level encryption (bank details) |
| `LOG_LEVEL` | Logging level: `debug`, `info` (default), `warn`, `error` |
| `RESEND_API_KEY` | Resend email API key |
| `EMAIL_FROM` | Email sender address (default: `FlipModel <noreply@flipmodel.co.za>`) |
| `EMAIL_PROVIDER` | Email provider: `resend` or `log` (default) |
| `RATE_LIMIT_KV_URL` | KV store URL for distributed rate limiting |
| `XERO_CLIENT_ID` | Xero accounting integration |
| `XERO_CLIENT_SECRET` | Xero accounting integration |
| `QUICKBOOKS_CLIENT_ID` | QuickBooks integration |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks integration |
| `QUICKBOOKS_SANDBOX` | `"true"` for sandbox mode |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN for error tracking |
| `SENTRY_ORG` | Sentry organisation slug |
| `SENTRY_PROJECT` | Sentry project slug |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start dev server |
| `npm run build` | `prisma generate && next build` |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm test` | `vitest run` (single run) |
| `npm run test:watch` | `vitest` (watch mode) |
| `npm run db:migrate` | `prisma migrate deploy` (production) |
| `npx prisma migrate dev` | Create + apply migration (development) |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma studio` | Open Prisma Studio GUI |
| `npx tsx prisma/seed.ts` | Seed database |

---

## Important Notes

- **proxy.ts replaces middleware.ts.** Next.js 16 uses `proxy.ts` at the project root as the middleware entry point. It handles auth redirects and CSRF protection.

- **CSRF protection:** Double-submit cookie pattern. On safe requests (GET/HEAD/OPTIONS), a `csrf-token` cookie is set. On mutating API requests (POST/PATCH/DELETE), the frontend MUST send an `x-csrf-token` header matching the cookie value.

- **Financial operations MUST use `withFinancialTransaction()`** from `@/lib/financial-transaction.ts` for atomicity. This wraps business logic + audit log in a single Serializable transaction. Never use raw `prisma.$transaction()` for financial writes.

- **All server-side logging must use `logger` from `@/lib/logger`**, never `console.log`. The logger outputs structured JSON with level, message, timestamp, and optional data.

- **Sensitive fields** (bank account numbers, branch codes) are encrypted at rest using `encryptSensitiveFields()` from `@/lib/field-encryption.ts`. Decrypt with `decryptSensitiveFields()`. Mask for display with `maskSensitiveField()`.

- **Audit trail is required** for all financial write operations (journal entries, payments, payroll, etc.). Use `withFinancialTransaction()` to write audit logs atomically inside the transaction. Valid audit actions: `create`, `update`, `delete`, `delete_payment`, `approve`, `reject`, `login`, `logout`, `post`, `reverse`, `reconcile`, `payment`.

- **South African context:** VAT rate is 15% (`SA_VAT_RATE = 0.15`), default currency is ZAR, fiscal year typically starts in March.

- **Public paths** (no auth required): `/login`, `/signup`, `/onboarding`, `/api/auth`, `/api/accounting/webhooks`, `/api/health`.

- **Pagination defaults:** 50 items per page, max 200 (`MAX_LIMIT`). Constants file has `DEFAULT_PAGE_SIZE = 20` and `MAX_PAGE_SIZE = 100` (used in some contexts).

- **Budget thresholds:** Alert at 80%, warning at 100%, hard limit at 120% of budget. Budget override returns structured error: `{ code: "BUDGET_LIMIT_EXCEEDED", canOverride: true }`.

- **DB client** uses `@prisma/adapter-pg` (native PostgreSQL pool) instead of Prisma's default connection handling. The singleton pattern prevents multiple instances in development.

- **Env vars are in `.env.local`** (not `.env`). The `prisma.config.ts` loads env via `dotenv/config`. For interactive migrations use `source .env.local && npx prisma migrate dev`. For deploy: `source .env.local && npx prisma migrate deploy`.

---

## Financial Integrity Rules (Production Hardened)

These rules are enforced in code and must NOT be weakened:

1. **Journal entries must be balanced to post.** The post route re-fetches lines inside a Serializable transaction and rejects if `|debits - credits| >= 0.01`. Never trust client-submitted totals.

2. **Account codes are validated on post.** All `accountCode` values in journal lines are checked against `ChartOfAccount` (active, same org) inside the post transaction.

3. **Financial period enforcement.** Posting or reversing a journal entry into a closed/locked `FinancialPeriod` is rejected. The `periodName` is set on successful post.

4. **Vendor bills require approval before payment.** Status flow: `draft` -> `approved` -> `partially_paid` -> `paid`. The payment route rejects bills that are not `approved` or `partially_paid`.

5. **Receivable totalAmount is immutable after payments.** If `amountPaid > 0` or `status !== "outstanding"`, PATCH rejects changes to `totalAmount`.

6. **Payments can be deleted (reversed).** DELETE endpoints recalculate `amountPaid` from remaining payments via aggregate, inside a Serializable transaction. Payments linked to posted journal entries are blocked — reverse the JE first.

7. **Optimistic locking.** `JournalEntry`, `VendorBill`, and `CustomerReceivable` have a `version` field. PATCH routes check `version` from request body against DB and return 409 on mismatch. Version is incremented on every update.

8. **Idempotency on payments.** Payment routes accept an `x-idempotency-key` header. The key is stored and unique per org. Duplicate keys return the existing payment (safe replay).

9. **Validation enums.** `currency` is restricted to `ZAR | USD | EUR | GBP`. `paymentMethod` is restricted to `eft | cash | card | cheque`. Expense `amount` must be `positive()`. Vendor bill `subtotal + tax` must equal `total`, and line amounts must sum to `subtotal`.

10. **Error classes.** `api-helpers.ts` exports: `AuthError`, `NoOrgError`, `ForbiddenError`, `NotFoundError`, `ValidationError`, `BudgetExceededError`. `handleApiError()` maps these + Prisma `P2002` (409 with field names) and `P2025` (404) to structured responses.
