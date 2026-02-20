"use client";
import { createContext, useContext, useState } from "react";

// ─── Theme Object ───
export const theme = {
  bg: "#0C0F14", card: "#151921", cardBorder: "#1E2430",
  accent: "#D4A853", accentDim: "#D4A85330",
  green: "#34D399", red: "#F87171", orange: "#FB923C",
  text: "#E8E6E1", textDim: "#8B8D93",
  input: "#1A1F2A", inputBorder: "#2A3040",
};

// ─── Helpers ───
export const fmt = (n) => {
  if (n === undefined || n === null || isNaN(n)) return "R 0";
  return "R " + Math.round(n).toLocaleString("en-ZA");
};
export const pct = (n) => (isNaN(n) ? "0%" : (n * 100).toFixed(1) + "%");

export const calcTransferDuty = (price) => {
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48675 + (price - 2117500) * 0.08;
  if (price <= 12100000) return 97075 + (price - 2722500) * 0.11;
  return 1128600 + (price - 12100000) * 0.13;
};

// ─── Mobile Context ───
const MobileContext = createContext(false);
export const MobileProvider = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  if (typeof window !== "undefined") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useState(() => {
      const check = () => setIsMobile(window.innerWidth < 640);
      check();
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    });
  }
  return <MobileContext.Provider value={isMobile}>{children}</MobileContext.Provider>;
};
export const useIsMobile = () => useContext(MobileContext);

// ─── Shared UI Atoms ───
export const Tooltip = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "help" }}>
      <span
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onClick={() => setShow(!show)}
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 16, borderRadius: "50%", background: theme.inputBorder, color: theme.textDim, fontSize: 10, fontWeight: 700, lineHeight: 1 }}
      >?</span>
      {show && (
        <div style={{ position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)", background: "#1E2430", border: `1px solid ${theme.accent}40`, borderRadius: 8, padding: "10px 14px", fontSize: 12, color: theme.text, lineHeight: 1.5, width: 240, zIndex: 100, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", pointerEvents: "none" }}>
          {text}
          <div style={{ position: "absolute", bottom: -5, left: "50%", transform: "translateX(-50%) rotate(45deg)", width: 10, height: 10, background: "#1E2430", borderRight: `1px solid ${theme.accent}40`, borderBottom: `1px solid ${theme.accent}40` }} />
        </div>
      )}
    </span>
  );
};

export const NumInput = ({ label, value, onChange, prefix = "R", suffix = "", width = "100%", small = false, tooltip, isMobile }) => (
  <div style={{ marginBottom: small ? 6 : 14, width }}>
    {label && (
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
    )}
    <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "8px 10px" }}>
      {prefix && <span style={{ color: theme.textDim, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ background: "transparent", border: "none", color: theme.text, fontSize: isMobile ? 16 : (small ? 13 : 14), width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
      {suffix && <span style={{ color: theme.textDim, fontSize: 12, marginLeft: 4 }}>{suffix}</span>}
    </div>
  </div>
);

export const Toggle = ({ label, value, onChange, tooltip }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
    <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? theme.accent : theme.inputBorder, cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0 }}>
      <div style={{ width: 18, height: 18, borderRadius: 9, background: "#fff", position: "absolute", top: 3, left: value ? 23 : 3, transition: "all 0.2s" }} />
    </div>
    <span style={{ fontSize: 13, color: theme.text }}>{label}</span>
    {tooltip && <Tooltip text={tooltip} />}
  </div>
);

export const Select = ({ label, value, onChange, options, tooltip }) => (
  <div style={{ marginBottom: 14 }}>
    {label && (
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 5, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
    )}
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: "8px 10px", color: theme.text, fontSize: 14, width: "100%", outline: "none" }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

export const Card = ({ children, title, subtitle, style: s = {} }) => (
  <div style={{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 12, padding: 24, marginBottom: 20, ...s }}>
    {title && <h3 style={{ margin: subtitle ? "0 0 4px" : "0 0 18px", fontSize: 15, color: theme.accent, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1.5 }}>{title}</h3>}
    {subtitle && <p style={{ margin: "0 0 18px", fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>{subtitle}</p>}
    {children}
  </div>
);

export const MetricBox = ({ label, value, sub, color = theme.text, isMobile }) => (
  <div style={{ background: theme.input, borderRadius: 10, padding: isMobile ? "10px 12px" : "14px 16px", minWidth: isMobile ? 120 : 140, flex: 1 }}>
    <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: isMobile ? 17 : 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
  </div>
);

export const BarChart = ({ data, maxVal, isMobile }) => {
  const max = maxVal || Math.max(...data.map((d) => Math.abs(d.value)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div style={{ width: isMobile ? "100%" : 180, fontSize: 12, color: theme.textDim, textAlign: isMobile ? "left" : "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 22, background: theme.input, borderRadius: 4, overflow: "hidden", position: "relative", minWidth: 80 }}>
            <div style={{ height: "100%", width: `${Math.abs(d.value / max) * 100}%`, background: d.value >= 0 ? theme.green : theme.red, borderRadius: 4, opacity: 0.7, transition: "width 0.4s ease" }} />
          </div>
          <div style={{ width: 110, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: d.value >= 0 ? theme.green : theme.red, textAlign: "right" }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  );
};

export const SectionDivider = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0 16px" }}>
    <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
    <span style={{ fontSize: 11, color: theme.accent, textTransform: "uppercase", letterSpacing: 2, fontWeight: 600 }}>{label}</span>
    <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
  </div>
);

export const CTAButton = ({ label, onClick, primary = true, style: s = {}, isMobile }) => (
  <button onClick={onClick} style={{
    background: primary ? theme.accent : "transparent", color: primary ? "#000" : theme.text,
    border: primary ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 10,
    padding: isMobile ? "14px 28px" : "12px 32px", fontSize: isMobile ? 15 : 14,
    fontWeight: 700, cursor: "pointer", letterSpacing: 0.5, transition: "all 0.2s", ...s,
  }}>{label}</button>
);

export const SliderInput = ({ label, value, onChange, min, max, step = 1, suffix = "%", tooltip }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
      <span style={{ fontSize: 14, fontWeight: 700, color: value === 0 ? theme.textDim : value > 0 ? (suffix === "%" && label.toLowerCase().includes("resale") ? theme.green : theme.orange) : theme.green, fontFamily: "'JetBrains Mono', monospace" }}>
        {value > 0 ? "+" : ""}{value}{suffix}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
      <span>{min}{suffix}</span><span>{max}{suffix}</span>
    </div>
  </div>
);
