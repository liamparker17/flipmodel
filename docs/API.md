# FlipModel ERP -- API Reference

> **Canonical reference for every API endpoint.** Generated from route handler source code.
> Last updated: 2026-02-26

---

## Table of Contents

1. [Conventions](#conventions)
2. [Authentication (auth)](#1-authentication)
3. [User Profile](#2-user-profile)
4. [Organisation](#3-organisation)
5. [Deals / Pipeline](#4-deals--pipeline)
6. [Contacts](#5-contacts)
7. [Invoices](#6-invoices)
8. [Expenses](#7-expenses)
9. [General Ledger](#8-general-ledger)
10. [Accounts Payable](#9-accounts-payable)
11. [Accounts Receivable](#10-accounts-receivable)
12. [Purchase Orders](#11-purchase-orders)
13. [Inventory](#12-inventory)
14. [Banking](#13-banking)
15. [Financial Reporting](#14-financial-reporting)
16. [Financial Periods](#15-financial-periods)
17. [HR / Payroll](#16-hr--payroll)
18. [Documents](#17-documents)
19. [Tools & Equipment](#18-tools--equipment)
20. [Notifications](#19-notifications)
21. [Activities](#20-activities)
22. [Shopping List](#21-shopping-list)
23. [Milestones](#22-milestones)
24. [Tasks](#23-tasks)
25. [Assignments](#24-assignments)
26. [Search](#25-search)
27. [Export / Import](#26-export--import)
28. [Accounting Integrations](#27-accounting-integrations)
29. [Health Check](#28-health-check)

---

## Conventions

### Base URL

```
https://<your-domain>/api
```

In development: `http://localhost:3000/api`

### Authentication

All endpoints (except `/api/health` and `/api/auth/*`) require an authenticated session.

- **Method:** Session cookie managed by NextAuth.js (Auth.js v5).
- The session cookie is set automatically after sign-in via `/api/auth/signin` or after calling `POST /api/auth/signup`.
- Include the cookie header in all requests.

### CSRF Protection

Mutation endpoints (POST, PATCH, PUT, DELETE) require the `x-csrf-token` header on the client side when using NextAuth's built-in CSRF protection. The CSRF token is obtained from the NextAuth CSRF cookie.

### Pagination

All list (GET) endpoints that return collections support pagination via query parameters:

| Parameter | Type    | Default | Max | Description              |
|-----------|---------|---------|-----|--------------------------|
| `page`    | integer | 1       | --  | Page number (1-indexed)  |
| `limit`   | integer | 50      | 200 | Items per page           |

**Paginated response shape:**

```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 142,
    "totalPages": 3,
    "hasMore": true
  }
}
```

### Success Response

Successful responses return data directly as the JSON body (not wrapped in a `data` key at the top level, unless it is a paginated response). Status codes:

| Code | Meaning              |
|------|----------------------|
| 200  | OK                   |
| 201  | Created              |

### Error Response

```json
{
  "error": "Human-readable error message"
}
```

| Code | Meaning                                  |
|------|------------------------------------------|
| 400  | Validation error / bad request           |
| 401  | Not authenticated                        |
| 403  | Forbidden (no org membership or missing permission) |
| 404  | Resource not found                       |
| 409  | Conflict (e.g. duplicate email)          |
| 429  | Rate limited                             |
| 500  | Internal server error                    |

### RBAC (Role-Based Access Control)

Permissions are checked via `requirePermission("permission:name")` or `requireOrgMember()` (any org member).

**Roles (highest to lowest):**

| Role              | Level | Description                           |
|-------------------|-------|---------------------------------------|
| `executive`       | 100   | Owner/Director -- full access         |
| `finance_manager` | 70    | Accountant -- finance focus           |
| `project_manager` | 60    | PM -- deals, projects, tools          |
| `site_supervisor` | 40    | On-site lead -- assigned projects     |
| `field_worker`    | 20    | Labourer -- assigned tasks only       |
| `viewer`          | 10    | Read-only stakeholder/investor        |

Each role has a default permission set. Per-member overrides are supported via `permissionOverrides` and `moduleOverrides` JSON fields.

---

## 1. Authentication

### `GET|POST /api/auth/*`

NextAuth.js catch-all handler. Provides:

- `GET /api/auth/signin` -- Sign-in page
- `POST /api/auth/callback/credentials` -- Credentials sign-in
- `GET /api/auth/signout` -- Sign-out
- `GET /api/auth/session` -- Get current session
- `GET /api/auth/csrf` -- Get CSRF token
- `GET /api/auth/providers` -- List providers

---

### `POST /api/auth/signup`

Create a new user account.

**Permission:** None (public, rate-limited: 5 requests per 15 minutes per IP)

**Request body:**

| Field      | Type   | Required | Validation                                    |
|------------|--------|----------|-----------------------------------------------|
| `name`     | string | Yes      | 1-100 chars                                   |
| `email`    | string | Yes      | Valid email                                    |
| `password` | string | Yes      | Min 10 chars, 1 uppercase, 1 lowercase, 1 digit |
| `company`  | string | No       | Max 100 chars                                 |

**Success response (201):**

```json
{
  "id": "cuid_...",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Errors:**

| Code | Condition                    |
|------|------------------------------|
| 409  | Email already exists         |
| 429  | Rate limit exceeded          |

---

## 2. User Profile

### `GET /api/user/profile`

Get the authenticated user's profile.

**Permission:** `requireAuth()` (any authenticated user)

**Response (200):**

```json
{
  "id": "cuid_...",
  "name": "John Doe",
  "email": "john@example.com",
  "company": "FlipCo",
  "phone": "+27821234567",
  "preferences": { ... },
  "image": "https://...",
  "createdAt": "2025-01-15T10:00:00.000Z"
}
```

---

### `PATCH /api/user/profile`

Update the authenticated user's profile.

**Permission:** `requireAuth()` (any authenticated user)

**Request body (all optional):**

| Field         | Type        | Description       |
|---------------|-------------|-------------------|
| `name`        | string      | Min 1 char        |
| `company`     | string/null |                   |
| `phone`       | string/null |                   |
| `preferences` | object/null | Arbitrary JSON    |

**Response (200):** Updated user object.

---

## 3. Organisation

### `GET /api/org`

Get the current user's organisation with members and departments.

**Permission:** `requireOrgMember()` (any org member)

**Response (200):**

```json
{
  "id": "cuid_...",
  "name": "FlipCo",
  "slug": "flipco",
  "logo": null,
  "currency": "ZAR",
  "timezone": "Africa/Johannesburg",
  "settings": { ... },
  "members": [
    {
      "id": "member_id",
      "role": "executive",
      "user": { "id": "...", "name": "John", "email": "...", "image": null }
    }
  ],
  "departments": [ ... ],
  "currentMemberId": "member_id",
  "currentUserId": "user_id"
}
```

---

### `POST /api/org`

Create a new organisation. The creating user becomes the `executive` (owner).

**Permission:** `requireAuth()` (user must not already belong to an org)

**Request body:**

| Field      | Type   | Required | Validation                                   |
|------------|--------|----------|----------------------------------------------|
| `name`     | string | Yes      | 1-100 chars                                  |
| `slug`     | string | Yes      | 2-50 chars, lowercase alphanumeric + hyphens |
| `currency` | string | No       | Default: `"ZAR"`                             |
| `timezone` | string | No       | Default: `"Africa/Johannesburg"`             |

**Response (201):** Organisation object with members.

**Errors:** 400 if user already belongs to an org or slug is taken.

---

### `PATCH /api/org`

Update organisation settings.

**Permission:** `org:write`

**Request body (all optional):**

| Field      | Type        | Validation                     |
|------------|-------------|--------------------------------|
| `name`     | string      | 1-100 chars                    |
| `slug`     | string      | 2-50 chars, lowercase + hyphens |
| `logo`     | string/null |                                |
| `currency` | string      |                                |
| `timezone` | string      |                                |
| `settings` | object      | Arbitrary JSON                 |

**Response (200):** Updated organisation object.

---

### `POST /api/org/migrate`

Migrate existing user-scoped data to the user's organisation. One-time migration utility.

**Permission:** `requireOrgMember()`

**Response (200):**

```json
{ "migrated": 42 }
```

---

### `GET /api/org/members`

List all organisation members.

**Permission:** `requireOrgMember()` (any org member)

**Response (200):** Array of member objects with user details and department.

---

### `POST /api/org/members`

Invite/create a new team member. Creates a user account if one does not exist.

**Permission:** `team:manage` (must have higher role than the role being assigned)

**Request body:**

| Field          | Type   | Required | Description                                |
|----------------|--------|----------|--------------------------------------------|
| `name`         | string | Yes      | 1-100 chars                                |
| `email`        | string | Yes      | Valid email                                 |
| `password`     | string | No       | Min 8 chars; auto-generated if omitted     |
| `role`         | string | Yes      | One of the 6 role values                   |
| `departmentId` | string | No       |                                            |
| `title`        | string | No       |                                            |

**Response (201):**

```json
{
  "id": "member_id",
  "role": "site_supervisor",
  "user": { "id": "...", "name": "...", "email": "..." },
  "credentials": {
    "email": "new@example.com",
    "password": "auto-generated-password"
  }
}
```

The `credentials` field is only present when a new account was created.

---

### `PATCH /api/org/members`

Update a team member's role, department, or permissions.

**Permission:** `team:manage`

**Request body:**

| Field                 | Type         | Required | Description                        |
|-----------------------|--------------|----------|------------------------------------|
| `memberId`            | string       | Yes      |                                    |
| `role`                | string       | No       | One of the 6 role values           |
| `departmentId`        | string/null  | No       |                                    |
| `title`               | string/null  | No       |                                    |
| `moduleOverrides`     | object/null  | No       | `{ "finance": true, ... }`         |
| `permissionOverrides` | object/null  | No       | `{ "deals:write": false, ... }`    |
| `isActive`            | boolean      | No       |                                    |

**Response (200):** Updated member object.

---

### `DELETE /api/org/members?memberId={id}`

Deactivate (soft-delete) a team member.

**Permission:** `team:manage`

**Query:** `memberId` (required)

**Response (200):** `{ "removed": true }`

---

### `GET /api/org/departments`

List all departments.

**Permission:** `requireOrgMember()`

---

### `POST /api/org/departments`

Create a department.

**Permission:** `departments:write`

**Request body:**

| Field      | Type        | Required |
|------------|-------------|----------|
| `name`     | string      | Yes      |
| `parentId` | string/null | No       |

**Response (201):** Department object.

---

### `PATCH /api/org/departments`

Update a department.

**Permission:** `departments:write`

**Request body:**

| Field      | Type        | Required |
|------------|-------------|----------|
| `id`       | string      | Yes      |
| `name`     | string      | No       |
| `parentId` | string/null | No       |

---

### `DELETE /api/org/departments?id={id}`

Delete a department.

**Permission:** `departments:write`

---

## 4. Deals / Pipeline

### `GET /api/deals`

List deals with pagination.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`

**Response (200):** Paginated response. Each deal includes `_count` (expenses, milestones, documents) and `dealContacts`.

---

### `POST /api/deals`

Create a new deal.

**Permission:** `deals:write`

**Request body:**

| Field              | Type     | Required | Description                        |
|--------------------|----------|----------|------------------------------------|
| `name`             | string   | Yes      | 1-200 chars                        |
| `address`          | string   | No       | Max 500 chars                      |
| `purchasePrice`    | number   | No       | Min 0                              |
| `expectedSalePrice`| number   | No       | Min 0                              |
| `stage`            | string   | No       | Default: `"lead"`                  |
| `priority`         | string   | No       | Default: `"medium"`               |
| `notes`            | string   | No       |                                    |
| `tags`             | string[] | No       |                                    |
| `data`             | object   | No       | Complex deal calculator data (see below) |

**Deal `data` schema** (all fields required when provided):

```
{
  mode: "quick" | "advanced",
  acq: { purchasePrice, deposit, bondRate, bondTerm, cashPurchase, transferAttorneyFees, bondRegistration, initialRepairs },
  prop: { totalSqm, erfSize, bedrooms, bathrooms, garages, stories },
  rooms: [{ id, name, sqm, scope, customCost, notes, roomType, breakdownMode, detailedItems }],
  nextRoomId: number,
  contractors: [{ id, name, profession, dailyRate, daysWorked }],
  costDb: { [category]: { [item]: { label, unit, cost } } },
  contingencyPct: number,
  pmPct: number,
  holding: { renovationMonths, ratesAndTaxes, utilities, insurance, security, levies },
  resale: { expectedPrice, areaBenchmarkPsqm, agentCommission },
  quickRenoEstimate: number
}
```

**Response (201):** Full deal object with all relations.

---

### `GET /api/deals/{dealId}`

Get a single deal with all relations (expenses, milestones with tasks, activities, contacts, documents, shopping list).

**Permission:** `requireOrgMember()`

**Response (200):** Full deal object.

**Errors:** 404 if not found.

---

### `PATCH /api/deals/{dealId}`

Update a deal. Stage transitions are validated (e.g. "purchased" requires purchasePrice and purchaseDate).

**Permission:** `deals:write`

**Request body (all optional):**

| Field              | Type        | Description                    |
|--------------------|-------------|--------------------------------|
| `name`             | string      | 1-200 chars                    |
| `address`          | string      | Max 500 chars                  |
| `purchasePrice`    | number      |                                |
| `expectedSalePrice`| number      |                                |
| `actualSalePrice`  | number/null |                                |
| `stage`            | string      | Validated stage transition     |
| `priority`         | string      |                                |
| `notes`            | string      |                                |
| `tags`             | string[]    |                                |
| `data`             | object      | Full deal data object          |
| `offerAmount`      | number/null |                                |
| `offerDate`        | string/null | ISO date                       |
| `purchaseDate`     | string/null | ISO date                       |
| `transferDate`     | string/null | ISO date                       |
| `listedDate`       | string/null | ISO date                       |
| `soldDate`         | string/null | ISO date                       |
| `actualSaleDate`   | string/null | ISO date                       |

**Stage transition rules:**

- `purchased` requires: purchasePrice > 0, purchaseDate set
- `listed` requires: expectedSalePrice > 0
- `sold` requires: actualSalePrice > 0, soldDate or actualSaleDate set

---

### `DELETE /api/deals/{dealId}`

Delete a deal and all related data (cascade).

**Permission:** `deals:delete`

**Response (200):** `{ "deleted": true }`

---

### `POST /api/deals/import`

Bulk import deals with nested expenses, milestones, tasks, and activities.

**Permission:** `deals:write`

**Request body:**

```json
{
  "deals": [
    {
      "name": "123 Main St",
      "address": "...",
      "purchasePrice": 1200000,
      "expenses": [{ "category": "materials", "description": "Paint", "amount": 5000, "date": "2025-01-01" }],
      "milestones": [{ "title": "Demo", "tasks": [{ "title": "Strip walls" }] }],
      "activities": [{ "type": "deal_created", "description": "Imported" }]
    }
  ]
}
```

**Response (201):** `{ "imported": 3 }`

---

## 5. Contacts

### `GET /api/contacts`

List contacts with optional role filter.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `role` (filter by contact role)

**Response (200):** Paginated list. Each contact includes `dealContacts` with linked deal names.

---

### `POST /api/contacts`

Create a contact. Sensitive fields (accountNumber, branchCode) are encrypted at rest.

**Permission:** `contacts:write`

**Request body:**

| Field           | Type   | Required | Description                      |
|-----------------|--------|----------|----------------------------------|
| `name`          | string | Yes      |                                  |
| `role`          | string | No       | Default: `"other"`               |
| `company`       | string | No       |                                  |
| `phone`         | string | No       |                                  |
| `email`         | string | No       | Valid email or empty string      |
| `notes`         | string | No       |                                  |
| `profession`    | string | No       |                                  |
| `dailyRate`     | number | No       |                                  |
| `bankName`      | string | No       |                                  |
| `accountNumber` | string | No       | Encrypted at rest                |
| `branchCode`    | string | No       | Encrypted at rest                |
| `accountType`   | string | No       |                                  |

**Response (201):** Contact object.

---

### `PATCH /api/contacts/{contactId}`

Update a contact. All fields from create are accepted (all optional).

**Permission:** `contacts:write`

---

### `DELETE /api/contacts/{contactId}`

Delete a contact.

**Permission:** `contacts:write`

**Response (200):** `{ "deleted": true }`

---

## 6. Invoices

### `GET /api/invoices`

List invoices with optional deal filter.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`

---

### `POST /api/invoices`

Create an invoice.

**Permission:** `invoices:write`

**Request body:**

| Field           | Type     | Required | Description                  |
|-----------------|----------|----------|------------------------------|
| `invoiceNumber` | string   | Yes      |                              |
| `dealId`        | string   | No       |                              |
| `contactId`     | string   | No       |                              |
| `status`        | string   | No       | Default: `"draft"`           |
| `issueDate`     | string   | No       | ISO date; default: now       |
| `dueDate`       | string   | No       | ISO date                     |
| `subtotal`      | number   | No       |                              |
| `tax`           | number   | No       |                              |
| `total`         | number   | No       |                              |
| `notes`         | string   | No       |                              |
| `lineItems`     | array    | No       | See below                    |

**lineItems schema:**

| Field         | Type   | Required |
|---------------|--------|----------|
| `description` | string | Yes      |
| `quantity`    | number | Yes      |
| `unitPrice`   | number | Yes      |
| `amount`      | number | Yes      |

**Response (201):** Invoice object.

---

### `GET /api/invoices/{invoiceId}`

Get a single invoice.

**Permission:** `requireOrgMember()`

---

### `PATCH /api/invoices/{invoiceId}`

Update an invoice. Writes an audit log entry.

**Permission:** `invoices:write`

**Request body:** Same fields as create, all optional.

---

### `DELETE /api/invoices/{invoiceId}`

Delete an invoice. Cannot delete paid invoices.

**Permission:** `invoices:write`

**Errors:** 400 if invoice status is `"paid"`.

---

## 7. Expenses

### `GET /api/expenses`

List expenses with optional filters.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`, `signOffStatus`

---

### `POST /api/expenses`

Create an expense. Includes budget controls -- will warn or block if expense pushes total over the deal's renovation budget.

**Permission:** `expenses:write`

**Request body:**

| Field          | Type    | Required | Description                              |
|----------------|---------|----------|------------------------------------------|
| `dealId`       | string  | Yes      |                                          |
| `category`     | string  | Yes      |                                          |
| `description`  | string  | Yes      |                                          |
| `amount`       | number  | Yes      |                                          |
| `date`         | string  | Yes      | ISO date                                 |
| `vendor`       | string  | No       |                                          |
| `paymentMethod`| string  | No       | Default: `"eft"`                         |
| `receiptRef`   | string  | No       |                                          |
| `notes`        | string  | No       |                                          |
| `isProjected`  | boolean | No       | Default: `false`                         |
| `milestoneId`  | string  | No       |                                          |
| `contractorId` | string  | No       |                                          |
| `force`        | boolean | No       | Override 20% budget hard limit           |

**Budget behaviour:**

- Warning at >100% of budget
- Hard block at >120% of budget (override with `"force": true`)
- Budget is read from `deal.data.quickRenoEstimate`

**Response (201):** Expense object, with optional `_budgetWarning` field.

---

### `PATCH /api/expenses/{expenseId}`

Update an expense OR approve/reject it.

**Permission:** `expenses:write`

**For approval/rejection** (requires `project_manager` role or higher):

```json
{
  "action": "approve",
  "notes": "Looks good"
}
```

or

```json
{
  "action": "reject",
  "notes": "Too expensive"
}
```

**For standard updates** (all optional):

| Field           | Type        |
|-----------------|-------------|
| `category`      | string      |
| `description`   | string      |
| `amount`        | number      |
| `date`          | string      |
| `vendor`        | string      |
| `paymentMethod` | string      |
| `receiptRef`    | string/null |
| `notes`         | string/null |
| `isProjected`   | boolean     |
| `milestoneId`   | string/null |
| `contractorId`  | string/null |
| `signOffStatus` | string      |
| `signOffPmNotes`| string/null |

---

### `DELETE /api/expenses/{expenseId}`

Delete an expense.

**Permission:** `expenses:write`

---

## 8. General Ledger

### `GET /api/gl`

List journal entries with filters.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `startDate`, `endDate`

**Response (200):** Paginated list. Each entry includes `lines`.

---

### `POST /api/gl`

Create a journal entry. Total debits must equal total credits.

**Permission:** `accounting:write`

**Request body:**

| Field        | Type   | Required | Description                           |
|--------------|--------|----------|---------------------------------------|
| `date`       | string | Yes      | ISO date                              |
| `description`| string | Yes      |                                       |
| `reference`  | string | No       |                                       |
| `sourceType` | string | No       | e.g. "expense", "invoice"             |
| `sourceId`   | string | No       | ID of source entity                   |
| `notes`      | string | No       |                                       |
| `lines`      | array  | Yes      | Min 1 line. Debits must equal credits |

**Journal line schema:**

| Field         | Type   | Required | Default |
|---------------|--------|----------|---------|
| `accountCode` | string | Yes      |         |
| `accountName` | string | Yes      |         |
| `description` | string | No       |         |
| `debit`       | number | No       | 0       |
| `credit`      | number | No       | 0       |
| `dealId`      | string | No       |         |
| `contactId`   | string | No       |         |

**Response (201):** Journal entry with auto-generated `entryNumber` (e.g. `JE-000001`).

---

### `GET /api/gl/{entryId}`

Get a single journal entry with lines.

**Permission:** `requireOrgMember()`

---

### `PATCH /api/gl/{entryId}`

Update a draft journal entry. Only draft entries can be updated.

**Permission:** `accounting:write`

**Request body:** Same fields as create, all optional. If `lines` is provided, existing lines are replaced entirely.

**Errors:** 400 if entry status is not `"draft"`.

---

### `DELETE /api/gl/{entryId}`

Delete a draft journal entry.

**Permission:** `accounting:write`

**Errors:** 400 if not draft.

---

### `POST /api/gl/{entryId}/post`

Post a draft journal entry (changes status from `"draft"` to `"posted"`).

**Permission:** `accounting:write`

**Request body:** `{}` (empty object)

**Errors:** 400 if already posted.

---

## 9. Accounts Payable

### `GET /api/payables`

List vendor bills.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `contactId`, `dealId`

---

### `POST /api/payables`

Create a vendor bill.

**Permission:** `accounting:write`

**Request body:**

| Field         | Type   | Required |
|---------------|--------|----------|
| `billNumber`  | string | Yes      |
| `contactId`   | string | No       |
| `dealId`      | string | No       |
| `issueDate`   | string | No       |
| `dueDate`     | string | No       |
| `subtotal`    | number | Yes      |
| `tax`         | number | Yes      |
| `total`       | number | Yes      |
| `currency`    | string | No       |
| `notes`       | string | No       |
| `documentUrl` | string | No       |
| `lines`       | array  | Yes      |

**Bill line schema:**

| Field         | Type   | Required | Default |
|---------------|--------|----------|---------|
| `description` | string | Yes      |         |
| `quantity`    | number | No       | 1       |
| `unitPrice`   | number | Yes      |         |
| `amount`      | number | Yes      |         |
| `accountCode` | string | No       |         |
| `dealId`      | string | No       |         |

**Response (201):** Bill with lines.

---

### `GET /api/payables/{billId}`

Get a vendor bill with lines and payments.

**Permission:** `requireOrgMember()`

---

### `PATCH /api/payables/{billId}`

Update a vendor bill. Only `"draft"` or `"approved"` bills can be updated.

**Permission:** `accounting:write`

---

### `DELETE /api/payables/{billId}`

Delete a draft vendor bill.

**Permission:** `accounting:write`

**Errors:** 400 if not draft.

---

### `POST /api/payables/{billId}/pay`

Record a payment against a vendor bill.

**Permission:** `accounting:write`

**Request body:**

| Field           | Type   | Required |
|-----------------|--------|----------|
| `amount`        | number | Yes      | Must be positive |
| `paymentDate`   | string | Yes      | ISO date         |
| `paymentMethod` | string | No       |                  |
| `reference`     | string | No       |                  |
| `bankAccountId` | string | No       |                  |
| `notes`         | string | No       |                  |

**Errors:** 400 if payment would exceed bill total.

**Side effects:** Updates bill `amountPaid` and `status` (`"partially_paid"` or `"paid"`).

---

## 10. Accounts Receivable

### `GET /api/receivables`

List customer receivables.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `contactId`

---

### `POST /api/receivables`

Create a receivable.

**Permission:** `accounting:write`

**Request body:**

| Field        | Type   | Required |
|--------------|--------|----------|
| `invoiceId`  | string | No       |
| `contactId`  | string | No       |
| `dealId`     | string | No       |
| `totalAmount`| number | Yes      | Must be positive |
| `dueDate`    | string | No       | ISO date         |
| `currency`   | string | No       | Default: `"ZAR"` |
| `notes`      | string | No       |                  |

**Response (201):** Receivable object (status: `"outstanding"`, amountPaid: 0).

---

### `GET /api/receivables/{receivableId}`

Get a receivable with payments.

**Permission:** `requireOrgMember()`

---

### `PATCH /api/receivables/{receivableId}`

Update a receivable.

**Permission:** `accounting:write`

**Request body:** Same fields as create, all optional.

---

### `DELETE /api/receivables/{receivableId}`

Delete a receivable. Must be `"outstanding"` with no payments.

**Permission:** `accounting:write`

---

### `POST /api/receivables/{receivableId}/pay`

Record a payment received.

**Permission:** `accounting:write`

**Request body:**

| Field           | Type   | Required |
|-----------------|--------|----------|
| `amount`        | number | Yes      | Must be positive        |
| `paymentDate`   | string | Yes      | ISO date                |
| `paymentMethod` | string | No       |                         |
| `reference`     | string | No       |                         |
| `bankAccountId` | string | No       |                         |
| `notes`         | string | No       |                         |

**Errors:** 400 if payment would exceed total amount.

**Response (201):**

```json
{
  "payment": { ... },
  "receivable": { ... }
}
```

---

## 11. Purchase Orders

### `GET /api/purchase-orders`

List purchase orders.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `contactId`, `dealId`

---

### `POST /api/purchase-orders`

Create a purchase order. PO number is auto-generated (`PO-000001`).

**Permission:** `shopping:write`

**Request body:**

| Field            | Type   | Required |
|------------------|--------|----------|
| `contactId`      | string | No       |
| `dealId`         | string | No       |
| `orderDate`      | string | No       | ISO date; default: now |
| `expectedDate`   | string | No       | ISO date               |
| `subtotal`       | number | Yes      |                        |
| `tax`            | number | Yes      |                        |
| `total`          | number | Yes      |                        |
| `shippingCost`   | number | No       |                        |
| `currency`       | string | No       | Default: `"ZAR"`       |
| `deliveryAddress`| string | No       |                        |
| `notes`          | string | No       |                        |
| `lines`          | array  | Yes      | See below              |

**PO line schema:**

| Field             | Type   | Required |
|-------------------|--------|----------|
| `description`     | string | Yes      |
| `quantity`        | number | Yes      | Must be positive |
| `unitPrice`       | number | Yes      |                  |
| `amount`          | number | Yes      |                  |
| `inventoryItemId` | string | No       |                  |
| `accountCode`     | string | No       |                  |

---

### `GET /api/purchase-orders/{poId}`

Get a PO with lines and receipts.

**Permission:** `requireOrgMember()`

---

### `PATCH /api/purchase-orders/{poId}`

Update a draft PO. Only draft POs can be updated.

**Permission:** `shopping:write`

---

### `DELETE /api/purchase-orders/{poId}`

Delete a draft PO.

**Permission:** `shopping:write`

---

### `POST /api/purchase-orders/{poId}/approve`

Approve a purchase order (changes status to `"approved"`).

**Permission:** `expenses:approve`

**Request body:** `{}` (empty object)

**Errors:** 400 if PO is not `"draft"` or `"submitted"`.

---

## 12. Inventory

### `GET /api/inventory`

List inventory items.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `category`, `belowReorderPoint` (`"true"` to filter items below reorder point)

---

### `POST /api/inventory`

Create an inventory item.

**Permission:** `shopping:write`

**Request body:**

| Field            | Type   | Required |
|------------------|--------|----------|
| `sku`            | string | Yes      |
| `name`           | string | Yes      |
| `description`    | string | No       |
| `category`       | string | No       |
| `unit`           | string | No       |
| `reorderPoint`   | number | No       | Default: 0 |
| `reorderQuantity`| number | No       | Default: 0 |
| `costPrice`      | number | No       | Default: 0 |
| `location`       | string | No       |             |
| `notes`          | string | No       |             |

**Response (201):** Item with `quantityOnHand: 0`.

---

### `GET /api/inventory/{itemId}`

Get an inventory item with recent transactions (last 20).

**Permission:** `requireOrgMember()`

---

### `PATCH /api/inventory/{itemId}`

Update an inventory item.

**Permission:** `shopping:write`

---

### `DELETE /api/inventory/{itemId}`

Delete an inventory item. Cannot delete items with stock on hand.

**Permission:** `shopping:write`

**Errors:** 400 if `quantityOnHand !== 0`.

---

### `GET /api/inventory/transactions`

List inventory transactions.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `inventoryItemId`, `type`, `dealId`

---

### `POST /api/inventory/transactions`

Create an inventory transaction (purchase, sale, adjustment, etc.).

**Permission:** `shopping:write`

**Request body:**

| Field            | Type   | Required | Description                                                |
|------------------|--------|----------|------------------------------------------------------------|
| `inventoryItemId`| string | Yes      |                                                            |
| `type`           | string | Yes      | `"purchase"`, `"sale"`, `"adjustment"`, `"transfer"`, `"usage"`, `"return"` |
| `quantity`       | number | Yes      | Positive for in, negative for out                          |
| `unitCost`       | number | No       |                                                            |
| `reference`      | string | No       |                                                            |
| `referenceType`  | string | No       |                                                            |
| `referenceId`    | string | No       |                                                            |
| `dealId`         | string | No       |                                                            |
| `notes`          | string | No       |                                                            |

**Side effects:** Updates `quantityOnHand` on the inventory item. Updates `lastPurchasePrice` for purchase transactions.

**Response (201):**

```json
{
  "transaction": { ... },
  "item": { ... }
}
```

---

## 13. Banking

### `GET /api/bank-accounts`

List bank accounts.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `isActive` (`"true"` or `"false"`)

---

### `POST /api/bank-accounts`

Create a bank account.

**Permission:** `accounting:write`

**Request body:**

| Field           | Type   | Required | Default     |
|-----------------|--------|----------|-------------|
| `name`          | string | Yes      |             |
| `bankName`      | string | Yes      |             |
| `accountNumber` | string | Yes      |             |
| `branchCode`    | string | No       |             |
| `accountType`   | string | No       | `"cheque"`  |
| `currency`      | string | No       | `"ZAR"`     |
| `currentBalance`| number | No       | 0           |
| `accountCode`   | string | No       |             |

---

### `GET /api/bank-accounts/{accountId}`

Get a bank account with recent transactions (last 50).

**Permission:** `requireOrgMember()`

---

### `PATCH /api/bank-accounts/{accountId}`

Update a bank account. All fields from create accepted, all optional.

**Permission:** `accounting:write`

---

### `DELETE /api/bank-accounts/{accountId}`

Delete a bank account. Cannot delete accounts with existing transactions.

**Permission:** `accounting:write`

---

### `GET /api/bank-accounts/{accountId}/transactions`

List transactions for a bank account.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `isReconciled` (`"true"/"false"`), `startDate`, `endDate`

---

### `POST /api/bank-accounts/{accountId}/transactions`

Create a bank transaction.

**Permission:** `accounting:write`

**Request body:**

| Field           | Type   | Required | Default   |
|-----------------|--------|----------|-----------|
| `bankAccountId` | string | Yes      |           |
| `date`          | string | Yes      | ISO date  |
| `description`   | string | Yes      |           |
| `amount`        | number | Yes      | +/- value |
| `reference`     | string | No       |           |
| `type`          | string | No       | `"other"` |
| `category`      | string | No       |           |

---

### `POST /api/bank-accounts/{accountId}/transactions/{transactionId}/reconcile`

Reconcile a bank transaction by matching it to an entity.

**Permission:** `accounting:write`

**Request body:**

| Field              | Type   | Required | Description                     |
|--------------------|--------|----------|---------------------------------|
| `matchedEntityType`| string | Yes      | e.g. `"expense"`, `"invoice"`   |
| `matchedEntityId`  | string | Yes      | ID of the matched entity        |

---

## 14. Financial Reporting

### `GET /api/financial-statements`

Generate financial statements from posted journal entries.

**Permission:** `accounting:read`

**Query parameters:**

| Parameter   | Required | Default             | Description                              |
|-------------|----------|---------------------|------------------------------------------|
| `type`      | No       | `"trial_balance"`   | `"trial_balance"`, `"income_statement"`, `"balance_sheet"` |
| `asOfDate`  | No       | Today               | ISO date                                 |
| `startDate` | No       | Jan 1 of asOfDate year | For income statement only             |

**Response (200) -- trial_balance:**

```json
{
  "type": "trial_balance",
  "asOfDate": "2025-12-31",
  "accounts": [
    { "accountCode": "1000", "accountName": "Cash", "totalDebit": 50000, "totalCredit": 20000, "balance": 30000 }
  ]
}
```

**Response (200) -- income_statement:**

```json
{
  "type": "income_statement",
  "startDate": "2025-01-01",
  "asOfDate": "2025-12-31",
  "revenue": [{ "accountCode": "4000", "accountName": "Sales", "amount": 100000 }],
  "expenses": [{ "accountCode": "5000", "accountName": "Materials", "amount": 40000 }],
  "totalRevenue": 100000,
  "totalExpenses": 40000,
  "netIncome": 60000
}
```

**Response (200) -- balance_sheet:**

```json
{
  "type": "balance_sheet",
  "asOfDate": "2025-12-31",
  "assets": [{ "accountCode": "1000", "accountName": "Cash", "balance": 30000 }],
  "liabilities": [{ "accountCode": "2000", "accountName": "Accounts Payable", "balance": 10000 }],
  "equity": [{ "accountCode": "3000", "accountName": "Retained Earnings", "balance": 20000 }],
  "totalAssets": 30000,
  "totalLiabilities": 10000,
  "totalEquity": 20000
}
```

**Caching:** Responses include `Cache-Control: private, max-age=60, stale-while-revalidate=120`.

**Account code conventions:**
- `1xxx` = Assets (debit normal)
- `2xxx` = Liabilities (credit normal)
- `3xxx` = Equity (credit normal)
- `4xxx` = Revenue (credit normal)
- `5xxx` = Expenses (debit normal)

---

## 15. Financial Periods

### `GET /api/financial-periods`

List financial periods.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`

---

### `POST /api/financial-periods`

Create a financial period.

**Permission:** `accounting:write`

**Request body:**

| Field      | Type   | Required |
|------------|--------|----------|
| `name`     | string | Yes      |
| `startDate`| string | Yes      | ISO date |
| `endDate`  | string | Yes      | ISO date |

**Response (201):** Financial period with status `"open"`.

---

### `POST /api/financial-periods/{periodId}/close`

Close an open financial period.

**Permission:** `accounting:write`

**Errors:** 400 if period is not `"open"`.

---

## 16. HR / Payroll

### `GET /api/hr/employees`

List employees.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `department`

---

### `POST /api/hr/employees`

Create an employee. Sensitive fields (idNumber, accountNumber, branchCode) are encrypted.

**Permission:** `team:manage`

**Request body:**

| Field            | Type   | Required | Description                      |
|------------------|--------|----------|----------------------------------|
| `employeeNumber` | string | Yes      |                                  |
| `firstName`      | string | Yes      |                                  |
| `lastName`       | string | Yes      |                                  |
| `email`          | string | No       | Valid email or empty             |
| `phone`          | string | No       |                                  |
| `idNumber`       | string | No       | Encrypted at rest                |
| `taxNumber`      | string | No       |                                  |
| `position`       | string | No       |                                  |
| `department`     | string | No       |                                  |
| `employmentType` | string | No       | Default: `"full_time"`           |
| `startDate`      | string | Yes      | ISO date                         |
| `baseSalary`     | number | No       | Default: 0                       |
| `hourlyRate`     | number | No       |                                  |
| `bankName`       | string | No       |                                  |
| `accountNumber`  | string | No       | Encrypted at rest                |
| `branchCode`     | string | No       | Encrypted at rest                |
| `contactId`      | string | No       | Link to Contact record           |
| `notes`          | string | No       |                                  |

---

### `GET /api/hr/employees/{employeeId}`

Get an employee with recent leave records (20) and payslips (12).

**Permission:** `requireOrgMember()`

---

### `PATCH /api/hr/employees/{employeeId}`

Update an employee. All create fields accepted, all optional.

**Permission:** `team:manage`

---

### `DELETE /api/hr/employees/{employeeId}`

Delete an employee.

**Permission:** `team:manage`

---

### `GET /api/hr/leave`

List leave records.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `employeeId`

---

### `POST /api/hr/leave`

Create a leave request.

**Permission:** `team:manage`

**Request body:**

| Field        | Type   | Required |
|--------------|--------|----------|
| `employeeId` | string | Yes      |
| `leaveType`  | string | No       | Default: `"annual"` |
| `startDate`  | string | Yes      | ISO date             |
| `endDate`    | string | Yes      | ISO date             |
| `days`       | number | No       | Default: 1           |
| `reason`     | string | No       |                      |
| `notes`      | string | No       |                      |

---

### `POST /api/hr/leave/{leaveId}/approve`

Approve or reject a leave request.

**Permission:** `team:manage`

**Request body:**

```json
{ "action": "approve" }
```

or

```json
{ "action": "reject" }
```

**Errors:** 400 if leave is not `"pending"`.

---

### `GET /api/hr/payslips`

List payslips.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `status`, `employeeId`

---

### `POST /api/hr/payslips`

Create a payslip. Gross pay, total deductions, and net pay are auto-calculated.

**Permission:** `team:manage`

**Request body:**

| Field             | Type   | Required | Description                          |
|-------------------|--------|----------|--------------------------------------|
| `employeeId`      | string | Yes      |                                      |
| `periodStart`     | string | Yes      | ISO date                             |
| `periodEnd`       | string | Yes      | ISO date                             |
| `basePay`         | number | Yes      |                                      |
| `overtime`        | number | No       | Default: 0                           |
| `bonus`           | number | No       | Default: 0                           |
| `commission`      | number | No       | Default: 0                           |
| `paye`            | number | No       | Default: 0                           |
| `uif`             | number | No       | Default: 0                           |
| `pensionFund`     | number | No       | Default: 0                           |
| `medicalAid`      | number | No       | Default: 0                           |
| `otherDeductions` | number | No       | Default: 0                           |
| `notes`           | string | No       |                                      |

**Auto-calculated fields:**
- `grossPay = basePay + overtime + bonus + commission`
- `totalDeductions = paye + uif + pensionFund + medicalAid + otherDeductions`
- `netPay = grossPay - totalDeductions`

---

## 17. Documents

### `GET /api/documents`

List documents.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`

---

### `POST /api/documents`

Create a document record.

**Permission:** `documents:write`

**Request body:**

| Field    | Type   | Required |
|----------|--------|----------|
| `dealId` | string | No       |
| `name`   | string | Yes      |
| `type`   | string | Yes      |
| `url`    | string | No       |
| `notes`  | string | No       |

---

### `DELETE /api/documents/{documentId}`

Delete a document record.

**Permission:** `documents:write`

---

## 18. Tools & Equipment

### `GET /api/tools`

List tools with all checkouts, maintenance records, and incidents.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`

**Response (200):** Paginated tools plus `checkouts`, `maintenance`, `incidents` arrays.

---

### `POST /api/tools`

Create a tool.

**Permission:** `tools:write`

**Request body:**

| Field                   | Type   | Required | Default    |
|-------------------------|--------|----------|------------|
| `name`                  | string | Yes      |            |
| `category`              | string | Yes      |            |
| `brand`                 | string | No       |            |
| `model`                 | string | No       |            |
| `serialNumber`          | string | No       |            |
| `purchaseDate`          | string | No       | ISO date   |
| `purchaseCost`          | number | No       | 0          |
| `expectedLifespanMonths`| number | No       | 24         |
| `replacementCost`       | number | No       | 0          |
| `status`                | string | No       | `"available"` |
| `condition`             | string | No       | `"new"`    |
| `notes`                 | string | No       |            |

---

### `PATCH /api/tools/{toolId}`

Update a tool OR perform special actions (checkout, return, maintenance, incident, resolveIncident).

**Permission:** `requireOrgMember()` (actions) / `tools:write` (delete)

**For standard update:** all create fields plus `currentHolder*`, `currentDeal*` fields (all optional).

**For checkout:**

```json
{
  "_action": "checkout",
  "contractorName": "Bob Builder",
  "contractorId": "contact_id",
  "dealId": "deal_id",
  "dealName": "123 Main St",
  "propertyAddress": "...",
  "expectedReturnDate": "2025-03-01",
  "notes": "..."
}
```

**For return:**

```json
{
  "_action": "return",
  "checkoutId": "checkout_id",
  "conditionIn": "good",
  "notes": "..."
}
```

**For maintenance:**

```json
{
  "_action": "maintenance",
  "date": "2025-02-01",
  "type": "service",
  "description": "Blade sharpened",
  "cost": 150,
  "performedBy": "Mike",
  "notes": "..."
}
```

**For incident (damage/loss/theft):**

```json
{
  "_action": "incident",
  "date": "2025-02-01",
  "type": "broken",
  "contractorName": "Bob Builder",
  "contractorId": "...",
  "dealId": "...",
  "dealName": "...",
  "description": "Dropped from scaffold",
  "estimatedCost": 2500,
  "notes": "..."
}
```

Type values: `"broken"`, `"lost"`, `"stolen"` (sets tool status to `"damaged"` or `"lost"` accordingly)

**For resolving an incident:**

```json
{
  "_action": "resolveIncident",
  "incidentId": "incident_id",
  "recoveryStatus": "recovered",
  "recoveryAmount": 1000,
  "notes": "..."
}
```

---

### `DELETE /api/tools/{toolId}`

Delete a tool.

**Permission:** `tools:write`

---

### `POST /api/tools/import`

Bulk import tools, checkouts, maintenance records, and incidents.

**Permission:** `tools:write`

**Request body:**

```json
{
  "tools": [{ "name": "Drill", "category": "power_tools", ... }],
  "checkouts": [{ "toolId": "...", "contractorName": "...", ... }],
  "maintenance": [{ "toolId": "...", "date": "...", "type": "service", ... }],
  "incidents": [{ "toolId": "...", "date": "...", "type": "lost", ... }]
}
```

**Response (201):** `{ "imported": { "tools": 5, "checkouts": 3, "maintenance": 2, "incidents": 1 } }`

---

## 19. Notifications

### `GET /api/notifications`

List notifications for the current user.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `unread` (`"true"` for unread only)

---

### `POST /api/notifications`

Mark notifications as read.

**Permission:** `requireOrgMember()`

**Mark specific notifications read:**

```json
{
  "action": "markRead",
  "ids": ["notif_1", "notif_2"]
}
```

**Mark all read:**

```json
{
  "action": "markAllRead"
}
```

**Response (200):** `{ "updated": 5 }`

---

### `POST /api/notifications/send`

Send pending notification emails.

**Permission:** `notifications:write`

**Response (200):**

```json
{
  "sent": 3,
  "total": 5,
  "errors": ["notif_4: Invalid email"]
}
```

---

## 20. Activities

### `GET /api/activities`

List activity log entries.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`

---

## 21. Shopping List

### `GET /api/shopping-list`

List shopping list items.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`

---

### `POST /api/shopping-list`

Create a shopping list item.

**Permission:** `shopping:write`

**Request body:**

| Field         | Type    | Required |
|---------------|---------|----------|
| `dealId`      | string  | Yes      |
| `materialKey` | string  | Yes      |
| `category`    | string  | Yes      |
| `isCustom`    | boolean | No       |
| `label`       | string  | No       |
| `qty`         | number  | No       |
| `unit`        | string  | No       |
| `unitPrice`   | number  | No       |

---

### `PATCH /api/shopping-list`

Update a shopping list item (mark purchased, record actual price, etc.).

**Permission:** `shopping:write`

**Request body:**

| Field              | Type         | Required |
|--------------------|--------------|----------|
| `id`               | string       | Yes      |
| `purchased`        | boolean      | No       |
| `actualPrice`      | number/null  | No       |
| `actualQty`        | number/null  | No       |
| `vendor`           | string/null  | No       |
| `purchasedDate`    | string/null  | No       |
| `notes`            | string/null  | No       |
| `stylePreferences` | object/null  | No       |

---

## 22. Milestones

### `GET /api/milestones`

List milestones with tasks.

**Permission:** `requireOrgMember()`

**Query parameters:** `page`, `limit`, `dealId`

---

### `POST /api/milestones`

Create a milestone, optionally with inline tasks.

**Permission:** `milestones:write`

**Request body:**

| Field                  | Type   | Required |
|------------------------|--------|----------|
| `dealId`               | string | Yes      |
| `title`                | string | Yes      |
| `description`          | string | No       |
| `dueDate`              | string | No       | ISO date |
| `status`               | string | No       | Default: `"pending"` |
| `order`                | number | No       | Integer             |
| `assignedContractorId` | string | No       |                     |
| `assignedToMemberId`   | string | No       |                     |
| `roomId`               | string | No       |                     |
| `tasks`                | array  | No       | Inline task creation |

**Inline task schema:**

| Field        | Type   | Required |
|--------------|--------|----------|
| `title`      | string | Yes      |
| `assignedTo` | string | No       |
| `dueDate`    | string | No       |

---

### `PATCH /api/milestones/{milestoneId}`

Update a milestone.

**Permission:** `milestones:write`

**Request body (all optional):**

| Field                  | Type        |
|------------------------|-------------|
| `title`                | string      |
| `description`          | string      |
| `dueDate`              | string/null |
| `completedDate`        | string/null |
| `status`               | string      |
| `order`                | number      |
| `assignedContractorId` | string/null |
| `assignedToMemberId`   | string/null |
| `roomId`               | string/null |
| `inspectionStatus`     | string/null |
| `inspectionNotes`      | string/null |

---

### `DELETE /api/milestones/{milestoneId}`

Delete a milestone and its tasks.

**Permission:** `milestones:write`

---

## 23. Tasks

### `POST /api/tasks`

Create a task under a milestone.

**Permission:** `tasks:write`

**Request body:**

| Field         | Type   | Required |
|---------------|--------|----------|
| `milestoneId` | string | Yes      |
| `title`       | string | Yes      |
| `assignedTo`  | string | No       |
| `dueDate`     | string | No       | ISO date |

---

### `PATCH /api/tasks/{taskId}`

Update a task (mark complete, reassign, etc.).

**Permission:** `tasks:write`

**Request body (all optional):**

| Field        | Type        |
|--------------|-------------|
| `title`      | string      |
| `completed`  | boolean     |
| `assignedTo` | string/null |
| `dueDate`    | string/null |

Setting `completed: true` auto-sets `completedAt` to now.

---

### `DELETE /api/tasks/{taskId}`

Delete a task.

**Permission:** `tasks:write`

---

## 24. Assignments

### `GET /api/assignments`

Get milestones and tasks assigned to the current user.

**Permission:** `requireOrgMember()`

**Response (200):**

```json
{
  "milestones": [
    {
      "id": "...",
      "title": "Demo phase",
      "tasks": [ ... ],
      "deal": { "id": "...", "name": "123 Main St", "address": "..." }
    }
  ],
  "tasks": [
    {
      "id": "...",
      "title": "Strip wallpaper",
      "milestone": {
        "id": "...",
        "title": "Demo phase",
        "deal": { "id": "...", "name": "123 Main St" }
      }
    }
  ]
}
```

---

## 25. Search

### `GET /api/search`

Global search across deals, contacts, and tools.

**Permission:** `requireOrgMember()`

**Query parameters:** `q` (search query, min 2 chars)

**Response (200):**

```json
{
  "deals": [{ "id": "...", "name": "123 Main St", "address": "...", "stage": "renovation" }],
  "contacts": [{ "id": "...", "name": "Bob Builder", "role": "contractor", "company": "BuildCo" }],
  "tools": [{ "id": "...", "name": "DeWalt Drill", "category": "power_tools", "status": "available" }]
}
```

Results are capped at 10 per entity type.

---

## 26. Export / Import

### `GET /api/export`

Export all organisation data (deals with relations, tools with checkouts/maintenance/incidents, contacts, documents, invoices).

**Permission:** `requireOrgMember()`

**Response (200):**

```json
{
  "exportedAt": "2025-02-01T10:00:00.000Z",
  "version": "1.0",
  "data": {
    "deals": [ ... ],
    "tools": { "tools": [...], "checkouts": [...], "maintenance": [...], "incidents": [...] },
    "contacts": [ ... ],
    "documents": [ ... ],
    "invoices": [ ... ]
  }
}
```

---

### `POST /api/import`

Import data from an export file. Delegates to `/api/deals/import` and `/api/tools/import`.

**Permission:** `requireOrgMember()`

**Request body:**

```json
{
  "data": {
    "deals": [ ... ],
    "tools": { "tools": [...], "checkouts": [...], ... }
  }
}
```

**Response (201):** `{ "imported": { "deals": 5, "tools": 10 } }`

---

## 27. Accounting Integrations

### `GET /api/accounting`

Get the accounting connection status and available providers.

**Permission:** `accounting:read`

**Response (200):**

```json
{
  "connection": {
    "id": "...",
    "provider": "xero",
    "status": "connected",
    "lastSyncAt": "2025-02-01T10:00:00.000Z"
  },
  "providers": {
    "xero": true,
    "quickbooks": false
  }
}
```

---

### `POST /api/accounting`

Create an accounting connection.

**Permission:** `accounting:write`

**Request body:**

| Field      | Type   | Required | Description                          |
|------------|--------|----------|--------------------------------------|
| `provider` | string | Yes      | `"quickbooks"`, `"xero"`, `"sage"`, `"manual"` |
| `settings` | object | No       |                                      |

**Errors:** 400 if connection already exists.

---

### `DELETE /api/accounting`

Disconnect accounting integration. Removes connection and sync records.

**Permission:** `accounting:write`

---

### `GET /api/accounting/credentials`

Check which accounting providers have credentials configured (never returns actual secrets).

**Permission:** `accounting:read`

**Response (200):**

```json
{
  "xero": { "configured": true },
  "quickbooks": { "configured": false, "sandbox": false }
}
```

---

### `POST /api/accounting/credentials`

Save accounting API credentials (encrypted at rest). Requires `executive` role.

**Permission:** `accounting:write` + `executive` role

**Request body (all optional -- only provided fields are updated):**

| Field                   | Type    |
|-------------------------|---------|
| `xeroClientId`          | string  |
| `xeroClientSecret`      | string  |
| `quickbooksClientId`    | string  |
| `quickbooksClientSecret`| string  |
| `quickbooksSandbox`     | boolean |

---

### `DELETE /api/accounting/credentials?provider={xero|quickbooks}`

Remove stored credentials for a provider. Requires `executive` role.

**Permission:** `accounting:write` + `executive` role

---

### `GET /api/accounting/sync`

Get sync history and connection status.

**Permission:** `accounting:read`

---

### `POST /api/accounting/sync`

Trigger a sync with the connected accounting provider.

**Permission:** `accounting:write`

**Rate limit:** 1 sync per 2 minutes per org.

**Request body:**

| Field  | Type   | Default      | Description                          |
|--------|--------|--------------|--------------------------------------|
| `type` | string | `"accounts"` | `"accounts"`, `"contacts"`, `"invoices"`, `"all"` |

---

### `GET /api/accounting/chart-of-accounts`

Get the chart of accounts for the organisation.

**Permission:** `accounting:read`

**Caching:** `Cache-Control: private, max-age=300, stale-while-revalidate=600`

---

### `POST /api/accounting/chart-of-accounts`

Create a chart of accounts entry, or seed default accounts.

**Permission:** `accounting:write`

**To seed defaults:**

```json
{ "action": "seedDefaults" }
```

**To create a single account:**

```json
{
  "code": "1100",
  "name": "Petty Cash",
  "type": "asset",
  "subtype": "current_asset",
  "parentId": null
}
```

---

## 28. Health Check

### `GET /api/health`

Simple health check endpoint. No authentication required.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2025-02-01T10:00:00.000Z"
}
```
