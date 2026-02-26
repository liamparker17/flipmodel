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
  const { role, hasOrg, loading: orgLoading } = useOrgContext();
  const [showTour, setShowTour] = useState(false);
  const [userPrefs, setUserPrefs] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!orgLoading && !hasOrg) {
      window.location.href = "/onboarding";
    }
  }, [orgLoading, hasOrg]);

  useEffect(() => {
    if (!hasOrg) return;
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
  }, [hasOrg]);

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

  if (orgLoading) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: "100vh", background: theme.bg, color: theme.textDim,
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}>
        Loading...
      </div>
    );
  }

  if (!hasOrg) return null;

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: theme.bg, color: theme.text,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    }}>
      <a
        href="#main-content"
        style={{
          position: "absolute",
          left: "-9999px",
          top: "auto",
          width: "1px",
          height: "1px",
          overflow: "hidden",
          zIndex: 9999,
        }}
        onFocus={(e) => {
          e.currentTarget.style.left = "16px";
          e.currentTarget.style.top = "16px";
          e.currentTarget.style.width = "auto";
          e.currentTarget.style.height = "auto";
          e.currentTarget.style.overflow = "visible";
          e.currentTarget.style.background = theme.accent;
          e.currentTarget.style.color = "#fff";
          e.currentTarget.style.padding = "8px 16px";
          e.currentTarget.style.borderRadius = "6px";
          e.currentTarget.style.fontSize = "14px";
          e.currentTarget.style.fontWeight = "600";
          e.currentTarget.style.textDecoration = "none";
        }}
        onBlur={(e) => {
          e.currentTarget.style.left = "-9999px";
          e.currentTarget.style.width = "1px";
          e.currentTarget.style.height = "1px";
          e.currentTarget.style.overflow = "hidden";
        }}
      >
        Skip to content
      </a>
      <nav aria-label="Main navigation">
        <Sidebar onNewDeal={handleNewDeal} />
      </nav>
      <main id="main-content" style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
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
