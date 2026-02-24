"use client";
import { theme } from "../../components/theme";

export default function SettingsLoading() {
  const skeletonStyle: React.CSSProperties = {
    background: theme.input,
    borderRadius: 8,
    animation: "pulse 1.5s ease-in-out infinite",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ ...skeletonStyle, height: 40, width: 180, marginBottom: 24 }} />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ ...skeletonStyle, height: 40, width: 160, flexShrink: 0 }} />
          <div style={{ ...skeletonStyle, height: 40, flex: 1 }} />
        </div>
      ))}
    </div>
  );
}
