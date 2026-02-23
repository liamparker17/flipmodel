"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { theme } from "../theme";
import Sidebar from "./Sidebar";
import SpotlightTour from "../SpotlightTour";
import { getStepsForRole } from "../../lib/tourSteps";
import useDeals from "../../hooks/api/useApiDeals";
import useOrgContext from "../../hooks/useOrgContext";
import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { createDeal } = useDeals();
  const { role } = useOrgContext();
  const [showTour, setShowTour] = useState(false);
  const [userPrefs, setUserPrefs] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const prefs = (data.preferences as Record<string, unknown>) || {};
        setUserPrefs(prefs);
        if (!prefs.tutorialCompleted) {
          setShowTour(true);
        }
      })
      .catch(() => {});
  }, []);

  const markComplete = async () => {
    const updated = { ...userPrefs, tutorialCompleted: true };
    setShowTour(false);
    try {
      await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: updated }),
      });
      setUserPrefs(updated);
    } catch {
      // silent — tour dismissed regardless
    }
  };

  const handleNewDeal = async () => {
    const deal = await createDeal("New Property");
    router.push(`/pipeline/${deal.id}`);
  };

  const tourSteps = role ? getStepsForRole(role) : [];

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: theme.bg, color: theme.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <Sidebar onNewDeal={handleNewDeal} />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {children}
      </main>
      {showTour && tourSteps.length > 0 && (
        <SpotlightTour
          steps={tourSteps}
          onComplete={markComplete}
          onSkip={markComplete}
        />
      )}
    </div>
  );
}
