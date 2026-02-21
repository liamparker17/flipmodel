"use client";
import { useRouter } from "next/navigation";
import { theme } from "../theme";
import Sidebar from "./Sidebar";
import useDeals from "../../hooks/useDeals";
import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const { createDeal } = useDeals();

  const handleNewDeal = () => {
    const deal = createDeal("New Deal");
    router.push(`/pipeline/${deal.id}`);
  };

  return (
    <div style={{
      display: "flex", minHeight: "100vh",
      background: theme.bg, color: theme.text,
      fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    }}>
      <Sidebar onNewDeal={handleNewDeal} />
      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
