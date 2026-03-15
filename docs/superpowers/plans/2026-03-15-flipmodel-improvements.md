# FlipModel Improvements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the codebase (security, consistency, performance) and enhance the room calculator with ceiling height, wall deductions, before/after rooms, material palette, and agent commission flexibility.

**Architecture:** All feature changes are in the client-side deal calculator (JSON `data` column on Deal model — no Prisma migrations needed for features). Codebase fixes span API routes, middleware, and Prisma schema. New fields use nullish coalescing for backward compatibility with existing deals.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Prisma 7, Zod 4, Vitest

**Spec:** `docs/superpowers/specs/2026-03-15-flipmodel-improvements-design.md`

---

## Chunk 1: Codebase Security & API Consistency Fixes

### Task 1: Restrict /api/dev/seed to development only

**Files:**
- Modify: `proxy.ts:4` (publicPaths array)
- Modify: `app/api/dev/seed/route.ts:1-12`

- [ ] **Step 1: Gate seed route handler behind NODE_ENV check**

In `app/api/dev/seed/route.ts`, add at the top of the GET handler:

```typescript
if (process.env.NODE_ENV !== "development") {
  return new Response("Not Found", { status: 404 });
}
```

- [ ] **Step 2: Remove /api/dev from public paths in production**

In `proxy.ts`, change line 4 from:
```typescript
const publicPaths = ["/login", "/signup", "/onboarding", "/api/auth", "/api/accounting/webhooks", "/api/health", "/api/dev"];
```
to:
```typescript
const publicPaths = ["/login", "/signup", "/onboarding", "/api/auth", "/api/accounting/webhooks", "/api/health",
  ...(process.env.NODE_ENV === "development" ? ["/api/dev"] : [])];
```

- [ ] **Step 3: Commit**

```bash
git add proxy.ts app/api/dev/seed/route.ts
git commit -m "fix(security): restrict /api/dev/seed to development environment"
```

---

### Task 2: Add rate limiting to auth routes

**Files:**
- Modify: `app/api/auth/[...nextauth]/route.ts` or `app/api/auth/login/route.ts` (whichever handles login)
- Modify: `app/api/auth/signup/route.ts`
- Reference: `app/lib/rate-limit.ts:39-60` (rateLimit function)

- [ ] **Step 1: Find the auth login route**

Search for the credential login handler:
```bash
grep -rn "verifyPassword\|credentials" app/api/auth/ app/lib/auth.ts --include="*.ts" -l
```
The login may be handled in `app/lib/auth.ts` (NextAuth authorize callback) or in a dedicated route like `app/api/auth/login/route.ts`. Read the file to find the exact location.

- [ ] **Step 2: Add rate limiting to login**

At the top of the login handler (either the authorize callback in `app/lib/auth.ts` or the login route POST handler), add:
```typescript
import { rateLimit } from "@/lib/rate-limit";

// Inside handler, before credential verification:
const ip = req.headers.get("x-forwarded-for") || "unknown";
const { success, remaining } = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
if (!success) {
  return apiError("Too many login attempts. Try again in 15 minutes.", 429);
}
```

- [ ] **Step 3: Add rate limiting to signup**

In `app/api/auth/signup/route.ts`, add similar rate limiting:
```typescript
const ip = req.headers.get("x-forwarded-for") || "unknown";
const { success } = rateLimit(`signup:${ip}`, 3, 60 * 60 * 1000);
if (!success) {
  return apiError("Too many signup attempts. Try again later.", 429);
}
```

- [ ] **Step 4: Commit**

```bash
git add app/api/auth/
git commit -m "fix(security): add rate limiting to login and signup routes"
```

---

### Task 3: Add audit logs to PATCH/DELETE handlers

**Files:**
- Modify: `app/api/contacts/[contactId]/route.ts:9-45`
- Modify: `app/api/deals/[dealId]/route.ts:99-178`
- Modify: `app/api/tasks/[taskId]/route.ts:41-89`
- Modify: `app/api/expenses/[expenseId]/route.ts:10-96`
- Reference: `app/lib/audit.ts` (writeAuditLog)

- [ ] **Step 1: Add audit to contacts PATCH/DELETE**

In `app/api/contacts/[contactId]/route.ts`, add after each successful update/delete:
```typescript
import { writeAuditLog } from "@/lib/audit";

// After PATCH prisma.contact.update():
await writeAuditLog({
  orgId: ctx.orgId,
  userId: ctx.userId,
  action: "update",
  entityType: "Contact",
  entityId: contactId,
});

// After DELETE prisma.contact.delete():
await writeAuditLog({
  orgId: ctx.orgId,
  userId: ctx.userId,
  action: "delete",
  entityType: "Contact",
  entityId: contactId,
});
```

- [ ] **Step 2: Add audit to deals PATCH/DELETE**

Same pattern in `app/api/deals/[dealId]/route.ts`:
```typescript
// After PATCH (line ~159):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "update", entityType: "Deal", entityId: dealId,
});

// After DELETE (line ~173):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "delete", entityType: "Deal", entityId: dealId,
});
```

- [ ] **Step 3: Add audit to tasks PATCH/DELETE**

Same pattern in `app/api/tasks/[taskId]/route.ts`:
```typescript
// After PATCH (line ~67):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "update", entityType: "Task", entityId: taskId,
});

// After DELETE (line ~83):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "delete", entityType: "Task", entityId: taskId,
});
```

- [ ] **Step 4: Add audit to expenses PATCH/DELETE**

In `app/api/expenses/[expenseId]/route.ts`, add after both update paths and the delete:
```typescript
// After approval/rejection update (line ~43):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: body.status === "approved" ? "approve" : "reject",
  entityType: "Expense", entityId: expenseId,
});

// After field update (line ~72):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "update", entityType: "Expense", entityId: expenseId,
});

// After DELETE (line ~91):
await writeAuditLog({
  orgId: ctx.orgId, userId: ctx.userId,
  action: "delete", entityType: "Expense", entityId: expenseId,
});
```

- [ ] **Step 5: Commit**

```bash
git add app/api/contacts/ app/api/deals/ app/api/tasks/ app/api/expenses/
git commit -m "fix: add audit logging to contacts, deals, tasks, expenses PATCH/DELETE"
```

---

### Task 4: Standardize GET permissions

**Files:**
- Modify: `app/api/contacts/route.ts:10`
- Modify: `app/api/deals/route.ts:9`
- Modify: `app/api/invoices/route.ts:28`
- Modify: `app/api/milestones/route.ts:26`
- Modify: `app/api/tools/route.ts:9`
- Modify: `app/api/shopping-list/route.ts:31`

- [ ] **Step 1: Update all six routes**

In each file, change the GET handler's auth call:

| File | Line | From | To |
|------|------|------|----|
| `contacts/route.ts` | 10 | `requireOrgMember()` | `requirePermission("contacts:read")` |
| `deals/route.ts` | 9 | `requireOrgMember()` | `requirePermission("deals:read")` |
| `invoices/route.ts` | 28 | `requireOrgMember()` | `requirePermission("invoices:read")` |
| `milestones/route.ts` | 26 | `requireOrgMember()` | `requirePermission("milestones:read")` |
| `tools/route.ts` | 9 | `requireOrgMember()` | `requirePermission("tools:read")` |
| `shopping-list/route.ts` | 31 | `requireOrgMember()` | `requirePermission("deals:read")` |

Ensure `requirePermission` is imported (may need to add to existing import). The shopping-list uses `deals:read` because shopping lists are deal-scoped.

- [ ] **Step 2: Verify permissions exist in RBAC matrix**

Check `app/lib/permissions.ts` to confirm `contacts:read`, `deals:read`, `invoices:read`, `milestones:read`, `tools:read` are in `DEFAULT_ROLE_PERMISSIONS` for all roles that need them. If any are missing, add them.

- [ ] **Step 3: Commit**

```bash
git add app/api/contacts/route.ts app/api/deals/route.ts app/api/invoices/route.ts app/api/milestones/route.ts app/api/tools/route.ts app/api/shopping-list/route.ts
git commit -m "fix: standardize GET endpoints to use requirePermission instead of requireOrgMember"
```

---

### Task 5: Extract inline Zod schemas to validation files

**Files:**
- Create: `app/lib/validations/invoice.ts`
- Create: `app/lib/validations/milestone.ts`
- Create: `app/lib/validations/document.ts`
- Create: `app/lib/validations/financial-period.ts`
- Create: `app/lib/validations/org.ts`
- Create: `app/lib/validations/shopping-list.ts`
- Modify: `app/api/invoices/route.ts:7-24` (remove inline, add import)
- Create: `app/lib/validations/task.ts` (does not exist yet)
- Modify: `app/api/tasks/[taskId]/route.ts:8-13` (remove inline, add import)
- Modify: `app/api/milestones/route.ts:7-22` (remove inline, add import)
- Modify: `app/api/documents/route.ts:7-13` (remove inline, add import)
- Modify: `app/api/financial-periods/route.ts:8-12` (remove inline, add import)
- Modify: `app/api/org/route.ts:7-21` (remove inline, add import)
- Modify: `app/api/shopping-list/route.ts:7-27` (remove inline, add import)

- [ ] **Step 1: Read each route file to capture the exact inline schema**

Read all 7 route files listed above. Copy each inline `z.object({...})` exactly.

- [ ] **Step 2: Create validation files**

For each domain, create a new file in `app/lib/validations/` exporting the schema. Follow existing patterns (see `app/lib/validations/deal.ts` for reference). Example:

```typescript
// app/lib/validations/invoice.ts
import { z } from "zod";

export const createInvoiceSchema = z.object({
  // ... exact copy from route file
});
```

For tasks, add `updateTaskSchema` to existing `app/lib/validations/task.ts`.

- [ ] **Step 3: Update route files to import from validation files**

Replace inline schemas with imports:
```typescript
import { createInvoiceSchema } from "@/lib/validations/invoice";
```

Remove the inline `z.object({...})` definitions and the `import { z } from "zod"` if no longer needed.

- [ ] **Step 4: Run tests**

```bash
npm test
```
Expected: All existing tests pass (no behavior change).

- [ ] **Step 5: Commit**

```bash
git add app/lib/validations/ app/api/invoices/ app/api/tasks/ app/api/milestones/ app/api/documents/ app/api/financial-periods/ app/api/org/ app/api/shopping-list/
git commit -m "refactor: extract inline Zod schemas to app/lib/validations/"
```

---

### Task 6: Add database indexes

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add indexes to Prisma schema**

Add `@@index` directives to the following models:

```prisma
model Deal {
  // ... existing fields
  @@index([orgId, stage])
  @@index([orgId, createdAt])
}

model VendorBill {
  // ... existing fields
  @@index([orgId, status])
}

model CustomerReceivable {
  // ... existing fields
  @@index([orgId, status])
}

model Expense {
  // ... existing fields
  @@index([orgId, createdAt])
}

model JournalEntry {
  // ... existing fields
  @@index([orgId, createdAt])
}
```

Check that these `@@index` directives don't duplicate existing ones. The models may already have `@@index([orgId])` — compound indexes with a second column are still valuable.

- [ ] **Step 2: Create migration**

```bash
source .env.local && npx prisma migrate dev --name add_performance_indexes
```

- [ ] **Step 3: Verify migration applied**

```bash
source .env.local && npx prisma migrate status
```
Expected: All migrations applied, no pending.

- [ ] **Step 4: Commit**

```bash
git add prisma/
git commit -m "perf: add database indexes on status, stage, and createdAt columns"
```

---

### Task 6b: Add Zod validation to unvalidated POST routes

**Files:**
- Modify: `app/api/accounting/sync/route.ts`
- Modify: `app/api/deals/import/route.ts`
- Modify: `app/api/financial-periods/[periodId]/close/route.ts`
- Modify: `app/api/gl/[entryId]/reverse/route.ts`
- Modify: `app/api/hr/leave/[leaveId]/approve/route.ts`
- Modify: `app/api/import/route.ts`
- Modify: `app/api/notifications/route.ts`
- Modify: `app/api/notifications/send/route.ts`
- Modify: `app/api/org/migrate/route.ts`
- Modify: `app/api/payables/[billId]/approve/route.ts`
- Modify: `app/api/tools/import/route.ts`
- Modify: `app/api/accounting/chart-of-accounts/route.ts`

- [ ] **Step 1: Read each route to understand what body it accepts**

For each of the 12 routes, read the POST handler and document what fields it reads from `req.json()`.

- [ ] **Step 2: Create Zod schemas for each route**

For routes that accept a body, add a Zod schema either in the route file (if simple/single-use like `approve`) or in a new validation file (if reusable). Routes that accept no body (action-only endpoints like `approve`, `close`, `reverse`) need only a confirmation that no body validation is needed — document this explicitly.

Example for approve endpoints (no body needed):
```typescript
// No body validation needed — action endpoint with no request body
```

Example for import endpoints:
```typescript
import { z } from "zod";
const importSchema = z.object({
  items: z.array(z.object({
    // ... fields based on what the route reads
  })),
});
// Then: const data = importSchema.parse(body);
```

- [ ] **Step 3: Apply schemas to each route**

Replace raw `const body = await req.json()` with schema validation:
```typescript
const body = await req.json();
const data = mySchema.parse(body);
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

- [ ] **Step 5: Commit**

```bash
git add app/api/
git commit -m "fix: add Zod validation to 12 POST routes accepting raw bodies"
```

---

### Task 6c: Add missing pagination to list endpoints

**Files:**
- Modify: `app/api/assignments/route.ts` (if exists, or the relevant assignments list route)
- Modify: `app/api/org/members/route.ts`
- Modify: `app/api/contractors/route.ts` (if exists)

- [ ] **Step 1: Find the exact route files**

Search for assignments, org/members, and contractors list routes:
```bash
find app/api -name "route.ts" | grep -E "(assignments|members|contractors)"
```

- [ ] **Step 2: Add pagination to each route**

For each GET handler that returns a raw array, add pagination using the existing pattern:
```typescript
import { parsePagination, paginatedResult } from "@/lib/pagination";

// Inside GET handler:
const pagination = parsePagination(req);
const [total, items] = await Promise.all([
  prisma.model.count({ where }),
  prisma.model.findMany({
    where,
    take: pagination.limit,
    skip: pagination.skip,
    orderBy: { createdAt: "desc" },
  }),
]);
return apiSuccess(paginatedResult(items, total, pagination));
```

- [ ] **Step 3: Commit**

```bash
git add app/api/
git commit -m "fix: add pagination to assignments, org/members, and contractors list endpoints"
```

---

## Chunk 2: Room Calculator — Ceiling Height & Wall Deductions

### Task 7: Update types for ceiling height, door/window deductions

**Files:**
- Modify: `app/types/deal.ts:68-75` (PropertyData)
- Modify: `app/types/deal.ts:77-87` (RoomData)

- [ ] **Step 1: Write test for backward compatibility**

Create `app/types/__tests__/deal-compat.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("DealData backward compatibility", () => {
  it("PropertyData without defaultCeilingHeight defaults to 2.4", () => {
    const oldProp = { totalSqm: 120, erfSize: 300, bedrooms: 3, bathrooms: 2, garages: 1, stories: "1" };
    const height = (oldProp as any).defaultCeilingHeight ?? 2.4;
    expect(height).toBe(2.4);
  });

  it("RoomData without ceilingHeight/doorSqm/windowSqm defaults correctly", () => {
    const oldRoom = { id: 1, name: "Kitchen", sqm: 14, scope: "fullGut", customCost: null, notes: "", roomType: "kitchen", breakdownMode: "simple", detailedItems: null };
    const ceiling = (oldRoom as any).ceilingHeight ?? null;
    const doors = (oldRoom as any).doorSqm ?? 0;
    const windows = (oldRoom as any).windowSqm ?? 0;
    expect(ceiling).toBeNull();
    expect(doors).toBe(0);
    expect(windows).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it passes** (tests existing behavior)

```bash
npx vitest run app/types/__tests__/deal-compat.test.ts
```

- [ ] **Step 3: Add new fields to PropertyData**

In `app/types/deal.ts`, add to `PropertyData` interface (after line 75):
```typescript
export interface PropertyData {
  totalSqm: number;
  erfSize: number;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  stories: string;
  defaultCeilingHeight?: number; // default 2.4 via ?? at read sites
}
```

- [ ] **Step 4: Add new fields to RoomData**

In `app/types/deal.ts`, add to `RoomData` interface (after line 87):
```typescript
export interface RoomData {
  id: number;
  name: string;
  sqm: number;
  scope: "cosmetic" | "midLevel" | "fullGut";
  customCost: number | null;
  notes: string;
  roomType: string;
  breakdownMode: "simple" | "detailed";
  detailedItems: DetailedItem[] | null;
  ceilingHeight?: number | null;  // null/undefined = use house default
  doorSqm?: number;               // default 0 via ?? at read sites
  windowSqm?: number;             // default 0 via ?? at read sites
}
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run app/types/__tests__/deal-compat.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/types/deal.ts app/types/__tests__/
git commit -m "feat: add ceiling height, door/window sqm fields to PropertyData and RoomData"
```

---

### Task 8: Update calcAutoQty for ceiling height and deductions

**Files:**
- Modify: `app/data/roomTemplates.ts:149-158` (calcAutoQty)
- Modify: `app/data/roomTemplates.ts:170-181` (generateRoomItems)

- [ ] **Step 1: Write tests for new calcAutoQty behavior**

Create or update `app/data/__tests__/roomTemplates.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { calcAutoQty } from "../roomTemplates";

describe("calcAutoQty", () => {
  it("calculates sqm unchanged", () => {
    expect(calcAutoQty("sqm", 16)).toBe(16);
  });

  it("calculates linear meters from perimeter", () => {
    // perimeter = 4 * sqrt(16) = 16
    expect(calcAutoQty("lm", 16)).toBe(16);
  });

  it("calculates wall area with default ceiling height 2.4m", () => {
    // perimeter = 16, wall = 16 * 2.4 = 38.4
    expect(calcAutoQty("wallArea", 16)).toBe(38.4);
  });

  it("calculates wall area with custom ceiling height", () => {
    // perimeter = 16, wall = 16 * 3.0 = 48
    expect(calcAutoQty("wallArea", 16, 3.0)).toBe(48);
  });

  it("deducts door sqm from wall area", () => {
    // wall = 16 * 2.4 = 38.4, minus 1.9 door = 36.5
    expect(calcAutoQty("wallArea", 16, 2.4, 1.9)).toBe(36.5);
  });

  it("deducts window sqm from wall area", () => {
    // wall = 38.4, minus 0 doors, minus 2.88 windows = 35.5
    expect(calcAutoQty("wallArea", 16, 2.4, 0, 2.88)).toBe(35.5);
  });

  it("deducts both doors and windows", () => {
    // wall = 38.4 - 1.9 - 2.88 = 33.6 (rounded to 1dp)
    expect(calcAutoQty("wallArea", 16, 2.4, 1.9, 2.88)).toBe(33.6);
  });

  it("never returns negative wall area", () => {
    expect(calcAutoQty("wallArea", 4, 2.4, 50, 50)).toBe(0);
  });

  it("returns fixed number for numeric autoQty", () => {
    expect(calcAutoQty(3, 16)).toBe(3);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run app/data/__tests__/roomTemplates.test.ts
```
Expected: Tests with custom ceiling height and deductions FAIL (current signature doesn't accept them).

- [ ] **Step 3: Update calcAutoQty signature**

In `app/data/roomTemplates.ts`, replace the `calcAutoQty` function (lines 149-158):
```typescript
export function calcAutoQty(
  autoQty: number | "sqm" | "lm" | "wallArea",
  roomSqm: number,
  ceilingHeight: number = 2.4,
  doorSqm: number = 0,
  windowSqm: number = 0,
): number {
  if (typeof autoQty === "number") return autoQty;
  const perimeter = 4 * Math.sqrt(roomSqm);
  switch (autoQty) {
    case "sqm":
      return roomSqm;
    case "lm":
      return Math.round(perimeter * 10) / 10;
    case "wallArea": {
      const grossWall = perimeter * ceilingHeight;
      const netWall = grossWall - doorSqm - windowSqm;
      return Math.round(Math.max(0, netWall) * 10) / 10;
    }
    default:
      return 1;
  }
}
```

- [ ] **Step 4: Update generateRoomItems to pass room dimensions**

In `app/data/roomTemplates.ts`, update `generateRoomItems` (lines 170-181) to accept and forward room dimensions:
```typescript
export function generateRoomItems(
  roomType: string,
  roomSqm: number,
  ceilingHeight: number = 2.4,
  doorSqm: number = 0,
  windowSqm: number = 0,
): GeneratedRoomItem[] {
  const template = ROOM_TEMPLATES[roomType];
  if (!template) return [];
  return template.items.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    included: true,
    qty: calcAutoQty(item.autoQty, roomSqm, ceilingHeight, doorSqm, windowSqm),
    unitCost: item.defaultCost,
  }));
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run app/data/__tests__/roomTemplates.test.ts
```
Expected: All PASS.

- [ ] **Step 6: Run full test suite**

```bash
npm test
```
Expected: All pass (existing callers use 2 args, defaults handle the rest).

- [ ] **Step 7: Commit**

```bash
git add app/data/roomTemplates.ts app/data/__tests__/
git commit -m "feat: add ceiling height and door/window deductions to wall area calculation"
```

---

### Task 9: Update RoomBreakdown component for ceiling height & deductions

**Files:**
- Modify: `app/components/RoomBreakdown.tsx:7-31` (Room interface, props)
- Modify: `app/components/RoomBreakdown.tsx:70-85` (handleSqmChange)

- [ ] **Step 1: Update Room interface in RoomBreakdown**

In `app/components/RoomBreakdown.tsx`, update the `Room` interface to include new fields:
```typescript
interface Room {
  id: number;
  name: string;
  sqm: number;
  scope: "cosmetic" | "midLevel" | "fullGut";
  customCost: number | null;
  notes: string;
  roomType: string;
  breakdownMode: "simple" | "detailed";
  detailedItems: DetailedItem[] | null;
  ceilingHeight?: number | null;
  doorSqm?: number;
  windowSqm?: number;
}
```

- [ ] **Step 2: Add defaultCeilingHeight to props**

Update `RoomBreakdownProps`:
```typescript
interface RoomBreakdownProps {
  room: Room;
  updateRoom: (id: number, updates: Partial<Room>) => void;
  defaultCeilingHeight: number;
}
```

- [ ] **Step 3: Use effective ceiling height in calculations**

Add a computed value at the top of the component:
```typescript
const effectiveCeiling = room.ceilingHeight ?? defaultCeilingHeight;
const effectiveDoors = room.doorSqm ?? 0;
const effectiveWindows = room.windowSqm ?? 0;
```

- [ ] **Step 4: Update handleSqmChange and handleRoomTypeChange to pass dimensions**

Update the recalculation calls to pass ceiling/doors/windows:
```typescript
const handleSqmChange = (newSqm: number) => {
  const newItems = room.detailedItems?.map(item => ({
    ...item,
    qty: calcAutoQty(item.autoQty, newSqm, effectiveCeiling, effectiveDoors, effectiveWindows),
  }));
  updateRoom(room.id, { sqm: newSqm, detailedItems: newItems });
};
```

Note: `item.autoQty` may not be stored on `DetailedItem`. Check existing code — if not stored, the template lookup is needed. Adjust accordingly.

- [ ] **Step 5: Add ceiling height, door sqm, window sqm input fields to the UI**

Add three `NumInput` fields in the room card, below the sqm input:
```tsx
<NumInput
  label="Ceiling Height (m)"
  value={room.ceilingHeight ?? defaultCeilingHeight}
  onChange={(v) => updateRoom(room.id, { ceilingHeight: v })}
  step={0.1}
/>
<NumInput
  label="Door Area (sqm)"
  value={room.doorSqm ?? 0}
  onChange={(v) => updateRoom(room.id, { doorSqm: v })}
/>
<NumInput
  label="Window Area (sqm)"
  value={room.windowSqm ?? 0}
  onChange={(v) => updateRoom(room.id, { windowSqm: v })}
/>
```

Also display calculated volume and net wall area:
```tsx
<div style={{ fontSize: 13, color: theme.textDim }}>
  Volume: {(room.sqm * effectiveCeiling).toFixed(1)} m³ |
  Net Wall: {calcAutoQty("wallArea", room.sqm, effectiveCeiling, effectiveDoors, effectiveWindows)} sqm
</div>
```

- [ ] **Step 6: Update RoomsStep to pass defaultCeilingHeight**

In `app/components/RoomsStep.tsx`, add `defaultCeilingHeight` to props and pass it to `RoomBreakdown`:
```tsx
<RoomBreakdown
  room={room}
  updateRoom={updateRoom}
  defaultCeilingHeight={defaultCeilingHeight}
/>
```

- [ ] **Step 7: Commit**

```bash
git add app/components/RoomBreakdown.tsx app/components/RoomsStep.tsx
git commit -m "feat: add ceiling height and door/window deduction inputs to room breakdown"
```

---

### Task 10: Add defaultCeilingHeight to PropertyStep

**Files:**
- Modify: `app/components/PropertyStep.tsx` (or wherever property inputs live)
- Modify: `app/hooks/useCalculator.ts:35-47` (prop state init)

- [ ] **Step 1: Find PropertyStep component**

Search for PropertyStep in the codebase. Read it to understand its props and structure.

- [ ] **Step 2: Add defaultCeilingHeight input**

Add a `NumInput` for default ceiling height in the property form:
```tsx
<NumInput
  label="Default Ceiling Height (m)"
  value={prop.defaultCeilingHeight ?? 2.4}
  onChange={(v) => updateProp({ defaultCeilingHeight: v })}
  step={0.1}
  min={1.8}
  max={6}
/>
```

- [ ] **Step 3: Update useCalculator to read defaultCeilingHeight**

In `useCalculator.ts`, ensure the prop state initializes `defaultCeilingHeight`:
```typescript
const [prop, setProp] = useState<PropertyData>({
  totalSqm: 0, erfSize: 0, bedrooms: 3, bathrooms: 2, garages: 1, stories: "1",
  ...(initialData?.prop as Partial<PropertyData>),
});
```
The spread handles existing data, and `?? 2.4` at read sites handles missing values.

- [ ] **Step 4: Pass defaultCeilingHeight through to RoomsStep**

In `DealAnalysis.tsx`, pass `prop.defaultCeilingHeight ?? 2.4` to `RoomsStep`:
```tsx
<RoomsStep
  rooms={calc.rooms}
  updateRoom={calc.updateRoom}
  removeRoom={calc.removeRoom}
  addRoom={calc.addRoom}
  isMobile={isMobile}
  defaultCeilingHeight={calc.prop.defaultCeilingHeight ?? 2.4}
/>
```

- [ ] **Step 5: Commit**

```bash
git add app/components/PropertyStep.tsx app/hooks/useCalculator.ts app/components/deals/DealAnalysis.tsx app/components/RoomsStep.tsx
git commit -m "feat: add default ceiling height input to property step"
```

---

## Chunk 3: Before/After Rooms & Smart Auto-Population

### Task 11: Add BeforeRoom type and roomsBefore to DealData

**Files:**
- Modify: `app/types/deal.ts:41-55` (DealData)
- Modify: `app/types/deal.ts` (add BeforeRoom interface)

- [ ] **Step 1: Add BeforeRoom interface**

In `app/types/deal.ts`, add after the `RoomData` interface:
```typescript
export interface BeforeRoom {
  id: number;
  name: string;
  sqm: number;
  ceilingHeight?: number | null;
  condition?: "good" | "fair" | "poor" | "derelict";
  notes: string;
  roomType: string; // set via detectRoomType(name) on creation
}
```

- [ ] **Step 2: Add roomsBefore to DealData and deprecate propAfter**

In `app/types/deal.ts`, update `DealData`. Keep `propAfter` as optional deprecated field (existing deals may have it in their JSON data column — removing it would cause TypeScript errors at any read site):
```typescript
export interface DealData {
  mode: "quick" | "advanced";
  acq: AcquisitionData;
  prop: PropertyData;
  /** @deprecated Use roomsBefore/rooms comparison instead */
  propAfter?: PropertyData;
  rooms: RoomData[];
  roomsBefore?: BeforeRoom[]; // existing snapshot, defaults to [] via ??
  nextRoomId: number;
  // ... rest unchanged
}
```

- [ ] **Step 3: Add PropertyDelta type**

```typescript
export interface PropertyDelta {
  beforeCounts: Record<string, number>;
  afterCounts: Record<string, number>;
  sqmDelta: number;
}
```

- [ ] **Step 4: Update useCalculator — deprecate propAfter, add roomsBefore**

In `useCalculator.ts`:

1. Search for all references to `propAfter` and `updatePropAfter` in the file. Keep the state variable but stop exposing `updatePropAfter` in the return object (it's no longer used in the UI).
2. Add `roomsBefore` state:
```typescript
const [roomsBefore, setRoomsBefore] = useState<BeforeRoom[]>(
  (initialData?.roomsBefore as BeforeRoom[]) ?? []
);
```
3. Add `roomsBefore` and `setRoomsBefore` to the return object.
4. Add `roomsBefore` to `getSnapshot()` so it persists when saving deal data.
5. Search the entire codebase for `propAfter` and `updatePropAfter` references outside of useCalculator:
```bash
grep -rn "propAfter\|updatePropAfter" app/ --include="*.tsx" --include="*.ts"
```
Update any components that reference these to either remove the usage or use the deprecated field safely.

- [ ] **Step 5: Commit**

```bash
git add app/types/deal.ts app/hooks/useCalculator.ts
git commit -m "feat: add BeforeRoom type and roomsBefore field, remove propAfter"
```

---

### Task 12: Build BeforeRoomsStep component

**Files:**
- Create: `app/components/BeforeRoomsStep.tsx`

- [ ] **Step 1: Create BeforeRoomsStep component**

```typescript
"use client";
import { useState } from "react";
import { BeforeRoom } from "@/types/deal";
import { detectRoomType } from "@/data/roomTemplates";
import { theme } from "@/components/theme";

interface BeforeRoomsStepProps {
  rooms: BeforeRoom[];
  setRooms: (rooms: BeforeRoom[]) => void;
  defaultCeilingHeight: number;
  isMobile: boolean;
}

export default function BeforeRoomsStep({ rooms, setRooms, defaultCeilingHeight, isMobile }: BeforeRoomsStepProps) {
  const [nextId, setNextId] = useState(rooms.length + 1);

  const addRoom = () => {
    setRooms([...rooms, {
      id: nextId,
      name: "",
      sqm: 0,
      ceilingHeight: null,
      notes: "",
      roomType: "bedroom",
    }]);
    setNextId(nextId + 1);
  };

  const updateRoom = (id: number, updates: Partial<BeforeRoom>) => {
    setRooms(rooms.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, ...updates };
      if (updates.name !== undefined) {
        updated.roomType = detectRoomType(updates.name);
      }
      return updated;
    }));
  };

  const removeRoom = (id: number) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const totalSqm = rooms.reduce((s, r) => s + r.sqm, 0);

  return (
    <div>
      <div style={{ ...theme.card, padding: 16, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <strong>Existing Rooms</strong>
          <span style={{ color: theme.textDim, marginLeft: 8 }}>
            {rooms.length} rooms | {totalSqm} sqm
          </span>
        </div>
        <button onClick={addRoom} style={theme.btnPrimary}>+ Add Room</button>
      </div>

      {rooms.length === 0 && (
        <div style={{ ...theme.card, padding: 24, textAlign: "center", color: theme.textDim }}>
          Add existing rooms to capture the property's current state
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
        {rooms.map(room => (
          <div key={room.id} style={{ ...theme.card, padding: 16 }}>
            <input
              placeholder="Room name (e.g. Kitchen)"
              value={room.name}
              onChange={(e) => updateRoom(room.id, { name: e.target.value })}
              style={{ ...theme.input, width: "100%", marginBottom: 8 }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <NumInput label="Size (sqm)" value={room.sqm} onChange={(v) => updateRoom(room.id, { sqm: v })} />
              <NumInput
                label="Ceiling (m)"
                value={room.ceilingHeight ?? defaultCeilingHeight}
                onChange={(v) => updateRoom(room.id, { ceilingHeight: v })}
                step={0.1}
              />
            </div>
            <select
              value={room.condition || ""}
              onChange={(e) => updateRoom(room.id, { condition: (e.target.value || undefined) as BeforeRoom["condition"] })}
              style={{ ...theme.input, width: "100%", marginTop: 8 }}
            >
              <option value="">Condition (optional)</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
              <option value="derelict">Derelict</option>
            </select>
            <textarea
              placeholder="Notes"
              value={room.notes}
              onChange={(e) => updateRoom(room.id, { notes: e.target.value })}
              style={{ ...theme.input, width: "100%", marginTop: 8, minHeight: 40 }}
            />
            <button onClick={() => removeRoom(room.id)} style={{ ...theme.btnDanger, marginTop: 8, fontSize: 13 }}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Import `NumInput` from the same source used by `RoomsStep.tsx` (check its imports for the exact path). Also import `RoomData` from `@/types/deal` for the delta summary.

- [ ] **Step 2: Add property delta summary component**

At the bottom of BeforeRoomsStep (or as a separate component), show the delta:
```typescript
function PropertyDeltaSummary({ before, after }: { before: BeforeRoom[]; after: RoomData[] }) {
  const countByType = (rooms: { roomType: string }[]) =>
    rooms.reduce((acc, r) => ({ ...acc, [r.roomType]: (acc[r.roomType] || 0) + 1 }), {} as Record<string, number>);

  const bc = countByType(before);
  const ac = countByType(after);
  const allTypes = [...new Set([...Object.keys(bc), ...Object.keys(ac)])];
  const bSqm = before.reduce((s, r) => s + r.sqm, 0);
  const aSqm = after.reduce((s, r) => s + r.sqm, 0);

  return (
    <div style={{ ...theme.card, padding: 16 }}>
      <h4>Property Transformation</h4>
      {allTypes.map(type => {
        const diff = (ac[type] || 0) - (bc[type] || 0);
        if (diff === 0) return null;
        return <div key={type}>{diff > 0 ? "+" : ""}{diff} {type}</div>;
      })}
      <div>{aSqm - bSqm > 0 ? "+" : ""}{aSqm - bSqm} sqm total</div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/BeforeRoomsStep.tsx
git commit -m "feat: add BeforeRoomsStep component with property delta summary"
```

---

### Task 13: Add smart room auto-population

**Files:**
- Modify: `app/data/roomTemplates.ts` (add generateRoomsFromProperty, presetToRoom)
- Modify: `app/components/RoomsStep.tsx` (add Generate/Preset buttons)

- [ ] **Step 1: Write test for generateRoomsFromProperty**

Add to `app/data/__tests__/roomTemplates.test.ts`:
```typescript
import { generateRoomsFromProperty } from "../roomTemplates";

describe("generateRoomsFromProperty", () => {
  it("generates rooms matching property details", () => {
    const rooms = generateRoomsFromProperty({
      totalSqm: 120, erfSize: 300, bedrooms: 3, bathrooms: 2, garages: 1, stories: "1",
    });
    const types = rooms.map(r => r.roomType);
    expect(types.filter(t => t === "bedroom")).toHaveLength(3);
    expect(types.filter(t => t === "bathroom")).toHaveLength(2);
    expect(types).toContain("kitchen");
    expect(types).toContain("lounge");
    expect(types).toContain("garage");
  });

  it("omits garage when garages is 0", () => {
    const rooms = generateRoomsFromProperty({
      totalSqm: 80, erfSize: 200, bedrooms: 2, bathrooms: 1, garages: 0, stories: "1",
    });
    expect(rooms.map(r => r.roomType)).not.toContain("garage");
  });

  it("returns valid RoomData objects", () => {
    const rooms = generateRoomsFromProperty({
      totalSqm: 120, erfSize: 300, bedrooms: 3, bathrooms: 2, garages: 1, stories: "1",
    });
    for (const room of rooms) {
      expect(room.id).toBeGreaterThan(0);
      expect(room.sqm).toBeGreaterThan(0);
      expect(room.breakdownMode).toBe("simple");
      expect(room.customCost).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run app/data/__tests__/roomTemplates.test.ts
```

- [ ] **Step 3: Implement presetToRoom and generateRoomsFromProperty**

Add to `app/data/roomTemplates.ts`:
```typescript
function presetToRoom(preset: PresetRoom, id: number): RoomData {
  return {
    id,
    name: preset.name,
    sqm: preset.sqm,
    scope: preset.scope,
    customCost: null,
    notes: "",
    roomType: preset.roomType,
    breakdownMode: "simple",
    detailedItems: null,
    ceilingHeight: null,  // uses house default
    doorSqm: 0,
    windowSqm: 0,
  };
}

export function generateRoomsFromProperty(prop: { bedrooms: number; bathrooms: number; garages: number }): RoomData[] {
  const rooms: RoomData[] = [];
  let nextId = 1;

  const addPreset = (name: string) => {
    const preset = PRESET_ROOMS.find(p => p.name === name);
    if (preset) rooms.push(presetToRoom(preset, nextId++));
  };

  for (let i = 0; i < prop.bedrooms; i++) {
    addPreset(i === 0 ? "Master Bedroom" : `Bedroom ${i + 1}`);
  }
  for (let i = 0; i < prop.bathrooms; i++) {
    addPreset(i === 0 ? "Main Bathroom" : i === 1 ? "En-suite Bathroom" : `Bathroom ${i + 1}`);
  }
  addPreset("Kitchen");
  addPreset("Lounge");
  if (prop.garages > 0) addPreset("Garage");
  addPreset("Dining Room");
  addPreset("Entrance Hall");
  addPreset("Passage");

  return rooms;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run app/data/__tests__/roomTemplates.test.ts
```
Expected: All PASS.

- [ ] **Step 5: Add Generate/Preset buttons to RoomsStep**

In `app/components/RoomsStep.tsx`, add two buttons in the header card:
```tsx
<button onClick={() => {
  const generated = generateRoomsFromProperty(prop);
  // Replace rooms (or append if rooms exist — ask user?)
  onGenerateRooms(generated);
}} style={theme.btnSecondary}>
  Generate from Property
</button>

<button onClick={() => {
  const all = PRESET_ROOMS.map((p, i) => presetToRoom(p, nextRoomId + i));
  onGenerateRooms(all);
}} style={theme.btnSecondary}>
  Load Full Preset
</button>
```

Add `prop` and `onGenerateRooms` to `RoomsStepProps`.

- [ ] **Step 6: Wire up in DealAnalysis**

Pass `prop` and a handler to RoomsStep from DealAnalysis:
```tsx
<RoomsStep
  // ... existing props
  prop={calc.prop}
  onGenerateRooms={(rooms) => {
    calc.setRooms(rooms);
    calc.setNextRoomId(rooms.length + 1);
  }}
/>
```

- [ ] **Step 7: Commit**

```bash
git add app/data/roomTemplates.ts app/data/__tests__/ app/components/RoomsStep.tsx app/components/deals/DealAnalysis.tsx
git commit -m "feat: add smart room auto-population from property details"
```

---

### Task 14: Wire BeforeRoomsStep into the wizard

**Files:**
- Modify: `app/components/deals/DealAnalysis.tsx:278-292` (step rendering)
- Modify: `app/data/constants.ts` (STEPS array — add "Existing Rooms" step)

- [ ] **Step 1: Add new steps to STEPS constant**

Find the STEPS array in `app/data/constants.ts`. The current order is:
```
0: Acquisition, 1: Property, 2: Rooms, 3: Contractors, 4: CostDatabase,
5: Holding, 6: Resale, 7: Materials, 8: ScenarioLab, 9: Expenses, 10: Summary
```

Insert two new steps after Property:
```
0: Acquisition, 1: Property, 2: Existing Rooms, 3: Materials & Finishes,
4: Rooms (Planned), 5: Contractors, 6: CostDatabase, 7: Holding, 8: Resale,
9: MaterialBreakdown, 10: ScenarioLab, 11: Expenses, 12: Summary
```

This means: **all existing case numbers in renderStep shift by +2** (old case 2 becomes case 4, etc.). Task 18 does NOT need a separate STEPS modification — it's handled here.

- [ ] **Step 2: Update renderStep in DealAnalysis**

Add new cases and renumber ALL existing cases (+2):
```tsx
case 2: // Existing Rooms (before)
  return (
    <BeforeRoomsStep
      rooms={calc.roomsBefore}
      setRooms={calc.setRoomsBefore}
      defaultCeilingHeight={calc.prop.defaultCeilingHeight ?? 2.4}
      plannedRooms={calc.rooms}
      isMobile={isMobile}
    />
  );
case 3: // Materials & Finishes (palette)
  return (
    <MaterialPaletteStep
      palette={calc.materialPalette}
      updatePalette={calc.setMaterialPalette}
      isMobile={isMobile}
    />
  );
case 4: // Rooms (Planned) — was case 2
  return <RoomsStep ... />;
// case 5: Contractors — was case 3
// case 6: CostDatabase — was case 4
// ... etc, all shifted by +2
```

Update **every** subsequent case number. Do a find-and-replace through the entire switch statement.

- [ ] **Step 3: Pass planned rooms to BeforeRoomsStep for delta display**

Add `plannedRooms={calc.rooms}` to BeforeRoomsStep props so it can show the property delta summary.

- [ ] **Step 4: Test the wizard flow manually**

Run `npm run dev`, navigate to a deal, enter advanced mode, verify:
1. Property step has ceiling height input
2. "Existing Rooms" step appears after Property
3. "Planned Rooms" step shows Generate/Preset buttons
4. Room cards show ceiling height, door sqm, window sqm fields
5. Net wall area updates when deductions change

- [ ] **Step 5: Commit**

```bash
git add app/components/deals/DealAnalysis.tsx app/data/constants.ts app/components/BeforeRoomsStep.tsx
git commit -m "feat: add existing rooms step to advanced wizard with property delta"
```

---

## Chunk 4: Material Palette & Agent Commission

### Task 15: Add material palette types

**Files:**
- Modify: `app/types/deal.ts` (add ColorSelection, TileSelection, MaterialPalette)
- Modify: `app/types/deal.ts:89-96` (DetailedItem — add paletteRef)
- Modify: `app/types/deal.ts:296-312` (ShoppingListItem — add paletteRef)

- [ ] **Step 1: Add palette types**

In `app/types/deal.ts`, add:
```typescript
export interface ColorSelection {
  id: string;
  role: "exterior" | "exterior_accent" | "interior" | "interior_accent";
  name: string;
  brand: string;
  productCode: string;
  pricePerLitre: number;
}

export interface TileSelection {
  id: string;
  label: string;
  type: "ceramic" | "porcelain" | "vinyl" | "natural_stone" | "other";
  size: string;
  pricePerSqm: number;
  brand: string;
  supplier: string;
}

export interface MaterialPalette {
  colors: ColorSelection[];
  tiles: TileSelection[];
}
```

- [ ] **Step 2: Add materialPalette to DealData**

```typescript
export interface DealData {
  // ... existing fields
  materialPalette?: MaterialPalette; // defaults to { colors: [], tiles: [] } via ??
}
```

- [ ] **Step 3: Add paletteRef to DetailedItem**

```typescript
export interface DetailedItem {
  key: string;
  label: string;
  unit: string;
  included: boolean;
  qty: number;
  unitCost: number;
  paletteRef?: string | null; // ID of palette color/tile, null = manual pricing
}
```

- [ ] **Step 4: Add paletteRef to ShoppingListItem**

```typescript
export interface ShoppingListItem {
  // ... existing fields
  paletteRef?: string; // ID of palette item for aggregation
}
```

- [ ] **Step 5: Commit**

```bash
git add app/types/deal.ts
git commit -m "feat: add material palette types (colors, tiles, palette refs)"
```

---

### Task 16: Build MaterialPaletteStep component

**Files:**
- Create: `app/components/MaterialPaletteStep.tsx`

- [ ] **Step 1: Create the component**

Build a component with two sections:

**Colors section:** 4 fixed rows (exterior, exterior accent, interior, interior accent). Each row has:
- Role label (read-only)
- Name input (text)
- Brand input (text)
- Product code input (text)
- Price per litre (NumInput)

**Tiles section:** Dynamic list (add/remove). Each row has:
- Label input (text)
- Type dropdown (ceramic, porcelain, vinyl, natural_stone, other)
- Size dropdown (300x300, 600x600, 300x600, 800x800, custom)
- Price per sqm (NumInput)
- Brand input (text)
- Supplier input (text, optional)
- Delete button

Props:
```typescript
interface MaterialPaletteStepProps {
  palette: MaterialPalette;
  updatePalette: (palette: MaterialPalette) => void;
  isMobile: boolean;
}
```

Follow existing component patterns (theme object, card layout, NumInput).

- [ ] **Step 2: Commit**

```bash
git add app/components/MaterialPaletteStep.tsx
git commit -m "feat: add MaterialPaletteStep component for house-level color and tile selection"
```

---

### Task 17: Wire palette into room breakdown dropdowns

**Files:**
- Modify: `app/components/RoomBreakdown.tsx`

- [ ] **Step 1: Add palette prop to RoomBreakdown**

Update `RoomBreakdownProps` to receive the palette:
```typescript
interface RoomBreakdownProps {
  room: Room;
  updateRoom: (id: number, updates: Partial<Room>) => void;
  defaultCeilingHeight: number;
  palette: MaterialPalette;
}
```

- [ ] **Step 2: Add dropdown for tile items**

For detailed items with key containing "Tile" or "tiles" (e.g., floorTiles, wallTiles), add a dropdown above the unit cost field:
```tsx
{item.key.toLowerCase().includes("tile") && palette.tiles.length > 0 && (
  <select
    value={item.paletteRef || ""}
    onChange={(e) => {
      const ref = e.target.value || null;
      const tile = palette.tiles.find(t => t.id === ref);
      updateItem(item.key, {
        paletteRef: ref,
        unitCost: tile ? tile.pricePerSqm : item.unitCost,
      });
    }}
  >
    <option value="">Manual price</option>
    {palette.tiles.map(t => (
      <option key={t.id} value={t.id}>{t.label} (R{t.pricePerSqm}/sqm)</option>
    ))}
  </select>
)}
```

- [ ] **Step 3: Add dropdown for paint items**

For items with key containing "paint" or "painting", add a color palette dropdown:
```tsx
{item.key.toLowerCase().includes("paint") && palette.colors.length > 0 && (
  <select
    value={item.paletteRef || ""}
    onChange={(e) => {
      const ref = e.target.value || null;
      const color = palette.colors.find(c => c.id === ref);
      updateItem(item.key, {
        paletteRef: ref,
        unitCost: color ? color.pricePerLitre : item.unitCost,
      });
    }}
  >
    <option value="">Manual price</option>
    {palette.colors.map(c => (
      <option key={c.id} value={c.id}>{c.role.replace("_", " ")} — {c.name} (R{c.pricePerLitre}/L)</option>
    ))}
  </select>
)}
```

- [ ] **Step 4: Derive unitCost from palette at render time**

When rendering the unit cost, if `paletteRef` is set, look up the current palette price:
```typescript
const getEffectiveUnitCost = (item: DetailedItem) => {
  if (!item.paletteRef) return item.unitCost;
  const tile = palette.tiles.find(t => t.id === item.paletteRef);
  if (tile) return tile.pricePerSqm;
  const color = palette.colors.find(c => c.id === item.paletteRef);
  if (color) return color.pricePerLitre;
  return item.unitCost; // fallback if palette item deleted
};
```

- [ ] **Step 5: Commit**

```bash
git add app/components/RoomBreakdown.tsx
git commit -m "feat: add palette dropdowns for tiles and paint in room breakdown"
```

---

### Task 18: Wire MaterialPaletteStep and palette state into the app

**Files:**
- Modify: `app/hooks/useCalculator.ts`
- Modify: `app/components/RoomsStep.tsx`

**Note:** The STEPS array and renderStep cases for MaterialPaletteStep were already added in Task 14. This task only adds the state and props wiring.

- [ ] **Step 1: Add palette state to useCalculator**

```typescript
import { MaterialPalette } from "@/types/deal";

const [materialPalette, setMaterialPalette] = useState<MaterialPalette>(
  (initialData?.materialPalette as MaterialPalette) ?? { colors: [], tiles: [] }
);
```

Add `materialPalette` and `setMaterialPalette` to the return object and `getSnapshot()`.

- [ ] **Step 2: Pass palette to RoomsStep and through to RoomBreakdown**

Add `palette: MaterialPalette` to `RoomsStepProps`. In `RoomsStep`, forward to each `RoomBreakdown`:
```tsx
<RoomBreakdown
  room={room}
  updateRoom={updateRoom}
  defaultCeilingHeight={defaultCeilingHeight}
  palette={palette}
/>
```

- [ ] **Step 3: Commit**

```bash
git add app/hooks/useCalculator.ts app/components/RoomsStep.tsx
git commit -m "feat: wire material palette state and pass through to room breakdown"
```

---

### Task 19: Agent commission toggle with sale method

**Files:**
- Modify: `app/types/deal.ts:121-125` (ResaleData)
- Modify: `app/components/ResaleStep.tsx:93-102`
- Modify: `app/hooks/useCalculator.ts:129-135` (agentComm calc)
- Modify: `app/hooks/useCalculator.ts:178-191` (sensCalc)

- [ ] **Step 1: Write test for commission calculation**

Create `app/hooks/__tests__/useCalculator-commission.test.ts`:
```typescript
import { describe, it, expect } from "vitest";

describe("agent commission calculation", () => {
  it("applies commission when saleMethod is agent", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5, saleMethod: "agent" as const };
    const comm = r.saleMethod === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(50000);
  });

  it("returns 0 commission for private sale", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5, saleMethod: "private" as const };
    const comm = r.saleMethod === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(0);
  });

  it("defaults to agent when saleMethod is undefined (backward compat)", () => {
    const r = { expectedPrice: 1000000, agentCommission: 5 } as any;
    const method = r.saleMethod ?? "agent";
    const comm = method === "agent" ? r.expectedPrice * (r.agentCommission / 100) : 0;
    expect(comm).toBe(50000);
  });
});
```

- [ ] **Step 2: Run test**

```bash
npx vitest run app/hooks/__tests__/useCalculator-commission.test.ts
```

- [ ] **Step 3: Add SaleMethod type and update ResaleData**

In `app/types/deal.ts`:
```typescript
export type SaleMethod = "agent" | "private" | "auction" | "own_listing" | "other";

export interface ResaleData {
  expectedPrice: number;
  areaBenchmarkPsqm: number;
  agentCommission: number;
  saleMethod?: SaleMethod; // defaults to "agent" via ?? at read sites
}
```

- [ ] **Step 4: Update useCalculator commission logic**

In `app/hooks/useCalculator.ts`, update the agentComm calculation (line ~129):
```typescript
const saleMethod = r.saleMethod ?? "agent";
const agentComm = saleMethod === "agent"
  ? r.expectedPrice * (r.agentCommission / 100)
  : 0;
```

Update sensCalc (line ~178-191):
```typescript
const adjComm = saleMethod === "agent"
  ? adjResale * (r.agentCommission / 100)
  : 0;
```

- [ ] **Step 5: Update ResaleStep UI**

In `app/components/ResaleStep.tsx`, add a toggle and sale method dropdown:
```tsx
const saleMethod = resale.saleMethod ?? "agent";
const isAgent = saleMethod === "agent";

{/* Toggle */}
<div style={{ display: "flex", alignItems: "center", gap: 12 }}>
  <label>Using estate agent?</label>
  <input
    type="checkbox"
    checked={isAgent}
    onChange={(e) => updateResale({
      saleMethod: e.target.checked ? "agent" : "private"
    })}
  />
</div>

{/* Commission field — only when agent */}
{isAgent && (
  <NumInput
    label="Agent Commission (%)"
    value={resale.agentCommission}
    onChange={(v) => updateResale({ agentCommission: v })}
  />
)}

{/* Sale method dropdown — only when not agent */}
{!isAgent && (
  <select
    value={saleMethod}
    onChange={(e) => updateResale({ saleMethod: e.target.value as SaleMethod })}
  >
    <option value="private">Private sale</option>
    <option value="auction">Auction</option>
    <option value="own_listing">Own listing</option>
    <option value="other">Other</option>
  </select>
)}
```

- [ ] **Step 6: Hide commission from formula display when not agent**

In the formulas section, wrap agent commission display in a conditional:
```tsx
{isAgent && <div>Agent Commission: {fmt(agentComm)}</div>}
```

- [ ] **Step 7: Run tests**

```bash
npm test
```

- [ ] **Step 8: Commit**

```bash
git add app/types/deal.ts app/hooks/useCalculator.ts app/components/ResaleStep.tsx
git commit -m "feat: add sale method toggle — agent commission optional with reason"
```

---

### Task 19b: Shopping list palette aggregation

**Files:**
- Modify: `app/components/MaterialBreakdown.tsx` (or wherever the shopping list / material breakdown is rendered)

- [ ] **Step 1: Find the shopping list / material breakdown component**

Search for `MaterialBreakdown` or `ShoppingList` components:
```bash
grep -rn "ShoppingList\|MaterialBreakdown" app/components/ --include="*.tsx" -l
```

Read the component to understand its current rendering logic.

- [ ] **Step 2: Add palette-based aggregation**

When rendering shopping list items that have a `paletteRef`, group them by `paletteRef` and show aggregated quantities:

```typescript
// Group items by paletteRef
const paletteGroups = items
  .filter(item => item.paletteRef)
  .reduce((acc, item) => {
    const ref = item.paletteRef!;
    if (!acc[ref]) acc[ref] = { items: [], totalQty: 0, totalCost: 0 };
    acc[ref].items.push(item);
    acc[ref].totalQty += item.qty ?? item.actualQty ?? 0;
    acc[ref].totalCost += (item.qty ?? 0) * (item.unitPrice ?? 0);
    return acc;
  }, {} as Record<string, { items: ShoppingListItem[]; totalQty: number; totalCost: number }>);
```

Render grouped items with room breakdown:
```tsx
{Object.entries(paletteGroups).map(([ref, group]) => {
  const tile = palette.tiles.find(t => t.id === ref);
  const color = palette.colors.find(c => c.id === ref);
  const label = tile?.label ?? color?.name ?? "Unknown";
  return (
    <div key={ref} style={{ ...theme.card, padding: 12, marginBottom: 8 }}>
      <strong>{label}</strong> — {group.totalQty} sqm total — R{(group.totalCost).toLocaleString()}
      <div style={{ fontSize: 13, color: theme.textDim }}>
        {group.items.map(i => `${i.label ?? i.materialKey}: ${i.qty}`).join(", ")}
      </div>
    </div>
  );
})}
```

- [ ] **Step 3: Commit**

```bash
git add app/components/MaterialBreakdown.tsx
git commit -m "feat: add palette-based aggregation to shopping list / material breakdown"
```

---

## Chunk 5: Frontend Quality & Final Integration

### Task 20: Add error states to data hooks

**Files:**
- Modify: `app/hooks/api/useApiDeals.ts`
- Modify: `app/hooks/api/useApiTools.ts`
- Modify: all other `useApi*.ts` files in `app/hooks/api/`

- [ ] **Step 1: Enumerate all hooks to update**

List all hooks in `app/hooks/api/`:
```bash
ls app/hooks/api/
```
Each `useApi*.ts` file needs the same update.

- [ ] **Step 2: Update hook return shape**

For each hook in `app/hooks/api/`, add an `error` state:
```typescript
const [error, setError] = useState<string | null>(null);

const fetchAll = useCallback(async () => {
  try {
    setError(null);
    const raw = await api("/api/my-models");
    setItems((raw.data ?? raw).map(dbToClient));
  } catch (e) {
    setError(e instanceof Error ? e.message : "Failed to load data");
  } finally {
    setLoaded(true);
  }
}, []);

return { items, loaded, error, /* ... other methods */ };
```

- [ ] **Step 3: Commit**

```bash
git add app/hooks/api/
git commit -m "fix: add error state to data fetching hooks"
```

---

### Task 21: Replace silent catch blocks with error feedback

**Files:**
- Modify: `app/(erp)/assignments/page.tsx:79-80,96-97`
- Modify: `app/(erp)/team/page.tsx:114`
- Modify: `app/(erp)/settings/page.tsx:44`
- Modify: any other pages with empty catch blocks

- [ ] **Step 1: Search for silent catches**

Search the codebase for `catch` blocks that are empty or have `/* ignore */`:
```bash
grep -rn "catch.*{.*}" app/(erp)/ --include="*.tsx" | grep -v "setError\|console\|toast\|logger"
```

- [ ] **Step 2: Replace with error logging**

For each silent catch, add user feedback. Use a simple toast pattern if one exists, or `console.error` with a setState for error display:
```typescript
catch (err) {
  console.error("Failed to load assignments:", err);
  // If toast exists: showToast("Failed to load data", "error");
  // If not: setError("Failed to load data");
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(erp)/
git commit -m "fix: replace silent catch blocks with error feedback"
```

---

### Task 22: Final integration test

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: All tests pass.

- [ ] **Step 2: Run linter**

```bash
npm run lint
```
Expected: No errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```
Expected: Build succeeds with no type errors.

- [ ] **Step 4: Manual smoke test**

Run `npm run dev` and verify:
1. Login works (rate limiting doesn't block normal usage)
2. Create a new deal in advanced mode
3. Property step shows ceiling height input
4. "Existing Rooms" step lets you add before-state rooms
5. Materials & Finishes step lets you define colors and tiles
6. "Planned Rooms" step has "Generate from Property" button
7. Room breakdown shows ceiling height, door/window deductions
8. Room breakdown has palette dropdowns for tiles and paint
9. Resale step has agent toggle with sale method dropdown
10. Commission disappears from formulas when agent is off
11. All existing deals load without errors (backward compatibility)

- [ ] **Step 5: Commit any final fixes**

Stage only the specific files that were changed during smoke test fixes (do NOT use `git add -A` as it may include sensitive files):
```bash
git status
# Review changed files, then add them individually:
git add <specific-files>
git commit -m "fix: integration fixes from smoke testing"
```
