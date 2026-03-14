# Tutorial & Onboarding Overhaul — Design Spec

## Problem

The current onboarding and tutorial experience has critical issues:

1. **Onboarding wizard traps users** — 6 steps with no exit button. Users must wade through team invites, bond rates, and Xero integration before seeing the app.
2. **"Import data" is a fake button** — `alert("Import feature coming soon")` in production.
3. **"Quick Tour" is not a tour** — It's a bullet list of features, not interactive guidance.
4. **SpotlightTour is shallow** — Only highlights sidebar nav items with 1-line descriptions. Auto-skips steps if DOM elements are missing.
5. **No exit button on tour** — Only tiny "Skip tour" text. Clicking overlay accidentally dismisses.
6. **Demo accounts can't save data** — `seed()` runs on every `GET /api/deals` and deletes ALL deals, contacts, financial records, then recreates demo data. Any user input is wiped on next page load.
7. **Empty states are useless** — Generic "No X yet" text with no guidance on what to do.
8. **Field worker checkboxes are fake** — Dashboard task checkboxes are styled `<div>` elements with no onClick handler.

## Goal

A first-time user goes from signup to having a real property deal in their pipeline in under 3 minutes, with clear guidance at every step. Demo accounts can save and modify data without it being wiped.

---

## Design

### 1. Stripped Onboarding (30 seconds to app)

**Replace the 6-step wizard with a single screen.**

The only field required to create an org is `name`. Everything else (team setup, preferences, bookkeeping, location) already exists in Settings.

**New onboarding page:**
- Company name input (required)
- "Get Started" primary button
- "Skip — I'll set this up later" link below (creates org with default name "My Company")

On submit:
1. Call `api("/api/org", { method: "POST", body: JSON.stringify({ name, slug }) })` using the `api()` helper from `@/lib/client-fetch` (handles CSRF)
2. Call `api("/api/org/migrate", { method: "POST" }).catch(() => {})` — preserves the existing migration step for legacy data
3. Call `api("/api/user/profile", { method: "PATCH", body: JSON.stringify({ onboardingComplete: true }) }).catch(() => {})`
4. Redirect via `window.location.href = "/dashboard"` (full reload to refresh JWT with new org)

The old wizard steps (team, preferences, bookkeeping, import) are removed from onboarding. Users can configure these in Settings > Team, Settings > Preferences, and Settings > Integrations.

**Files affected:**
- Rewrite: `app/(auth)/onboarding/page.tsx`

### 2. Remove seed() from GET /api/deals

**This is the #1 blocker for demo accounts being usable.**

The current `GET /api/deals` route (line 14) calls `seed()` on every request. The `seed()` function runs `deleteMany` on 25+ tables (lines 217-241 of `prisma/seed.ts`) before recreating demo data. This means:
- Every change a demo user makes is destroyed on their next page load
- Unnecessary DB churn on every request
- Console warnings in production ("demo seed failed")

**Fix:**
- Remove the `seed()` call from `GET /api/deals` entirely
- Remove the `seed` import from the file
- Demo data should be seeded once — either via the `/api/dev/seed` endpoint (which already exists) or during initial database setup via `npx tsx prisma/seed.ts`
- If a "reset demo data" feature is desired, expose it as an explicit button in Settings (not auto-triggered)
- **Transition for existing demo accounts:** After this change, existing demo accounts keep whatever data they currently have. If the database needs re-seeding (e.g., after a wipe), use `npx tsx prisma/seed.ts` or hit `/api/dev/seed` manually.

**Files affected:**
- Modify: `app/api/deals/route.ts` — remove seed import and call (2 lines)

### 3. Guided First Deal Tutorial

When a user lands on the dashboard for the first time (zero deals, `tutorialCompleted` is false), an inline tutorial walks them through creating their first real property deal.

**Tutorial component:** A fixed-position card at the bottom-right of the viewport (not anchored to specific DOM elements — avoids positioning complexity and mobile overflow issues). Has a visible **X close button** in the top-right of every step. Dismissing at any step marks the tutorial complete — no "are you sure?" friction. On mobile, the card is full-width at the bottom of the screen.

**Steps:**

| Step | Location | Prompt | User Action |
|------|----------|--------|-------------|
| 1 | Dashboard (empty) | "Welcome! Let's set up your first property in about 2 minutes. Everything you enter is real — you'll keep it." | Click "Start" or "Skip, I know what I'm doing" |
| 2 | Dashboard | "Click '+ New Property' to create your first deal." | Click the + New Property button |
| 3 | Deal detail page | "Name your property and add the address." | Fill in name + address fields |
| 4 | Deal detail page | "Enter what you paid (or plan to pay) for this property." | Enter purchase price in acquisition section |
| 5 | Deal detail page | "Add a room to renovate — try 'Kitchen' or 'Main Bathroom'." | Add a room in the rooms section |
| 6 | Deal detail page | "Your profit projection is calculated automatically. You can keep adding rooms, expenses, and milestones." | Read the summary |
| 7 | Deal detail page | "You're set! Here's where to find everything:" then 3-item list: Pipeline (all your deals), Finance (expenses & invoices), Settings (team, preferences, integrations). | Click "Got it" |

**Role-specific behavior:**
- Roles that **cannot** create deals (`field_worker`, `viewer`, `site_supervisor` without `deals:write`) skip the tutorial entirely. They get a simplified welcome card on the dashboard: "Welcome! Your workspace is set up. Check 'My Work' for assigned tasks." + "Got it" button. This sets `tutorialCompleted: true`.
- Only `executive`, `project_manager`, and `finance_manager` (roles with `deals:write`) see the full guided first deal tutorial.

**State tracking:**
- `userPrefs.tutorialCompleted: boolean` — existing field in `User.preferences` JSON blob, reused
- `userPrefs.tutorialStep: number` — new field stored in same `User.preferences` JSON blob. The `/api/user/profile` PATCH endpoint already accepts arbitrary keys in `preferences` (it does a shallow merge).
- Tutorial state is shared via a **React context provider** (`TutorialProvider`) that wraps the app in `AppLayout`. This context exposes `{ tutorialActive, tutorialStep, advanceStep, dismissTutorial }`. Both dashboard and deal detail pages read from this context — no URL params, no re-fetching profile.
- On step transitions, the context calls `PATCH /api/user/profile` to persist `tutorialStep` in the background (fire-and-forget). If the user navigates away and returns, the provider reads the saved step from the initial profile fetch.
- If deal creation fails during step 2 (network error, permission denied), the TutorialCard shows an inline error: "Something went wrong. Try again or skip the tutorial." with a retry button.

**Trigger conditions:**
- Tutorial launches when: `tutorialCompleted !== true` AND user has `deals:write` permission AND org has zero deals
- If user has `tutorialCompleted !== true` but org already has deals (e.g., they joined an existing org, or were seeded), tutorial does NOT launch. Instead, set `tutorialCompleted: true` silently — they don't need deal creation guidance.

**Cross-page flow (dashboard → deal detail):**
- Step 2: User clicks "+ New Property". The `createDeal` function in `useApiDeals` creates the deal and calls `router.push(/pipeline/${deal.id})`. The TutorialProvider context persists across the navigation (it's in AppLayout which wraps both pages). Step advances to 3.
- Steps 3-7: The deal detail page reads `tutorialActive` and `tutorialStep` from context and renders the TutorialCard accordingly.
- If user manually navigates to `/pipeline/[dealId]` without the tutorial being active, no tutorial card renders.

**Files to create:**
- `app/components/TutorialCard.tsx` — fixed-position prompt card with X button, step counter, action button
- `app/lib/tutorialSteps.ts` — new file alongside existing `tourSteps.ts` (tourSteps.ts kept intact for potential future use)
- `app/components/TutorialProvider.tsx` — React context provider for tutorial state

**Files to modify:**
- `app/components/layout/AppLayout.tsx` — remove SpotlightTour auto-launch, wrap children with TutorialProvider, add tutorial trigger logic
- `app/(erp)/dashboard/page.tsx` — render tutorial steps 1-2 when tutorial active, render role-specific welcome for non-deal-creating roles
- `app/(erp)/pipeline/[dealId]/page.tsx` — render tutorial steps 3-7 when tutorial active (reads from TutorialProvider context)

### 4. Contextual Empty States

Replace generic "No X yet" text across ERP pages with actionable empty state cards.

**EmptyState component:** A centered card with:
- Icon or illustration placeholder
- Heading ("No properties yet")
- 1-2 sentence description of what this page does
- Primary action button ("Add Your First Property")
- Optional "dismiss" link for hint-style empty states

**Pages to update with contextual empty states:**

| Page | Current Empty State | New Empty State |
|------|-------------------|-----------------|
| Dashboard | "No properties yet. Add your first property to get started." | Tutorial step 1 (welcome card) when no deals; standard empty state otherwise |
| Pipeline | "No properties in your pipeline yet." + Add button | "Your deal pipeline tracks properties from lead to sold. Start by adding your first property." + "Add Property" button |
| Finance | Generic or none | "Track expenses and budgets for each property. Expenses are added from a deal's project page." + "View Projects" button |
| Contacts | Generic or none | "Keep your agents, attorneys, and contractors in one place." + "Add Contact" button |
| Tools | Generic or none | "Track equipment checkout, returns, and maintenance." + "Add Tool" button |
| Invoices | Generic or none | "Create and send invoices, track payment status." + "New Invoice" button |
| Documents | Generic or none | "Upload and organise documents per deal." + "Upload Document" button |

**Files to create:**
- `app/components/EmptyState.tsx` — reusable empty state card

**Files to modify:**
- Each ERP page listed above — replace generic empty text with `<EmptyState>` component

### 5. Kill SpotlightTour Auto-Launch

The current SpotlightTour is too shallow to justify the interruption. It will no longer auto-launch.

- Remove the tour trigger from `AppLayout.tsx` (lines 126-132)
- Keep `SpotlightTour.tsx` and `tourSteps.ts` files in the codebase (no deletion) — they may be useful for future feature-specific tours
- The guided first deal tutorial fully replaces the tour's purpose

### 6. Fix Field Worker Dashboard Checkboxes

The field worker dashboard (dashboard/page.tsx lines 596-605) renders a checkbox-styled `<div>` with no click handler. Tasks should be completable from the dashboard.

**Fix:** Add an `onClick` handler to the checkbox div that calls the existing `toggleTask` function from `useApiDeals`. The visual state should update optimistically.

**Files to modify:**
- `app/(erp)/dashboard/page.tsx` — add onClick to field worker task checkboxes, wire to task toggle API

### 7. Universal Exit Button Rule

Every overlay, modal, and floating UI element must have a visible X close button in the top-right corner. This includes:
- TutorialCard (new component — built with X from the start)
- Any existing modals in the codebase
- The onboarding page (skip link)

---

## Out of Scope (for this spec)

These issues were found during evaluation but belong in a separate spec/plan:

- Missing invoice PATCH/DELETE endpoints
- Permission inconsistencies (PO approval using `expenses:approve`)
- No notifications UI
- No breadcrumbs
- Dev seed endpoint auth
- Dashboard file size (757 lines, role views duplicated)
- Missing API routes for ComparableSale, Inspection, Defect, Permit models
- Missing query filters on deal/expense/invoice list endpoints

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `app/(auth)/onboarding/page.tsx` | Rewrite | Single-screen onboarding (company name only) |
| `app/api/deals/route.ts` | Modify | Remove `seed()` import and call from GET handler |
| `app/components/TutorialCard.tsx` | Create | Fixed-position tutorial prompt card with X close |
| `app/components/TutorialProvider.tsx` | Create | React context provider for tutorial state |
| `app/lib/tutorialSteps.ts` | Create | New file — step definitions for guided first deal (tourSteps.ts kept intact) |
| `app/components/layout/AppLayout.tsx` | Modify | Remove SpotlightTour, wrap with TutorialProvider |
| `app/(erp)/dashboard/page.tsx` | Modify | Tutorial steps 1-2 + role-specific welcome + fix field worker checkboxes |
| `app/(erp)/pipeline/[dealId]/page.tsx` | Modify | Tutorial steps 3-7 when tutorial active (reads from TutorialProvider) |
| `app/components/EmptyState.tsx` | Create | Reusable contextual empty state card |
| 7 ERP pages | Modify | Replace generic empty states with EmptyState component |
