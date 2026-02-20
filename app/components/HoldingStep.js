"use client";
import { theme, fmt, NumInput, Card, SectionDivider, MetricBox, Tooltip } from "./theme";
import { TOOLTIPS } from "../data/constants";

export default function HoldingStep({ holding, updateHolding, acq, monthlyBondInterest, monthlyHoldingTotal, totalHoldingCost, holdingTimeline, isMobile }) {
  return (
    <div>
      <Card title="Your Holding Period" subtitle="How long do you expect to hold this property during renovation?">
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <label style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, display: "flex", alignItems: "center" }}>
              Renovation Duration<Tooltip text={TOOLTIPS.renovationMonths} />
            </label>
            <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>{holding.renovationMonths} months</span>
          </div>
          <input type="range" min={1} max={18} step={1} value={holding.renovationMonths} onChange={(e) => updateHolding("renovationMonths", Number(e.target.value))} style={{ width: "100%" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
            <span>1 mo</span><span>18 mo</span>
          </div>
        </div>
      </Card>
      <SectionDivider label="Monthly Costs" />
      <Card title="Your Monthly Holding Costs" subtitle="Enter the monthly costs you'll carry while the property is being renovated.">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Rates & Taxes" value={holding.ratesAndTaxes} onChange={(v) => updateHolding("ratesAndTaxes", v)} suffix="/mo" tooltip={TOOLTIPS.ratesAndTaxes} isMobile={isMobile} />
          <NumInput label="Utilities (water & electricity)" value={holding.utilities} onChange={(v) => updateHolding("utilities", v)} suffix="/mo" tooltip={TOOLTIPS.utilities} isMobile={isMobile} />
          <NumInput label="Insurance" value={holding.insurance} onChange={(v) => updateHolding("insurance", v)} suffix="/mo" tooltip={TOOLTIPS.insurance} isMobile={isMobile} />
          <NumInput label="Security" value={holding.security} onChange={(v) => updateHolding("security", v)} suffix="/mo" tooltip={TOOLTIPS.security} isMobile={isMobile} />
          <NumInput label="Levies (if any)" value={holding.levies} onChange={(v) => updateHolding("levies", v)} suffix="/mo" tooltip={TOOLTIPS.levies} isMobile={isMobile} />
        </div>
        <p style={{ fontSize: 11, color: theme.textDim, marginTop: 4 }}>Leave levies at R 0 if not in a complex or estate.</p>
      </Card>
      {!acq.cashPurchase && (
        <>
          <SectionDivider label="Bond Interest" />
          <Card title="Bond Interest">
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: theme.accentDim, borderRadius: 8 }}>
              <span style={{ fontSize: 12, color: theme.accent }}>Monthly bond interest (interest-only during reno):</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(monthlyBondInterest)}</span>
            </div>
          </Card>
        </>
      )}
      <SectionDivider label="Monthly Timeline" />
      <Card title="Month-by-Month Holding Costs" subtitle="See how holding costs accumulate over time. This is why speed matters in flips.">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                {["Month", "Monthly", "Cumulative"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdingTimeline.map((m) => (
                <tr key={m.month} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                  <td style={{ padding: "6px 10px", color: theme.text, fontWeight: 600 }}>Month {m.month}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.orange }}>{fmt(m.total)}</td>
                  <td style={{ padding: "6px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.red, fontWeight: 700 }}>{fmt(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "flex", gap: 2, height: 32, alignItems: "flex-end" }}>
            {holdingTimeline.map((m) => (
              <div key={m.month} style={{
                flex: 1, background: theme.red, opacity: 0.3 + (m.month / holding.renovationMonths) * 0.5,
                height: `${(m.cumulative / totalHoldingCost) * 100}%`, borderRadius: 2, minHeight: 4,
                transition: "height 0.3s ease",
              }} title={`Month ${m.month}: ${fmt(m.cumulative)}`} />
            ))}
          </div>
          <div style={{ fontSize: 10, color: theme.textDim, marginTop: 4, textAlign: "center" }}>
            Cumulative cost grows to {fmt(totalHoldingCost)} over {holding.renovationMonths} months
          </div>
        </div>
      </Card>
      <SectionDivider label="Summary" />
      <Card title="Holding Cost Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <MetricBox label={`Total Holding (${holding.renovationMonths} months)`} value={fmt(totalHoldingCost)} color={theme.accent} isMobile={isMobile} />
      </Card>
    </div>
  );
}
