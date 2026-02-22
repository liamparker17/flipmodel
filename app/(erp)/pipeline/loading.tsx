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
      <S w="160px" h={32} />
      <div style={{ height: 20 }} />
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <S w="200px" h={36} r={8} />
        <S w="120px" h={36} r={8} />
        <S w="120px" h={36} r={8} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 16 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            style={{
              background: "#12151C",
              border: "1px solid #1C2030",
              borderRadius: 12,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <S w="70%" h={14} />
            {Array.from({ length: 3 }).map((_, j) => (
              <S key={j} h={56} r={8} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
