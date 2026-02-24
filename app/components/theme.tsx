"use client";
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

// ─── Theme Object ───
export const theme = {
  bg: "#0B0E13",
  card: "#12151C",
  cardBorder: "#1C2030",
  accent: "#3B82F6",
  accentDim: "#3B82F615",
  green: "#22C55E",
  red: "#EF4444",
  orange: "#F59E0B",
  text: "#E2E4E9",
  textDim: "#6B7280",
  input: "#161A24",
  inputBorder: "#252B3B",
};

// ─── Reusable Style Patterns ───
export const styles: Record<string, React.CSSProperties> = {
  card: { background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16 },
  cardMb: { background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8, padding: 16, marginBottom: 16 },
  sectionHeading: { fontSize: 11, fontWeight: 600, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, margin: 0 },
  flexBetween: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  flexCenter: { display: "flex", alignItems: "center", justifyContent: "center" },
  mono: { fontFamily: "'JetBrains Mono', monospace" },
  linkBtn: { background: "transparent", border: "none", color: theme.accent, fontSize: 11, cursor: "pointer", padding: 0, fontWeight: 500 },
};

// ─── Helpers ───
export const fmt = (n: number | undefined | null): string => {
  if (n === undefined || n === null || isNaN(n)) return "R 0";
  return "R " + Math.round(n).toLocaleString("en-ZA");
};
export const pct = (n: number): string => (isNaN(n) ? "0%" : (n * 100).toFixed(1) + "%");

export const calcTransferDuty = (price: number): number => {
  if (price <= 1100000) return 0;
  if (price <= 1512500) return (price - 1100000) * 0.03;
  if (price <= 2117500) return 12375 + (price - 1512500) * 0.06;
  if (price <= 2722500) return 48675 + (price - 2117500) * 0.08;
  if (price <= 12100000) return 97075 + (price - 2722500) * 0.11;
  return 1128600 + (price - 12100000) * 0.13;
};

// ─── Mobile Context ───
const MobileContext = createContext<boolean>(false);

interface MobileProviderProps {
  children: React.ReactNode;
}

export const MobileProvider: React.FC<MobileProviderProps> = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return <MobileContext.Provider value={isMobile}>{children}</MobileContext.Provider>;
};
export const useIsMobile = (): boolean => useContext(MobileContext);

// ─── Toast ───
interface ToastProps {
  message: string;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  if (!visible || !message) return null;
  return (
    <div style={{
      position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
      background: theme.green, color: "#fff", padding: "10px 20px",
      borderRadius: 6, fontSize: 13, fontWeight: 600, zIndex: 500,
      animation: "fadeInOut 2.5s ease forwards",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
    }}>
      {message}
    </div>
  );
};

// ─── Accordion ───
interface AccordionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export const Accordion: React.FC<AccordionProps> = ({ title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 8, border: `1px solid ${theme.cardBorder}`, borderRadius: 6, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          background: theme.input, border: "none", padding: "12px 14px",
          color: theme.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
          minHeight: 44,
        }}
      >
        {title}
        <span style={{ color: theme.textDim, fontSize: 14, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0)" }}>&#9662;</span>
      </button>
      {open && <div style={{ padding: 14, background: theme.card }}>{children}</div>}
    </div>
  );
};

// ─── Shared UI Atoms ───
interface TooltipComponentProps {
  text: string;
}

export const Tooltip: React.FC<TooltipComponentProps> = ({ text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", marginLeft: 6, cursor: "help" }}>
      <span
        onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 18, height: 18, borderRadius: "50%",
          background: theme.inputBorder, color: theme.textDim,
          fontSize: 10, fontWeight: 700, lineHeight: 1,
        }}
      >?</span>
      {show && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
          background: "#1C2030", border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
          padding: "8px 12px", fontSize: 12, color: theme.text, lineHeight: 1.5,
          width: 220, zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
        }}>
          {text}
          <div style={{
            position: "absolute", bottom: -5, left: "50%",
            transform: "translateX(-50%) rotate(45deg)",
            width: 10, height: 10, background: "#1C2030",
            borderRight: `1px solid ${theme.inputBorder}`, borderBottom: `1px solid ${theme.inputBorder}`,
          }} />
        </div>
      )}
    </span>
  );
};

interface NumInputProps {
  label?: string;
  value: number | string;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  width?: string;
  small?: boolean;
  tooltip?: string;
  isMobile?: boolean;
}

export const NumInput: React.FC<NumInputProps> = ({ label, value, onChange, prefix = "R", suffix = "", width = "100%", small = false, tooltip, isMobile }) => (
  <div style={{ marginBottom: small ? 6 : 12, width }}>
    {label && (
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
    )}
    <div style={{
      display: "flex", alignItems: "center",
      background: theme.input, border: `1px solid ${theme.inputBorder}`,
      borderRadius: 6, padding: "8px 10px", minHeight: 40,
      transition: "border-color 0.15s",
    }}>
      {prefix && <span style={{ color: theme.textDim, fontSize: 13, marginRight: 4 }}>{prefix}</span>}
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: "transparent", border: "none", color: theme.text,
          fontSize: 14, width: "100%", outline: "none",
          fontFamily: "'JetBrains Mono', monospace",
        }}
      />
      {suffix && <span style={{ color: theme.textDim, fontSize: 11, marginLeft: 4, whiteSpace: "nowrap" }}>{suffix}</span>}
    </div>
  </div>
);

interface ToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  tooltip?: string;
}

export const Toggle: React.FC<ToggleProps> = ({ label, value, onChange, tooltip }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, minHeight: 40 }}>
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12,
      background: value ? theme.accent : theme.inputBorder,
      cursor: "pointer", position: "relative", transition: "all 0.2s", flexShrink: 0,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 9, background: "#fff",
        position: "absolute", top: 3, left: value ? 23 : 3, transition: "all 0.2s",
      }} />
    </div>
    <span style={{ fontSize: 13, color: theme.text }}>{label}</span>
    {tooltip && <Tooltip text={tooltip} />}
  </div>
);

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  tooltip?: string;
}

export const Select: React.FC<SelectProps> = ({ label, value, onChange, options, tooltip }) => (
  <div style={{ marginBottom: 12 }}>
    {label && (
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
    )}
    <select value={value} onChange={(e) => onChange(e.target.value)} style={{
      background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
      padding: "8px 10px", color: theme.text, fontSize: 14, width: "100%", outline: "none",
      minHeight: 40,
    }}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  style?: React.CSSProperties;
}

export const Card: React.FC<CardProps> = ({ children, title, subtitle, style: s = {} }) => (
  <div style={{
    background: theme.card, border: `1px solid ${theme.cardBorder}`,
    borderRadius: 8, padding: 16, marginBottom: 12, ...s,
  }}>
    {title && <h3 style={{ margin: subtitle ? "0 0 2px" : "0 0 12px", fontSize: 13, color: theme.textDim, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</h3>}
    {subtitle && <p style={{ margin: "0 0 12px", fontSize: 12, color: theme.textDim, lineHeight: 1.5 }}>{subtitle}</p>}
    {children}
  </div>
);

interface MetricBoxProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isMobile?: boolean;
}

export const MetricBox: React.FC<MetricBoxProps> = ({ label, value, sub, color = theme.text, isMobile }) => (
  <div style={{
    background: theme.input, borderRadius: 6,
    padding: "10px 12px", minWidth: 110, flex: 1,
    border: `1px solid ${theme.inputBorder}`,
  }}>
    <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{label}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: theme.textDim, marginTop: 2 }}>{sub}</div>}
  </div>
);

interface BarChartDataItem {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDataItem[];
  maxVal?: number;
  isMobile?: boolean;
}

export const BarChart: React.FC<BarChartProps> = ({ data, maxVal, isMobile }) => {
  const max = maxVal || Math.max(...data.map((d) => Math.abs(d.value)));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
          <div style={{ width: isMobile ? "100%" : 160, fontSize: 12, color: theme.textDim, textAlign: isMobile ? "left" : "right", flexShrink: 0 }}>{d.label}</div>
          <div style={{ flex: 1, height: 20, background: theme.input, borderRadius: 3, overflow: "hidden", position: "relative", minWidth: 80 }}>
            <div style={{
              height: "100%", width: `${Math.abs(d.value / max) * 100}%`,
              background: d.value >= 0 ? theme.green : theme.red,
              borderRadius: 3, opacity: 0.8, transition: "width 0.4s ease",
            }} />
          </div>
          <div style={{ width: 100, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color: d.value >= 0 ? theme.green : theme.red, textAlign: "right" }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  );
};

interface SectionDividerProps {
  label: string;
}

export const SectionDivider: React.FC<SectionDividerProps> = ({ label }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0 12px" }}>
    <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
    <span style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{label}</span>
    <div style={{ height: 1, flex: 1, background: theme.cardBorder }} />
  </div>
);

interface CTAButtonProps {
  label: string;
  onClick: () => void;
  primary?: boolean;
  style?: React.CSSProperties;
  isMobile?: boolean;
}

export const CTAButton: React.FC<CTAButtonProps> = ({ label, onClick, primary = true, style: s = {}, isMobile }) => (
  <button onClick={onClick} style={{
    background: primary ? theme.accent : "transparent", color: primary ? "#fff" : theme.text,
    border: primary ? "none" : `1px solid ${theme.cardBorder}`, borderRadius: 6,
    padding: "10px 20px", fontSize: 13,
    fontWeight: 600, cursor: "pointer", letterSpacing: 0.3, transition: "all 0.15s",
    minHeight: 40, ...s,
  }}>{label}</button>
);

interface SliderInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  tooltip?: string;
}

export const SliderInput: React.FC<SliderInputProps> = ({ label, value, onChange, min, max, step = 1, suffix = "%", tooltip }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
      <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.8, fontWeight: 500 }}>
        {label}{tooltip && <Tooltip text={tooltip} />}
      </label>
      <span style={{
        fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
        color: value === 0 ? theme.textDim : value > 0 ? (suffix === "%" && label.toLowerCase().includes("resale") ? theme.green : theme.orange) : theme.green,
      }}>
        {value > 0 ? "+" : ""}{value}{suffix}
      </span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: "100%" }} />
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 2 }}>
      <span>{min}{suffix}</span><span>{max}{suffix}</span>
    </div>
  </div>
);
