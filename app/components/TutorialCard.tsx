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
      position: "relative",
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
