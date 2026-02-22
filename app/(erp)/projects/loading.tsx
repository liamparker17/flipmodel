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
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
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
            <S w="50%" h={16} />
            <S h={12} />
            <S w="70%" h={12} />
            <div style={{ height: 8 }} />
            <S w="30%" h={28} r={8} />
          </div>
        ))}
      </div>
    </div>
  );
}
