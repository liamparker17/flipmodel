"use client";
import { theme } from "../../components/theme";

export default function ContactsLoading() {
  const skeletonStyle: React.CSSProperties = {
    background: theme.input,
    borderRadius: 8,
    animation: "pulse 1.5s ease-in-out infinite",
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ ...skeletonStyle, height: 40, width: 200, marginBottom: 16 }} />
      <div style={{ ...skeletonStyle, height: 36, marginBottom: 12 }} />
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} style={{ ...skeletonStyle, height: 48, marginBottom: 4 }} />
      ))}
    </div>
  );
}
