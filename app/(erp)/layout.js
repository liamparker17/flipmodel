"use client";
import { useRouter } from "next/navigation";
import { theme } from "../components/theme";
import Sidebar from "../components/Sidebar";
import useDeals from "../hooks/useDeals";

export default function ErpLayout({ children }) {
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
