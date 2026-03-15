# FlipModel Session Log

## Session — 2026-03-15

**Objective:** Evaluate FlipModel, fix identified issues, overhaul tutorial/onboarding, fix permission gaps, and merge Claude Corner Brain with superpowers into a unified skill system.

**Changes Made:**
- `app/api/deals/route.ts`: Removed seed() call from GET handler — demo data now persists across page loads
- `app/(auth)/onboarding/page.tsx`: Stripped 6-step wizard to single-screen company name input
- `app/components/TutorialProvider.tsx`: Created React context for cross-page tutorial state
- `app/components/TutorialCard.tsx`: Created fixed-position tutorial card with X close button
- `app/lib/tutorialSteps.ts`: Created 7-step guided first deal tutorial definitions
- `app/components/EmptyState.tsx`: Created reusable contextual empty state component
- `app/components/layout/AppLayout.tsx`: Replaced SpotlightTour with TutorialProvider, added tutorial init logic with useRef guard
- `app/(erp)/dashboard/page.tsx`: Added TutorialCard, tutorial-aware handleNewDeal, fixed field worker fake checkboxes
- `app/(erp)/pipeline/[dealId]/page.tsx`: Added TutorialCard, fixed async updateDeal handlers (name/address save bug), restricted name editing to executive role
- `app/(erp)/pipeline/page.tsx`: Added EmptyState to pipeline
- `app/(erp)/contacts/page.tsx`: Added EmptyState
- `app/(erp)/tools/page.tsx`: Added EmptyState
- `app/(erp)/invoices/page.tsx`: Added EmptyState
- `app/(erp)/documents/page.tsx`: Added EmptyState
- `app/(erp)/finance/page.tsx`: Added EmptyState
- `app/components/layout/Sidebar.tsx`: Added sign-out button to footer with signOut from next-auth/react
- `app/data/roomTemplates.ts`: Painting autoQty changed from "sqm" to "wallArea", merged skirting + cornices
- `app/data/costDefaults.ts`: Merged skirting + cornices into single item
- `app/utils/materialEstimator.ts`: Paint area calculation uses wallArea only
- `app/types/deal.ts`: Added propAfter field for post-renovation property state
- `app/components/PropertyStep.tsx`: Shows current vs planned property details
- `app/hooks/useCalculator.ts`: Added updatePropAfter support
- `app/components/deals/DealAnalysis.tsx`: Wired propAfter to PropertyStep
- `prisma/seed.ts`: Fixed painting quantities across all deals to use wall area
- `app/(erp)/assignments/page.tsx`: Added permission checks for task toggling
- `app/(erp)/suppliers/page.tsx`: Added permission checks for bulk actions and add item
- `app/(erp)/projects/[projectId]/page.tsx`: Added permission checks for milestones, tasks, expenses, payment sign-off

**Technical Decisions:**
- Tutorial uses React context (TutorialProvider) in AppLayout for cross-page state instead of URL params or re-fetching
- Tutorial init only runs once (useRef guard) to prevent re-evaluation killing active tutorials
- persistStep uses api() helper with CSRF instead of raw fetch
- Deal name editing restricted to executive role only (not deals:write permission) per user request
- Merged Claude Corner Brain into 7 superpowers-compatible personal skills instead of maintaining two parallel systems
- Chose 7 consolidated skills over 18 niche skills to reduce routing noise and token overhead

**Known Issues:**
- Tutorial not yet tested end-to-end in production (deployed but needs manual verification)
- The hook-based Python router (Option C) was designed but not built — currently routing is still skill-description-based
- Personal skills won't appear in Skill tool until next session restart
- Skills are not pressure-tested against agent rationalizations (writing-skills TDD methodology not applied)

**Next Steps:**
- Verify tutorial flow end-to-end on deployed Vercel instance
- Consider building the Python router hook if skill-description matching proves unreliable
- Pressure-test the critique-loop and security-review skills with adversarial scenarios
- Monitor whether the 7-skill system actually gets invoked consistently across sessions
