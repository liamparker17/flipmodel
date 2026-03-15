# FlipModel Improvements — Design Spec

**Date:** 2026-03-15
**Scope:** Room calculator enhancements, house-level material palette, agent commission flexibility, codebase quality fixes

---

## 1. Room Calculator Enhancements

### 1.1 Ceiling Height

- **House-level default** set in the Property step (default: 2.4m, editable field)
- **Per-room override** on each room card — displays "2.4m (default)" with option to change for vaulted ceilings, double volumes, etc.
- Wall area formula changes from `perimeter × 2.4` to `perimeter × room.ceilingHeight`
- Volume (`sqm × ceilingHeight`) calculated and displayed per room
- `calcAutoQty("wallArea", roomSqm)` updated to accept ceiling height parameter

**Backward compatibility:** All new fields on JSON-stored types (`PropertyData`, `RoomData`, `DealData`, `ResaleData`) must be read with fallback defaults since existing deals won't have them. Every read site must use nullish coalescing (e.g., `prop.defaultCeilingHeight ?? 2.4`).

**Type changes:**
```typescript
// PropertyData gets new field
export interface PropertyData {
  // ... existing fields
  defaultCeilingHeight: number; // default 2.4, read as: prop.defaultCeilingHeight ?? 2.4
}

// RoomData gets new fields
export interface RoomData {
  // ... existing fields
  ceilingHeight: number | null; // null = use house default
}
```

### 1.2 Wall Deductions (Doors & Windows)

- Each room gets two new fields: `doorSqm: number` (default 0) and `windowSqm: number` (default 0)
- User enters actual sqm of doors and windows to deduct
- **Net wall area** = `(perimeter × ceilingHeight) - doorSqm - windowSqm`
- Net value feeds into paint quantity, wall tile quantity, and all `wallArea`-based auto-calculations
- Fields default to 0 so existing rooms are unaffected

**Type changes:**
```typescript
export interface RoomData {
  // ... existing fields
  doorSqm: number;   // default 0
  windowSqm: number; // default 0
}
```

**Formula update in `roomTemplates.ts`:**
```typescript
export function calcAutoQty(
  autoQty: number | "sqm" | "lm" | "wallArea",
  roomSqm: number,
  ceilingHeight: number = 2.4,
  doorSqm: number = 0,
  windowSqm: number = 0
): number {
  const perimeter = 4 * Math.sqrt(roomSqm);
  switch (autoQty) {
    case "sqm": return roomSqm;
    case "lm": return Math.round(perimeter * 10) / 10;
    case "wallArea":
      const grossWall = perimeter * ceilingHeight;
      const netWall = grossWall - doorSqm - windowSqm;
      return Math.round(Math.max(0, netWall) * 10) / 10;
    default: return typeof autoQty === "number" ? autoQty : 1;
  }
}
```

### 1.3 Before & After Rooms

- **Two independent room lists**: `roomsBefore` (existing snapshot) and `rooms` (planned/after)
- `roomsBefore` captured during initial property walkthrough:
  - Room name, sqm, ceiling height, condition (optional), notes
  - Represents "what's there now"
- `rooms` (existing field) becomes the "planned" layout — what you're building
- **Replaces `propAfter`**: The existing `propAfter?: PropertyData` field on `DealData` is superseded by `roomsBefore`. The property-level delta is now derived from the two room lists rather than requiring separate before/after property objects. `propAfter` should be removed.
- **Property-level delta** auto-calculated and shown as a summary card:
  - Bedroom count change, bathroom count change, total sqm change
  - E.g., "+1 bathroom, -1 bedroom, +20sqm total"
- No linking between before/after rooms — clean separation avoids the complexity of rooms merging, splitting, or changing purpose

**Type changes:**
```typescript
export interface BeforeRoom {
  id: number;
  name: string;
  sqm: number;
  ceilingHeight: number | null;
  condition?: "good" | "fair" | "poor" | "derelict"; // optional — may not assess every room
  notes: string;
  roomType: string; // set via detectRoomType(name) from roomTemplates.ts on creation
}

export interface DealData {
  // ... existing fields
  roomsBefore: BeforeRoom[]; // new field
  // rooms: RoomData[] — existing, becomes "planned/after"
}
```

**Delta calculation:**
```typescript
function calcPropertyDelta(before: BeforeRoom[], after: RoomData[]): PropertyDelta {
  const countByType = (rooms: { roomType: string }[]) =>
    rooms.reduce((acc, r) => ({ ...acc, [r.roomType]: (acc[r.roomType] || 0) + 1 }), {} as Record<string, number>);

  const beforeCounts = countByType(before);
  const afterCounts = countByType(after);
  const beforeSqm = before.reduce((s, r) => s + r.sqm, 0);
  const afterSqm = after.reduce((s, r) => s + r.sqm, 0);

  return { beforeCounts, afterCounts, sqmDelta: afterSqm - beforeSqm };
}
```

### 1.4 Smart Room Auto-Population

- When user fills in property details (beds: 3, baths: 2, garage: yes), a **"Generate Rooms"** button creates matching rooms with sensible default sqm values
- **"Load Full Preset"** button as fallback loads all 13 preset rooms
- Generated rooms are fully editable — rename, change sqm, delete, add more
- Generation logic uses property fields to select from `PRESET_ROOMS`:
  - N bedrooms → Master Bedroom + Bedroom 2..N
  - N bathrooms → Main Bathroom + En-suite (if N >= 2) + Bathroom 3..N
  - Kitchen always included
  - Lounge always included
  - Garage if `garages > 0`
  - Dining room, entrance, passage included by default

**New functions in `roomTemplates.ts`:**
```typescript
// Converts a PRESET_ROOMS entry to a full RoomData object
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

export function generateRoomsFromProperty(prop: PropertyData): RoomData[] {
  const rooms: RoomData[] = [];
  let nextId = 1;

  const addPreset = (name: string) => {
    const preset = PRESET_ROOMS.find(p => p.name === name);
    if (preset) rooms.push(presetToRoom(preset, nextId++));
  };

  // Bedrooms
  for (let i = 0; i < prop.bedrooms; i++) {
    addPreset(i === 0 ? "Master Bedroom" : `Bedroom ${i + 1}`);
  }
  // Bathrooms
  for (let i = 0; i < prop.bathrooms; i++) {
    addPreset(i === 0 ? "Main Bathroom" : i === 1 ? "En-suite Bathroom" : `Bathroom ${i + 1}`);
  }
  // Always: kitchen, lounge
  addPreset("Kitchen");
  addPreset("Lounge");
  // Conditional
  if (prop.garages > 0) addPreset("Garage");
  // Defaults: dining, entrance, passage
  addPreset("Dining Room");
  addPreset("Entrance Hall");
  addPreset("Passage");
  return rooms;
}
```

**Note:** `generateRoomItems()` must also be updated to pass room-specific `ceilingHeight`, `doorSqm`, and `windowSqm` through to `calcAutoQty()` so generated detailed items reflect the room's actual dimensions.

---

## 2. House-Level Material Palette

### 2.1 Color Palette

New **"Materials & Finishes"** section at the deal level, positioned between Property and Rooms in the advanced wizard.

Four house-wide color selections:
- **Exterior color** — name, brand, product code, price per litre
- **Exterior accent** — same fields
- **Interior color** — same fields
- **Interior accent** — same fields

Each entry is a row with: label, color name, brand, price per litre.

### 2.2 Tile Palette

Same section, separate subsection. User adds 1-3 tile selections, each with:
- **Label** (e.g., "Main floor tile", "Bathroom wall tile")
- **Type** (ceramic, porcelain, vinyl, etc.)
- **Size** (300x300, 600x600, 300x600, etc.)
- **Price per sqm**
- **Supplier/brand** (optional)

### 2.3 Per-Room Assignment

In the room breakdown (detailed mode):
- Wall tiles and floor tiles get a **dropdown** to select from the house tile palette
- Selecting a palette tile sets `paletteRef` on the `DetailedItem` — **`unitCost` is always derived from the palette at render time** (not copied). This means changing a palette price automatically updates all rooms using that tile/color.
- Paint items get a dropdown: "Interior color", "Interior accent", "Exterior color", "Exterior accent"
- Quantity is still auto-calculated from room geometry (net wall area for wall tiles/paint, sqm for floor tiles)
- **Manual override** remains available — user can clear `paletteRef` and type a custom price if a room uses something off-palette

### 2.4 Shopping List Integration

Palette selections aggregate across rooms on the shopping list:
- E.g., "Main floor tile — 86sqm total (kitchen 14, lounge 22, dining 14, bedrooms 36) — R55,100 at R640/sqm"
- Grouped by palette item for easy ordering

**ShoppingListItem update:**
```typescript
export interface ShoppingListItem {
  // ... existing fields
  paletteRef?: string; // ID of palette color/tile, enables aggregation by palette item
}
```

**Type definitions:**
```typescript
export interface ColorSelection {
  id: string;
  role: "exterior" | "exterior_accent" | "interior" | "interior_accent";
  name: string;        // e.g., "Dulux Weathershield Brilliant White"
  brand: string;
  productCode: string;
  pricePerLitre: number;
}

export interface TileSelection {
  id: string;
  label: string;       // e.g., "Main floor tile"
  type: "ceramic" | "porcelain" | "vinyl" | "natural_stone" | "other";
  size: string;        // e.g., "600x600"
  pricePerSqm: number;
  brand: string;
  supplier: string;
}

export interface MaterialPalette {
  colors: ColorSelection[];
  tiles: TileSelection[];
}

export interface DealData {
  // ... existing fields
  materialPalette: MaterialPalette; // new field
}
```

**DetailedItem update:**
```typescript
export interface DetailedItem {
  // ... existing fields
  paletteRef: string | null; // ID of palette color/tile selection, null = manual pricing
}
```

---

## 3. Agent Commission & Sale Method

### 3.1 Toggle & Reason

- **"Using estate agent?"** toggle at the top of the Resale step
- When **on**: commission % field visible (default 5%), works as today
- When **off**: dropdown for reason — "Private sale", "Auction", "Own listing", "Other"
- Commission removed entirely from formula display when off (not just zeroed)

### 3.2 Data Model

```typescript
export type SaleMethod = "agent" | "private" | "auction" | "own_listing" | "other";

export interface ResaleData {
  expectedPrice: number;
  areaBenchmarkPsqm: number;
  saleMethod: SaleMethod;          // new field, default "agent"
  agentCommission: number;          // only used when saleMethod === "agent"
}
```

### 3.3 Calculation Update

```typescript
// In useCalculator.ts — main calculation AND sensitivity calculator (sensCalc)
const agentComm = (r.saleMethod ?? "agent") === "agent"
  ? r.expectedPrice * (r.agentCommission / 100)
  : 0;

// sensCalc must also use the same conditional:
const adjComm = (r.saleMethod ?? "agent") === "agent"
  ? adjResale * (r.agentCommission / 100)
  : 0;
```

**Note:** Nullish coalescing (`?? "agent"`) ensures backward compatibility with existing deals that lack `saleMethod`.

---

## 4. Codebase Quality Fixes

### 4.1 Critical Security

1. **Restrict `/api/dev/seed`** — gate behind `NODE_ENV === "development"` both in `proxy.ts` (remove `/api/dev` from public paths in production) AND in the route handler itself (return 404 if not development), since proxy-level checks alone could be bypassed
2. **Rate limit auth routes** — apply existing `rate-limit.ts` middleware to `/api/auth/login` and `/api/auth/signup`

### 4.2 API Consistency

3. **Add missing audit logs** — add `writeAuditLog()` to PATCH/DELETE handlers in:
   - `app/api/contacts/[contactId]/route.ts`
   - `app/api/deals/[dealId]/route.ts`
   - `app/api/tasks/[taskId]/route.ts`
   - `app/api/expenses/[expenseId]/route.ts`
4. **Add Zod validation** to 12 POST routes currently accepting raw bodies:
   - `accounting/sync`, `deals/import`, `financial-periods/[id]/close`, `gl/[id]/reverse`, `hr/leave/[id]/approve`, `import`, `notifications`, `notifications/send`, `org/migrate`, `payables/[id]/approve`, `tools/import`, `accounting/chart-of-accounts`
5. **Standardize GET permissions** — change `requireOrgMember()` to `requirePermission("module:read")` on: contacts, deals, invoices, milestones, tools, shopping-list routes
6. **Extract inline schemas** — move inline Zod schemas from 8 routes to `app/lib/validations/`: invoices, tasks, milestones, documents, financial-periods, org, accounting, shopping-list

### 4.3 Frontend Quality

7. **Add error states to data hooks** — update hooks to return `{ data, loaded, error }` instead of `{ items, loaded }`
8. **Replace silent catch blocks** — add toast notifications for failed API calls across pages with `/* ignore */` or empty catch blocks
9. **Add missing pagination** — implement pagination on assignments, org/members, contractors list endpoints

### 4.4 Performance

10. **Add database indexes** via Prisma migration:
    - `VendorBill.status`
    - `CustomerReceivable.status`
    - `Deal.stage`
    - `createdAt` on high-query tables (Deal, Expense, JournalEntry, VendorBill)

---

## Implementation Order

1. Codebase fixes (security first, then API consistency, frontend, performance)
2. Room calculator enhancements (ceiling height, wall deductions, before/after, auto-population)
3. Material palette (colors, tiles, per-room assignment, shopping list integration)
4. Agent commission toggle

This order ensures the foundation is solid before adding features, and each feature builds on the previous (rooms need ceiling height before materials can use net wall area).
