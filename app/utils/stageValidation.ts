// ─── Stage Transition Validation ───
// Extracted from app/api/deals/[dealId]/route.ts for testability

export const STAGE_ORDER = ["lead", "analysing", "offer_made", "purchased", "renovating", "listed", "sold"] as const;

export type StageName = typeof STAGE_ORDER[number];

export function validateStageTransition(currentStage: string, newStage: string): string | null {
  const currentIndex = STAGE_ORDER.indexOf(currentStage as StageName);
  const newIndex = STAGE_ORDER.indexOf(newStage as StageName);

  if (currentIndex === -1 || newIndex === -1) {
    return `Invalid stage: "${newIndex === -1 ? newStage : currentStage}"`;
  }

  if (currentStage === "sold") {
    return "A sold deal cannot be moved to any other stage";
  }

  if (newIndex === currentIndex) {
    return null; // same stage, no transition
  }

  // Allow moving forward any number of stages, or backward by exactly one
  if (newIndex > currentIndex) {
    return null; // forward is always allowed
  }

  if (currentIndex - newIndex === 1) {
    return null; // backward by one is allowed
  }

  return `Cannot move from "${currentStage}" to "${newStage}". Deals can only move forward or backward by one stage`;
}
