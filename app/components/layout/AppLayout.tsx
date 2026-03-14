"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { theme } from "../theme";
import Sidebar from "./Sidebar";
import TutorialProvider from "../TutorialProvider";
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
  const [tutorialInit, setTutorialInit] = useState<{ active: boolean; step: number } | null>(null);
  const tutorialChecked = useRef(false);

  useEffect(() => {
    if (!orgLoading && !hasOrg) {
      window.location.href = "/onboarding";
    }
  }, [orgLoading, hasOrg]);

  useEffect(() => {
    if (!hasOrg || tutorialChecked.current) return;
    tutorialChecked.current = true;
    Promise.all([
      fetch("/api/user/profile").then((r) => r.ok ? r.json() : null),
      fetch("/api/deals?limit=1").then((r) => r.ok ? r.json() : null),
    ]).then(([profileData, dealsData]) => {
      if (!profileData) { setTutorialInit({ active: false, step: 0 }); return; }
      const prefs = (profileData.preferences as Record<string, unknown>) || {};
      const dealCount = dealsData?.pagination?.total ?? dealsData?.data?.length ?? 0;
      const savedStep = (prefs.tutorialStep as number) || 0;

      if (prefs.tutorialCompleted) {
        // Tutorial already finished
        setTutorialInit({ active: false, step: 0 });
      } else if (savedStep >= 2) {
        // Tutorial is in progress (user already started) — resume regardless of deal count
        setTutorialInit({ active: true, step: savedStep });
      } else if (dealCount > 0) {
        // Org has deals but tutorial never started — silently complete it
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: { tutorialCompleted: true } }),
        }).catch(() => {});
        setTutorialInit({ active: false, step: 0 });
      } else {
        // No deals, tutorial not started — launch it
        setTutorialInit({ active: true, step: 1 });
      }
    }).catch(() => { setTutorialInit({ active: false, step: 0 }); });
  }, [hasOrg]);

  const handleNewDeal = async () => {
    const deal = await createDeal("New Property");
    router.push(`/pipeline/${deal.id}`);
  };

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
        {tutorialInit ? (
          <TutorialProvider initialActive={tutorialInit.active} initialStep={tutorialInit.step}>
            {children}
          </TutorialProvider>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
