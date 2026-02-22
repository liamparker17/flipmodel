const shimmer = `@keyframes pulse{0%,100%{opacity:.3}50%{opacity:.7}}`;
const S = ({ w = "100%", h = 16, r = 6 }: { w?: string | number; h?: number; r?: number }) => (
  <div
    style={{
      width: w,
      height: h,
      borderRadius: r,
      background: "#1C2030",
      animation: "pulse 1.8s ease-in-out infinite",
    }}
  />
);

export default function Loading() {
  return (
    <div style={{ padding: 28, background: "#0B0E13", minHeight: "100vh" }}>
      <style>{shimmer}</style>
      <S w="140px" h={32} />
      <div style={{ height: 20 }} />
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <S key={i} w="90px" h={34} r={8} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#12151C",
              border: "1px solid #1C2030",
              borderRadius: 12,
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <S w="60%" h={12} />
            <S w="50%" h={24} r={8} />
          </div>
        ))}
      </div>
      <div
        style={{
          background: "#12151C",
          border: "1px solid #1C2030",
          borderRadius: 12,
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <S w="30%" h={14} />
        {Array.from({ length: 6 }).map((_, i) => (
          <S key={i} h={18} />
        ))}
      </div>
    </div>
  );
}
