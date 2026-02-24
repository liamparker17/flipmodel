"use client";
import { theme } from "../../components/theme";

export default function PipelineLoading() {
  const skeletonStyle: React.CSSProperties = {
    background: theme.input,
    borderRadius: 8,
    animation: "pulse 1.5s ease-in-out infinite",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ ...skeletonStyle, height: 40, width: 300, marginBottom: 16 }} />
      <div style={{ display: "flex", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} style={{ ...skeletonStyle, height: 400, width: 220, flexShrink: 0 }} />
        ))}
      </div>
    </div>
  );
}
