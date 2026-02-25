# FlipModel ERP

Property flipping and construction project management ERP system built with Next.js, designed for South African property developers.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5 (strict mode)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Prisma 7
- **Auth**: NextAuth.js 5 (JWT + Google OAuth)
- **Validation**: Zod
- **Styling**: Tailwind CSS 4
- **Testing**: Vitest
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL database (or Neon account)

### Setup

1. Clone the repository
2. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
3. Fill in your `.env` values (see `.env.example` for required variables)
4. Install dependencies:
   ```bash
   npm install
   ```
5. Generate Prisma client and run migrations:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
6. (Optional) Seed the database:
   ```bash
   npx prisma db seed
   ```
7. Start the development server:
   ```bash
   npm run dev
   ```

## Project Structure

```
app/
├── (auth)/           # Login, signup, onboarding pages
├── (erp)/            # Protected ERP pages
│   ├── dashboard/    # KPI dashboard
│   ├── pipeline/     # Deal pipeline (Kanban + list)
│   ├── projects/     # Active project management
│   ├── contacts/     # CRM - contractors, suppliers, agents
│   ├── finance/      # Financial overview
│   ├── invoices/     # Invoice management
│   ├── tools/        # Tool/equipment locker
│   ├── reports/      # Analytics & reporting
│   ├── settings/     # Org & user settings
│   ├── suppliers/    # Supplier price comparison
│   └── documents/    # Document management
├── api/              # REST API routes
│   ├── gl/           # General Ledger (journal entries)
│   ├── payables/     # Accounts Payable (vendor bills)
│   ├── receivables/  # Accounts Receivable
│   ├── purchase-orders/ # Procurement
│   ├── inventory/    # Inventory management
│   ├── bank-accounts/ # Banking & reconciliation
│   ├── financial-statements/ # Balance sheet, P&L, trial balance
│   ├── financial-periods/    # Period management
│   ├── deals/        # Deal CRUD
│   ├── expenses/     # Expense tracking
│   ├── contacts/     # Contact CRUD
│   ├── invoices/     # Invoice CRUD
│   ├── milestones/   # Project milestones
│   ├── tasks/        # Milestone tasks
│   ├── tools/        # Tool management
│   ├── documents/    # Document uploads
│   └── ...
├── components/       # Reusable React components
├── hooks/            # Custom React hooks
├── lib/              # Core business logic
│   ├── validations/  # Zod schemas
│   ├── auth.ts       # NextAuth configuration
│   ├── db.ts         # Prisma client
│   ├── permissions.ts # RBAC system
│   ├── logger.ts     # Structured logging
│   ├── audit.ts      # Audit trail
│   ├── pagination.ts # Pagination helpers
│   └── encryption.ts # AES-256-GCM encryption
├── types/            # TypeScript type definitions
└── utils/            # Utility functions
```

## Core Modules

| Module | Description |
|--------|-------------|
| **Deal Pipeline** | 7-stage deal lifecycle (lead → sold) with Kanban board |
| **Project Management** | Milestones, tasks, contractor assignments |
| **General Ledger** | Double-entry bookkeeping with journal entries |
| **Accounts Payable** | Vendor bills, payments, aging |
| **Accounts Receivable** | Customer receivables, payment tracking |
| **Purchase Orders** | Procurement workflow with approvals |
| **Inventory** | Stock management with transactions |
| **Banking** | Bank accounts, transactions, reconciliation |
| **Financial Statements** | Balance sheet, income statement, trial balance |
| **Invoicing** | Invoice creation with line items and tax |
| **CRM** | Contact management with contractor ratings |
| **Tool Locker** | Equipment tracking, checkout/return, maintenance |

## Authorization

6-tier RBAC system with 40+ granular permissions:

| Role | Level | Access |
|------|-------|--------|
| Executive | 100 | Full access |
| Finance Manager | 70 | Finance, accounting, reports |
| Project Manager | 60 | Deals, projects, team |
| Site Supervisor | 40 | Assigned projects, tools |
| Field Worker | 20 | Tasks, tools |
| Viewer | 10 | Read-only |

## API Conventions

All list endpoints support pagination:
```
GET /api/deals?page=1&limit=50
```

Response format:
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

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run db:migrate` | Deploy database migrations |

## License

Private - All rights reserved.
