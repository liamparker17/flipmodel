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
      <S w="220px" h={32} />
      <div style={{ height: 28 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))",
          gap: 20,
        }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
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
            <S w="60%" h={14} />
            <S h={10} />
            <S w="40%" h={10} />
          </div>
        ))}
      </div>
    </div>
  );
}
