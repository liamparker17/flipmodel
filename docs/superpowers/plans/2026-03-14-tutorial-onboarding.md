# Tutorial & Onboarding Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-step onboarding wizard with a single-screen flow, add a guided first deal tutorial, fix demo data persistence, add contextual empty states, and fix field worker dashboard checkboxes.

**Architecture:** The tutorial uses a React context provider (`TutorialProvider`) in `AppLayout` that manages tutorial state across page navigations. The onboarding page is gutted to a single company name input. The `seed()` call is removed from the deals GET route. Empty states use a shared `EmptyState` component.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, NextAuth v5, Prisma 7

**Spec:** `docs/superpowers/specs/2026-03-14-tutorial-onboarding-design.md`

---

## Chunk 1: Remove seed() from GET /api/deals + Strip Onboarding

These two tasks are the highest-impact, lowest-risk changes. They can be done independently and tested immediately.

### Task 1: Remove seed() from GET /api/deals

**Files:**
- Modify: `app/api/deals/route.ts:7,14`

- [ ] **Step 1: Remove the seed import and call**

In `app/api/deals/route.ts`, remove line 7:
```typescript
import { seed } from "../../../prisma/seed";
```

And remove line 14:
```typescript
    seed().catch((e) => console.warn("demo seed failed", e));
```

The rest of the file stays exactly as-is.

- [ ] **Step 2: Verify the app builds**

Run: `npx next build 2>&1 | head -20`
Expected: No import errors for seed

- [ ] **Step 3: Commit**

```bash
git add app/api/deals/route.ts
git commit -m "fix: remove seed() from GET /api/deals — demo data now persists"
```

---

### Task 2: Strip onboarding to single screen

**Files:**
- Rewrite: `app/(auth)/onboarding/page.tsx`

- [ ] **Step 1: Rewrite the onboarding page**

Replace the entire contents of `app/(auth)/onboarding/page.tsx` with:

```typescript
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { theme } from "../../components/theme";
import { api } from "@/lib/client-fetch";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 32, textAlign: "center", color: theme.textDim, fontSize: 13 }}>Loading...</div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const searchParams = useSearchParams();
  const [companyName, setCompanyName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [checkingOrg, setCheckingOrg] = useState(true);

  useEffect(() => {
    fetch("/api/org")
      .then((res) => {
        if (res.ok) {
          window.location.href = "/dashboard";
          return;
        }
        setCheckingOrg(false);
      })
      .catch(() => setCheckingOrg(false));
  }, []);

  const handleSubmit = async (name: string) => {
    setSaving(true);
    setError("");
    try {
      const trimmed = name.trim() || "My Company";
      const slug = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

      try {
        await api("/api/org", {
          method: "POST",
          body: JSON.stringify({ name: trimmed, slug }),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "";
        if (!msg.includes("already belong")) {
          throw new Error(msg || "Failed to create organisation");
        }
      }

      await api("/api/org/migrate", { method: "POST" }).catch(() => {});
      await api("/api/user/profile", {
        method: "PATCH",
        body: JSON.stringify({ onboardingComplete: true }),
      }).catch(() => {});

      window.location.href = "/dashboard";
    } catch (err) {
      setSaving(false);
      setError(err instanceof Error ? err.message : "Setup failed. Please try again.");
    }
  };

  if (checkingOrg) {
    return (
      <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 32, textAlign: "center", color: theme.textDim, fontSize: 13 }}>
        Checking account...
      </div>
    );
  }

  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.cardBorder}`,
      borderRadius: 12,
      padding: 32,
      maxWidth: 400,
      margin: "0 auto",
    }}>
      {/* Logo */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{
          width: 48, height: 48, background: theme.accent, borderRadius: 10,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 18, fontWeight: 700, color: "#fff", marginBottom: 16,
        }}>
          JH
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: theme.text, margin: "0 0 4px" }}>
          Welcome to JustHouses
        </h1>
        <p style={{ fontSize: 13, color: theme.textDim, margin: 0 }}>
          What&apos;s your company called?
        </p>
      </div>

      {/* Company name input */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="text"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="e.g. JustHouses Properties"
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter" && companyName.trim()) handleSubmit(companyName); }}
          style={{
            width: "100%", padding: "12px 14px",
            background: theme.input, border: `1px solid ${theme.inputBorder}`,
            borderRadius: 8, color: theme.text, fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && (
        <div style={{
          background: "#EF444415", border: "1px solid #EF444430",
          borderRadius: 8, padding: "10px 14px", color: "#EF4444",
          fontSize: 13, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {/* Get Started button */}
      <button
        onClick={() => handleSubmit(companyName)}
        disabled={saving || !companyName.trim()}
        style={{
          width: "100%", padding: "12px 20px", borderRadius: 8,
          fontSize: 14, fontWeight: 600, border: "none",
          background: theme.accent, color: "#fff",
          cursor: saving || !companyName.trim() ? "not-allowed" : "pointer",
          opacity: saving || !companyName.trim() ? 0.6 : 1,
          marginBottom: 12,
        }}
      >
        {saving ? "Setting up..." : "Get Started"}
      </button>

      {/* Skip link */}
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => handleSubmit("My Company")}
          disabled={saving}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 12, cursor: "pointer", textDecoration: "underline",
          }}
        >
          Skip — I&apos;ll set this up later
        </button>
      </div>

      {/* Sign out link */}
      <div style={{ textAlign: "center", marginTop: 16 }}>
        <button
          onClick={() => { window.location.href = "/api/auth/signout"; }}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 11, cursor: "pointer", textDecoration: "underline",
          }}
        >
          Sign in as a different user
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: Clean build, no errors

- [ ] **Step 3: Commit**

```bash
git add app/(auth)/onboarding/page.tsx
git commit -m "feat: strip onboarding to single-screen company name input"
```

---

## Chunk 2: Tutorial System (TutorialProvider + TutorialCard + Steps)

### Task 3: Create tutorial step definitions

**Files:**
- Create: `app/lib/tutorialSteps.ts`

- [ ] **Step 1: Create the tutorial steps file**

Create `app/lib/tutorialSteps.ts`:

```typescript
export interface TutorialStepDef {
  id: number;
  page: "dashboard" | "deal-detail";
  title: string;
  description: string;
  actionLabel: string;
  /** If true, step auto-advances when user performs the action (no button click needed) */
  autoAdvance?: boolean;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 1,
    page: "dashboard",
    title: "Welcome to JustHouses!",
    description: "Let's set up your first property in about 2 minutes. Everything you enter is real — you'll keep it.",
    actionLabel: "Start",
  },
  {
    id: 2,
    page: "dashboard",
    title: "Create your first deal",
    description: "Click the '+ New Property' button above to create your first deal.",
    actionLabel: "Waiting...",
    autoAdvance: true,
  },
  {
    id: 3,
    page: "deal-detail",
    title: "Name your property",
    description: "Give this property a name and address so you can identify it in your pipeline.",
    actionLabel: "Next",
  },
  {
    id: 4,
    page: "deal-detail",
    title: "Enter the purchase price",
    description: "What did you pay (or plan to pay) for this property? Open the Analysis tab and enter it in the Acquisition section.",
    actionLabel: "Next",
  },
  {
    id: 5,
    page: "deal-detail",
    title: "Add a room to renovate",
    description: "In the Analysis tab, scroll to Rooms and add your first room — try 'Kitchen' or 'Main Bathroom'.",
    actionLabel: "Next",
  },
  {
    id: 6,
    page: "deal-detail",
    title: "Check your profit projection",
    description: "Your profit is calculated automatically from purchase price, renovation costs, and expected sale price. You can keep adding rooms, expenses, and milestones.",
    actionLabel: "Next",
  },
  {
    id: 7,
    page: "deal-detail",
    title: "You're all set!",
    description: "Here's where to find everything:",
    actionLabel: "Got it",
  },
];

/** Simplified welcome for roles that can't create deals */
export const NON_CREATOR_WELCOME = {
  title: "Welcome to JustHouses!",
  description: "Your workspace is set up. Check 'My Work' for your assigned tasks and milestones.",
  actionLabel: "Got it",
};

export const TUTORIAL_FINAL_TIPS = [
  { label: "Pipeline", description: "All your property deals in one view", href: "/pipeline" },
  { label: "Finance", description: "Expenses, invoices, and budgets", href: "/finance" },
  { label: "Settings", description: "Team, preferences, and integrations", href: "/settings" },
];
```

- [ ] **Step 2: Commit**

```bash
git add app/lib/tutorialSteps.ts
git commit -m "feat: add tutorial step definitions"
```

---

### Task 4: Create TutorialProvider context

**Files:**
- Create: `app/components/TutorialProvider.tsx`

- [ ] **Step 1: Create the TutorialProvider**

Create `app/components/TutorialProvider.tsx`:

```typescript
"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";

interface TutorialContextValue {
  tutorialActive: boolean;
  tutorialStep: number;
  advanceStep: () => void;
  dismissTutorial: () => void;
  /** Error message if deal creation failed during tutorial */
  tutorialError: string;
  setTutorialError: (msg: string) => void;
}

const TutorialContext = createContext<TutorialContextValue>({
  tutorialActive: false,
  tutorialStep: 0,
  advanceStep: () => {},
  dismissTutorial: () => {},
  tutorialError: "",
  setTutorialError: () => {},
});

export function useTutorial() {
  return useContext(TutorialContext);
}

interface TutorialProviderProps {
  children: ReactNode;
  initialStep: number;
  initialActive: boolean;
}

export default function TutorialProvider({ children, initialStep, initialActive }: TutorialProviderProps) {
  const [tutorialActive, setTutorialActive] = useState(initialActive);
  const [tutorialStep, setTutorialStep] = useState(initialStep);
  const [tutorialError, setTutorialError] = useState("");

  const persistStep = useCallback((step: number, completed: boolean) => {
    const prefs: Record<string, unknown> = { tutorialStep: step };
    if (completed) prefs.tutorialCompleted = true;
    fetch("/api/user/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: prefs }),
    }).catch(() => {});
  }, []);

  const advanceStep = useCallback(() => {
    setTutorialStep((prev) => {
      const next = prev + 1;
      if (next > 7) {
        setTutorialActive(false);
        persistStep(next, true);
        return prev;
      }
      persistStep(next, false);
      return next;
    });
    setTutorialError("");
  }, [persistStep]);

  const dismissTutorial = useCallback(() => {
    setTutorialActive(false);
    persistStep(tutorialStep, true);
  }, [tutorialStep, persistStep]);

  return (
    <TutorialContext.Provider value={{
      tutorialActive,
      tutorialStep,
      advanceStep,
      dismissTutorial,
      tutorialError,
      setTutorialError,
    }}>
      {children}
    </TutorialContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/TutorialProvider.tsx
git commit -m "feat: add TutorialProvider context for cross-page tutorial state"
```

---

### Task 5: Create TutorialCard component

**Files:**
- Create: `app/components/TutorialCard.tsx`

- [ ] **Step 1: Create the TutorialCard component**

Create `app/components/TutorialCard.tsx`:

```typescript
"use client";

import { theme } from "./theme";
import { useTutorial } from "./TutorialProvider";
import { TUTORIAL_STEPS, TUTORIAL_FINAL_TIPS, NON_CREATOR_WELCOME } from "../lib/tutorialSteps";
import { useRouter } from "next/navigation";

interface TutorialCardProps {
  /** Which page is rendering this card — filters which steps to show */
  page: "dashboard" | "deal-detail";
}

export default function TutorialCard({ page }: TutorialCardProps) {
  const { tutorialActive, tutorialStep, advanceStep, dismissTutorial, tutorialError } = useTutorial();
  const router = useRouter();

  if (!tutorialActive) return null;

  const stepDef = TUTORIAL_STEPS.find((s) => s.id === tutorialStep);
  if (!stepDef || stepDef.page !== page) return null;

  const isLast = tutorialStep === 7;
  const totalSteps = TUTORIAL_STEPS.length;

  return (
    <div style={{
      position: "fixed",
      bottom: 20,
      right: 20,
      width: 340,
      maxWidth: "calc(100vw - 40px)",
      background: theme.card,
      border: `1px solid ${theme.accent}40`,
      borderRadius: 12,
      padding: "20px 20px 16px",
      zIndex: 8000,
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    }}>
      {/* X close button */}
      <button
        onClick={dismissTutorial}
        aria-label="Close tutorial"
        style={{
          position: "absolute", top: 8, right: 10,
          background: "none", border: "none", color: theme.textDim,
          fontSize: 18, cursor: "pointer", padding: "2px 6px",
          lineHeight: 1,
        }}
      >
        &times;
      </button>

      {/* Step counter */}
      <div style={{ fontSize: 10, color: theme.accent, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5 }}>
        STEP {tutorialStep} OF {totalSteps}
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 600, color: theme.text, marginBottom: 6 }}>
        {stepDef.title}
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: theme.textDim, lineHeight: 1.5, marginBottom: 14 }}>
        {stepDef.description}
      </div>

      {/* Final tips list (step 7 only) */}
      {isLast && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {TUTORIAL_FINAL_TIPS.map((tip) => (
            <div
              key={tip.href}
              onClick={() => { dismissTutorial(); router.push(tip.href); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter") { dismissTutorial(); router.push(tip.href); } }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 10px", background: theme.input,
                borderRadius: 6, cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{tip.label}</div>
                <div style={{ fontSize: 10, color: theme.textDim }}>{tip.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error display */}
      {tutorialError && (
        <div style={{
          background: "#EF444415", border: "1px solid #EF444430",
          borderRadius: 6, padding: "8px 10px", color: "#EF4444",
          fontSize: 11, marginBottom: 10,
        }}>
          {tutorialError}
        </div>
      )}

      {/* Action button — not shown for auto-advance steps */}
      {!stepDef.autoAdvance && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button
            onClick={dismissTutorial}
            style={{
              background: "none", border: "none", color: theme.textDim,
              fontSize: 11, cursor: "pointer", padding: "4px 0",
            }}
          >
            {tutorialStep === 1 ? "Skip, I know what I'm doing" : "Skip tutorial"}
          </button>
          <button
            onClick={isLast ? dismissTutorial : advanceStep}
            style={{
              background: theme.accent, color: "#fff", border: "none",
              borderRadius: 6, padding: "8px 18px", fontSize: 12,
              fontWeight: 600, cursor: "pointer",
            }}
          >
            {stepDef.actionLabel}
          </button>
        </div>
      )}
    </div>
  );
}

/** Simplified welcome card for roles that can't create deals */
export function WelcomeCard({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={{
      ...({} as React.CSSProperties),
      background: theme.card,
      border: `1px solid ${theme.accent}40`,
      borderRadius: 12,
      padding: "24px 20px",
      maxWidth: 480,
      margin: "40px auto 20px",
      textAlign: "center",
    }}>
      <button
        onClick={onDismiss}
        aria-label="Close"
        style={{
          position: "absolute", top: 8, right: 10,
          background: "none", border: "none", color: theme.textDim,
          fontSize: 18, cursor: "pointer", padding: "2px 6px", lineHeight: 1,
        }}
      >
        &times;
      </button>
      <div style={{ fontSize: 18, fontWeight: 600, color: theme.text, marginBottom: 8 }}>
        {NON_CREATOR_WELCOME.title}
      </div>
      <div style={{ fontSize: 13, color: theme.textDim, marginBottom: 16 }}>
        {NON_CREATOR_WELCOME.description}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: theme.accent, color: "#fff", border: "none",
          borderRadius: 6, padding: "8px 20px", fontSize: 13,
          fontWeight: 600, cursor: "pointer",
        }}
      >
        {NON_CREATOR_WELCOME.actionLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/TutorialCard.tsx
git commit -m "feat: add TutorialCard and WelcomeCard components"
```

---

### Task 6: Wire TutorialProvider into AppLayout

**Files:**
- Modify: `app/components/layout/AppLayout.tsx`

- [ ] **Step 1: Replace AppLayout with tutorial-aware version**

In `app/components/layout/AppLayout.tsx`, make these changes:

1. Remove imports for SpotlightTour and tourSteps (lines 6-7):
```typescript
// DELETE these lines:
import SpotlightTour from "../SpotlightTour";
import { getStepsForRole } from "../../lib/tourSteps";
```

2. Add import for TutorialProvider (after other imports):
```typescript
import TutorialProvider from "../TutorialProvider";
```

3. Replace the `showTour` state and related tour logic. Remove `showTour` state (line 20), the `userPrefs` state (line 21), the profile-fetch useEffect (lines 29-42), and the `markComplete` function (lines 44-57). Also remove `tourSteps` (line 64).

4. Replace them with tutorial-aware logic. Add this state and effect instead:

```typescript
  const [tutorialInit, setTutorialInit] = useState<{ active: boolean; step: number } | null>(null);

  useEffect(() => {
    if (!hasOrg) return;
    Promise.all([
      fetch("/api/user/profile").then((r) => r.ok ? r.json() : null),
      fetch("/api/deals?limit=1").then((r) => r.ok ? r.json() : null),
    ]).then(([profileData, dealsData]) => {
      if (!profileData) { setTutorialInit({ active: false, step: 0 }); return; }
      const prefs = (profileData.preferences as Record<string, unknown>) || {};
      const dealCount = dealsData?.pagination?.total ?? dealsData?.data?.length ?? 0;

      if (prefs.tutorialCompleted) {
        setTutorialInit({ active: false, step: 0 });
      } else if (dealCount > 0) {
        // Org has deals but tutorial not marked complete — silently complete it
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: { tutorialCompleted: true } }),
        }).catch(() => {});
        setTutorialInit({ active: false, step: 0 });
      } else {
        setTutorialInit({ active: true, step: (prefs.tutorialStep as number) || 1 });
      }
    }).catch(() => { setTutorialInit({ active: false, step: 0 }); });
  }, [hasOrg]);
```

5. Remove the SpotlightTour JSX (lines 126-132):
```typescript
// DELETE this block:
      {showTour && tourSteps.length > 0 && (
        <SpotlightTour
          steps={tourSteps}
          onComplete={markComplete}
          onSkip={markComplete}
        />
      )}
```

6. Wrap `{children}` with TutorialProvider:
```typescript
      <main id="main-content" style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {tutorialInit ? (
          <TutorialProvider initialActive={tutorialInit.active} initialStep={tutorialInit.step}>
            {children}
          </TutorialProvider>
        ) : (
          children
        )}
      </main>
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | head -20`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add app/components/layout/AppLayout.tsx
git commit -m "feat: replace SpotlightTour with TutorialProvider in AppLayout"
```

---

### Task 7: Add TutorialCard to dashboard page

**Files:**
- Modify: `app/(erp)/dashboard/page.tsx`

- [ ] **Step 1: Add tutorial card import and rendering**

At the top of `app/(erp)/dashboard/page.tsx`, add:
```typescript
import TutorialCard from "../../components/TutorialCard";
import { useTutorial } from "../../components/TutorialProvider";
```

Inside the `DashboardPage` component, after the existing hooks (around line 34), add:
```typescript
  const { tutorialActive, tutorialStep, advanceStep, setTutorialError } = useTutorial();
```

Find the `handleNewDeal` function (around line 113-116) and wrap it to advance the tutorial:
```typescript
  const handleNewDeal = async () => {
    try {
      const deal = await createDeal("New Property");
      if (tutorialActive && tutorialStep === 2) {
        advanceStep();
      }
      router.push(`/pipeline/${deal.id}`);
    } catch (err) {
      if (tutorialActive) {
        setTutorialError("Something went wrong creating the deal. Try again or skip the tutorial.");
      }
    }
  };
```

At the very end of each role's return block (just before the closing `</div>`), add the TutorialCard. For the executive view (the first/default), add just before the final `</div>` of the return:
```typescript
        <TutorialCard page="dashboard" />
```

Do the same for project_manager, finance_manager, and the fallback role views. For site_supervisor, field_worker, and viewer views — they won't see the tutorial (the TutorialCard filters by step.page, and the provider won't be active for non-deal-creating roles anyway), but add the component for consistency.

- [ ] **Step 2: Commit**

```bash
git add "app/(erp)/dashboard/page.tsx"
git commit -m "feat: add TutorialCard to dashboard page with tutorial-aware deal creation"
```

---

### Task 8: Add TutorialCard to deal detail page

**Files:**
- Modify: `app/(erp)/pipeline/[dealId]/page.tsx`

- [ ] **Step 1: Add tutorial card to deal detail page**

At the top of `app/(erp)/pipeline/[dealId]/page.tsx`, add:
```typescript
import TutorialCard from "../../../components/TutorialCard";
```

At the bottom of the component's return JSX (just before the final closing `</div>` of the page), add:
```typescript
        <TutorialCard page="deal-detail" />
```

- [ ] **Step 2: Commit**

```bash
git add "app/(erp)/pipeline/[dealId]/page.tsx"
git commit -m "feat: add TutorialCard to deal detail page for tutorial steps 3-7"
```

---

## Chunk 3: EmptyState Component + Field Worker Fix

### Task 9: Create EmptyState component

**Files:**
- Create: `app/components/EmptyState.tsx`

- [ ] **Step 1: Create the EmptyState component**

Create `app/components/EmptyState.tsx`:

```typescript
"use client";

import { theme, styles } from "./theme";

interface EmptyStateProps {
  heading: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Optional secondary link */
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function EmptyState({ heading, description, actionLabel, onAction, secondaryLabel, onSecondary }: EmptyStateProps) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", textAlign: "center",
      maxWidth: 420, margin: "0 auto",
    }}>
      {/* Icon placeholder */}
      <div style={{
        width: 56, height: 56, borderRadius: 12,
        background: `${theme.accent}15`, border: `1px solid ${theme.accent}25`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 24, marginBottom: 20, color: theme.accent,
      }}>
        +
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 600, color: theme.text, margin: "0 0 8px" }}>
        {heading}
      </h2>
      <p style={{ fontSize: 13, color: theme.textDim, margin: "0 0 20px", lineHeight: 1.5 }}>
        {description}
      </p>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            background: theme.accent, color: "#fff", border: "none",
            borderRadius: 6, padding: "10px 24px", fontSize: 13,
            fontWeight: 600, cursor: "pointer", marginBottom: 8,
          }}
        >
          {actionLabel}
        </button>
      )}

      {secondaryLabel && onSecondary && (
        <button
          onClick={onSecondary}
          style={{
            background: "none", border: "none", color: theme.textDim,
            fontSize: 11, cursor: "pointer", textDecoration: "underline",
          }}
        >
          {secondaryLabel}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add app/components/EmptyState.tsx
git commit -m "feat: add reusable EmptyState component"
```

---

### Task 10: Update pipeline page empty state

**Files:**
- Modify: `app/(erp)/pipeline/page.tsx`

- [ ] **Step 1: Replace the pipeline empty state**

In `app/(erp)/pipeline/page.tsx`, find the empty state (around line 393-397):
```typescript
          {filteredDeals.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
              <p style={{ marginBottom: 12, fontSize: 13 }}>{searchQuery ? "No properties match your search." : "No properties in your pipeline yet."}</p>
              {!searchQuery && canWriteDeals && <button onClick={handleNewDeal} style={{ background: theme.accent, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Add Your First Property</button>}
            </div>
          )}
```

Add the import at the top:
```typescript
import EmptyState from "../../components/EmptyState";
```

Replace the empty state block:
```typescript
          {filteredDeals.length === 0 && (
            searchQuery ? (
              <div style={{ textAlign: "center", padding: 40, color: theme.textDim }}>
                <p style={{ fontSize: 13 }}>No properties match your search.</p>
              </div>
            ) : (
              <EmptyState
                heading="No properties yet"
                description="Your deal pipeline tracks properties from lead to sold. Start by adding your first property."
                actionLabel={canWriteDeals ? "Add Your First Property" : undefined}
                onAction={canWriteDeals ? handleNewDeal : undefined}
              />
            )
          )}
```

- [ ] **Step 2: Commit**

```bash
git add "app/(erp)/pipeline/page.tsx"
git commit -m "feat: use EmptyState component in pipeline page"
```

---

### Task 11: Fix field worker dashboard checkboxes

**Files:**
- Modify: `app/(erp)/dashboard/page.tsx:596-605`

- [ ] **Step 1: Add click handler to field worker task checkboxes**

In `app/(erp)/dashboard/page.tsx`, find the field worker task list (around line 576). Locate the checkbox div inside the task map (around lines 596-605):

```typescript
                {/* Checkbox visual */}
                <div style={{
                  width: isMobile ? 28 : 22,
                  height: isMobile ? 28 : 22,
                  borderRadius: 4,
                  border: `2px solid ${theme.accent}`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }} />
```

Replace it with a functional checkbox that calls `toggleTask`:

```typescript
                {/* Checkbox — completes task on click */}
                <div
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Mark "${task.title}" as complete`}
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTask(task.dealId, task.milestoneName, task.title);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      toggleTask(task.dealId, task.milestoneName, task.title);
                    }
                  }}
                  style={{
                    width: isMobile ? 28 : 22,
                    height: isMobile ? 28 : 22,
                    borderRadius: 4,
                    border: `2px solid ${theme.accent}`,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    transition: "background 0.15s",
                  }}
                />
```

**Important:** The `toggleTask` function is already available from the `useDeals` hook (it's destructured at line 32 but not currently listed — check if `toggleTask` is destructured, and add it if not). Check the hook at `app/hooks/api/useApiDeals.ts` to confirm the function signature. It expects `(dealId, milestoneTitle, taskTitle)`.

- [ ] **Step 2: Verify the toggleTask signature**

Read `app/hooks/api/useApiDeals.ts` and find the `toggleTask` export. Confirm it matches the parameters used above. If it takes different args (e.g., task ID instead of title), adjust the call accordingly.

- [ ] **Step 3: Commit**

```bash
git add "app/(erp)/dashboard/page.tsx"
git commit -m "fix: wire field worker dashboard checkboxes to toggleTask API"
```

---

### Task 12: Add empty states to remaining ERP pages

**Files:**
- Modify: `app/(erp)/contacts/page.tsx`
- Modify: `app/(erp)/tools/page.tsx`
- Modify: `app/(erp)/invoices/page.tsx`
- Modify: `app/(erp)/documents/page.tsx`
- Modify: `app/(erp)/finance/page.tsx`

- [ ] **Step 1: Update each page's empty state**

For each page listed above:

1. Add import: `import EmptyState from "../../components/EmptyState";`
2. Find the existing empty state / "no items" rendering
3. Replace with `<EmptyState>` using the copy from the spec:

**Contacts:**
```typescript
<EmptyState
  heading="No contacts yet"
  description="Keep your agents, attorneys, and contractors in one place."
  actionLabel="Add Contact"
  onAction={() => { /* open create contact flow */ }}
/>
```

**Tools:**
```typescript
<EmptyState
  heading="No tools tracked"
  description="Track equipment checkout, returns, and maintenance across your sites."
  actionLabel="Add Tool"
  onAction={() => { /* open create tool flow */ }}
/>
```

**Invoices:**
```typescript
<EmptyState
  heading="No invoices yet"
  description="Create and send invoices, track payment status."
  actionLabel="New Invoice"
  onAction={() => { /* open create invoice flow */ }}
/>
```

**Documents:**
```typescript
<EmptyState
  heading="No documents yet"
  description="Upload and organise documents per deal — offers, plans, invoices, and more."
  actionLabel="Upload Document"
  onAction={() => { /* open upload flow */ }}
/>
```

**Finance:**
```typescript
<EmptyState
  heading="No financial data yet"
  description="Track expenses and budgets for each property. Expenses are added from a deal's project page."
  actionLabel="View Projects"
  onAction={() => router.push("/projects")}
/>
```

For each page, check what the existing "create" or "add" action is and wire `onAction` to it. If no create action exists on that page, omit `actionLabel` and `onAction`.

- [ ] **Step 2: Commit**

```bash
git add "app/(erp)/contacts/page.tsx" "app/(erp)/tools/page.tsx" "app/(erp)/invoices/page.tsx" "app/(erp)/documents/page.tsx" "app/(erp)/finance/page.tsx"
git commit -m "feat: add contextual empty states to contacts, tools, invoices, documents, finance pages"
```

---

## Chunk 4: Final Verification

### Task 13: Build and smoke test

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

- [ ] **Step 2: Run existing tests**

Run: `npm test`
Expected: All existing tests pass (no regressions)

- [ ] **Step 3: Manual verification checklist**

Start the dev server (`npm run dev`) and verify:

1. **Onboarding:** Go to `/onboarding` — see single-screen with company name input, "Get Started" button, skip link, and sign-out link
2. **Seed persistence:** Log in as demo user, change a deal name, refresh the page — change persists (seed no longer wipes data)
3. **Tutorial trigger:** Create a new account (or clear tutorial prefs) — tutorial card appears on empty dashboard
4. **Tutorial flow:** Click Start → + New Property → fill name → advance through steps → "Got it" dismisses
5. **Tutorial X button:** Click X on any tutorial step — immediately dismisses, no confirmation
6. **Field worker checkbox:** Log in as field worker (field@flipmodel.co.za / demo1234) — task checkboxes are clickable and mark tasks complete
7. **Empty states:** Visit pipeline, contacts, tools, invoices with no data — see EmptyState cards with action buttons
8. **SpotlightTour gone:** Verify no spotlight overlay appears on any page

---

## Execution Order & Dependencies

```
Task 1 (remove seed)       ──┐
Task 2 (strip onboarding)  ──┼── independent, can parallelize
Task 3 (tutorial steps)    ──┤
Task 9 (EmptyState)        ──┘
                              │
Task 4 (TutorialProvider)  ── depends on Task 3
Task 5 (TutorialCard)      ── depends on Tasks 3, 4
Task 6 (AppLayout wiring)  ── depends on Task 4
Task 7 (dashboard tutorial)── depends on Tasks 5, 6
Task 8 (deal detail card)  ── depends on Task 5
Task 10 (pipeline empty)   ── depends on Task 9
Task 11 (checkbox fix)     ── independent
Task 12 (other empties)    ── depends on Task 9
Task 13 (verification)     ── depends on all
```

**Parallelizable groups:**
- Group A: Tasks 1, 2, 3, 9, 11 (all independent)
- Group B: Tasks 4, 5 (depend on 3)
- Group C: Tasks 6, 7, 8, 10, 12 (depend on B)
- Group D: Task 13 (depends on all)
