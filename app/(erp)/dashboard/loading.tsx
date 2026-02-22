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
const Card = ({ children, h }: { children?: React.ReactNode; h?: number }) => (
  <div
    style={{
      background: "#12151C",
      border: "1px solid #1C2030",
      borderRadius: 12,
      padding: 24,
      height: h,
      display: "flex",
      flexDirection: "column",
      gap: 12,
    }}
  >
    {children}
  </div>
);

export default function Loading() {
  return (
    <div style={{ padding: 28, background: "#0B0E13", minHeight: "100vh" }}>
      <style>{shimmer}</style>
      <S w="180px" h={32} />
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <S w="50%" h={12} />
            <S w="70%" h={28} r={8} />
          </Card>
        ))}
      </div>
      <div style={{ height: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        {[0, 1].map((i) => (
          <Card key={i} h={260}>
            <S w="40%" h={14} />
            <S h={180} r={8} />
          </Card>
        ))}
      </div>
    </div>
  );
}
