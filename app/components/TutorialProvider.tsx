"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { api } from "@/lib/client-fetch";

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
    api("/api/user/profile", {
      method: "PATCH",
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
