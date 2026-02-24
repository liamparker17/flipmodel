"use client";
import { theme } from "../../components/theme";

export default function DashboardLoading() {
  const skeletonStyle: React.CSSProperties = {
    background: theme.input,
    borderRadius: 8,
    animation: "pulse 1.5s ease-in-out infinite",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} style={{ ...skeletonStyle, height: 80 }} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ ...skeletonStyle, height: 240 }} />
        <div style={{ ...skeletonStyle, height: 240 }} />
      </div>
    </div>
  );
}
