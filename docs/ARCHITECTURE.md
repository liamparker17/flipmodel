# FlipModel ERP — Architecture Reference

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16 |
| Language | TypeScript (strict) | 5 |
| UI | React | 19 |
| Styling | Tailwind CSS | 4 |
| ORM | Prisma | 7 |
| Database | PostgreSQL (Neon) | — |
| Auth | NextAuth.js (JWT + Google OAuth) | 5 |
| Validation | Zod | 4 |
| Testing | Vitest (unit) + Playwright (E2E) | 3 / 1.58 |
| Error Monitoring | Sentry | @sentry/nextjs |
| Deployment | Vercel | auto-deploy from main |

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Vercel Edge                         │
│  ┌───────────┐                                          │
│  │ proxy.ts  │  Auth check + CSRF validation            │
│  └─────┬─────┘                                          │
│        │                                                │
│  ┌─────▼──────────────────────────────────────────────┐ │
│  │              Next.js App Router                     │ │
│  │                                                     │ │
│  │  ┌──────────────┐      ┌──────────────────────┐    │ │
│  │  │  Pages (UI)  │      │   API Routes (/api)  │    │ │
│  │  │  React 19    │─────>│   Route Handlers     │    │ │
│  │  │  Client-side │fetch │   Server-side        │    │ │
│  │  └──────────────┘      └──────────┬───────────┘    │ │
│  │                                    │                │ │
│  │                         ┌──────────▼───────────┐    │ │
│  │                         │   Business Logic     │    │ │
│  │                         │   api-helpers.ts      │    │ │
│  │                         │   permissions.ts      │    │ │
│  │                         │   validations/*.ts    │    │ │
│  │                         │   audit.ts            │    │ │
│  │                         └──────────┬───────────┘    │ │
│  │                                    │                │ │
│  │                         ┌──────────▼───────────┐    │ │
│  │                         │   Prisma ORM         │    │ │
│  │                         │   52 models           │    │ │
│  │                         └──────────┬───────────┘    │ │
│  └─────────────────────────────────────┼──────────────┘ │
└────────────────────────────────────────┼────────────────┘
                                         │
                              ┌──────────▼───────────┐
                              │   Neon PostgreSQL     │
                              │   (eu-west-2)         │
                              └──────────────────────┘
```

## Directory Structure

```
flipmodel/
├── app/
│   ├── (erp)/                    # Authenticated ERP pages (layout group)
│   │   ├── layout.tsx            # Sidebar + main content layout
│   │   ├── error.tsx             # Error boundary (Sentry-integrated)
│   │   ├── dashboard/page.tsx
│   │   ├── pipeline/page.tsx     # Deal kanban board
│   │   ├── contacts/page.tsx
│   │   ├── invoices/page.tsx
│   │   ├── finance/page.tsx      # Expenses, cash flow, P&L
│   │   ├── projects/page.tsx
│   │   ├── tools/page.tsx
│   │   ├── settings/page.tsx     # Org settings, RBAC config
│   │   ├── team/page.tsx         # Member management
│   │   └── ... (19 pages total)
│   │
│   ├── api/                      # API route handlers (70 routes)
│   │   ├── auth/                 # NextAuth + signup
│   │   ├── deals/                # Pipeline CRUD + import
│   │   ├── contacts/             # Contact management
│   │   ├── invoices/             # Invoice CRUD
│   │   ├── expenses/             # Expense tracking
│   │   ├── gl/                   # General ledger (journal entries)
│   │   ├── payables/             # Accounts payable (vendor bills)
│   │   ├── receivables/          # Accounts receivable
│   │   ├── purchase-orders/      # PO management + approval
│   │   ├── inventory/            # Stock items + transactions
│   │   ├── bank-accounts/        # Banking + reconciliation
│   │   ├── financial-statements/ # Trial balance, P&L, balance sheet
│   │   ├── financial-periods/    # Period management + close
│   │   ├── hr/                   # Employees, leave, payslips
│   │   ├── org/                  # Organization + members + departments
│   │   └── ...
│   │
│   ├── lib/                      # Shared server-side logic
│   │   ├── api-helpers.ts        # Auth context, response helpers
│   │   ├── auth.ts               # NextAuth config
│   │   ├── db.ts                 # Prisma client singleton
│   │   ├── permissions.ts        # RBAC role-permission matrix
│   │   ├── pagination.ts         # Pagination utilities
│   │   ├── audit.ts              # Audit trail logging
│   │   ├── logger.ts             # Structured JSON logging
│   │   ├── constants.ts          # Centralized constants
│   │   ├── cache.ts              # Cache tags and TTLs
│   │   ├── field-encryption.ts   # AES-256-GCM field encryption
│   │   ├── email.ts              # Pluggable email service
│   │   ├── rate-limit.ts         # Rate limiting
│   │   ├── validations/          # Zod schemas (12 files)
│   │   └── accounting/           # Xero/QuickBooks integrations
│   │
│   ├── hooks/api/                # Client-side data fetching hooks
│   ├── components/               # Shared React components
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Client-side utilities
│
├── prisma/
│   ├── schema.prisma             # Database schema (52 models)
│   └── migrations/               # Migration history
│
├── e2e/                          # Playwright E2E tests
├── docs/                         # API.md, ARCHITECTURE.md
├── .github/workflows/ci.yml     # CI pipeline (5 jobs)
├── proxy.ts                      # Auth + CSRF middleware
├── next.config.mjs               # Security headers, Sentry
├── CLAUDE.md                     # AI assistant context
└── sentry.*.config.ts            # Error monitoring
```

## Auth Flow

```
Request
  │
  ▼
proxy.ts
  ├── Static asset? → pass through
  ├── Public path (/login, /signup, /api/auth)? → pass through
  ├── No session cookie? → redirect to /login
  ├── GET/HEAD/OPTIONS? → set CSRF cookie, pass through
  └── POST/PUT/PATCH/DELETE on /api/*?
      ├── CSRF token mismatch? → 403
      └── Valid? → pass to route handler
              │
              ▼
        Route Handler
          ├── requireOrgMember() → validates session, loads org membership
          └── requirePermission("module:action") → checks RBAC matrix
```

## RBAC Model

**6 Roles** (hierarchy by level):
- `executive` (100) — full access
- `finance_manager` (70) — finance, accounting, HR read
- `project_manager` (60) — pipeline, projects, contacts, tools
- `site_supervisor` (40) — projects, tools, documents, inventory read
- `field_worker` (20) — dashboard, projects, tools, documents
- `viewer` (10) — read-only

**65 permissions** across **21 modules** in format `module:action`.

Permission resolution: role defaults → member overrides → final permission set.

## Database Schema (52 Models)

**Auth & Organization**
- User, Account, Session, VerificationToken, OAuthState
- Organisation, Department, OrgMember

**Deal Pipeline**
- Deal, DealContact, Expense, Milestone, Task, Activity
- Contact, ContractorRating, Document, ShoppingListItem

**Finance & Accounting**
- ChartOfAccount, AccountingConnection, AccountingSync
- Invoice, Loan

**General Ledger**
- FinancialPeriod, JournalEntry, JournalLine

**Accounts Payable**
- VendorBill, VendorBillLine, BillPayment

**Accounts Receivable**
- CustomerReceivable, ReceivablePayment

**Procurement**
- PurchaseOrder, PurchaseOrderLine, GoodsReceipt

**Inventory**
- InventoryItem, InventoryTransaction

**Banking**
- BankAccount, BankTransaction

**Tools & Equipment**
- Tool, ToolCheckout, ToolMaintenance, ToolIncident

**Property**
- Inspection, Defect, Permit, InsurancePolicy, ComparableSale

**HR & Payroll**
- Employee, LeaveRecord, Payslip

**System**
- AuditLog, Notification

### Multi-tenancy

Every entity has `orgId`. All queries MUST filter by `orgId: ctx.orgId`. The `requireOrgMember()` helper returns the org context with `orgId` and `userId`.

## Security Measures

| Measure | Implementation |
|---------|---------------|
| Authentication | NextAuth JWT + Google OAuth |
| Authorization | RBAC with 65 permissions, 6 roles |
| CSRF | Double-submit cookie (proxy.ts) |
| Input Validation | Zod schemas on all POST/PATCH |
| SQL Injection | Prisma ORM (no raw SQL) |
| XSS | React auto-escaping + CSP headers |
| Security Headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options |
| Encryption at Rest | AES-256-GCM for bank details, OAuth tokens |
| Audit Trail | All financial operations logged to AuditLog table |
| Error Sanitization | Generic messages to client, details in server logs |
| Rate Limiting | In-memory (serverless-aware with KV migration path) |
| Error Monitoring | Sentry (client + server + edge) |

## Deployment

- **Platform**: Vercel (auto-deploy from `main` branch)
- **Database**: Neon PostgreSQL (eu-west-2)
- **Build**: `prisma generate && next build`
- **CI**: GitHub Actions — lint, typecheck, test, security audit, build
- **Env vars**: Managed in Vercel dashboard (see `.env.example`)
