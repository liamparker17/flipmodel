"use client";
import { theme, fmt, pct, Card, SectionDivider, MetricBox, SliderInput, BarChart } from "./theme";

export default function SensitivityStep({
  sensResaleAdj, setSensResaleAdj, sensRenoAdj, setSensRenoAdj, sensHoldAdj, setSensHoldAdj,
  sensCalc, sensitivity, isMobile,
}) {
  return (
    <div>
      <Card title="Interactive Sensitivity" subtitle="Drag the sliders to model different scenarios in real time.">
        <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={setSensResaleAdj} min={-15} max={15} />
        <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={setSensRenoAdj} min={0} max={30} />
        <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={setSensHoldAdj} min={0} max={14} suffix=" mo" />

        <div style={{ background: theme.input, borderRadius: 10, padding: 16, marginTop: 8 }}>
          <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Slider Scenario Result</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <MetricBox label="Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
            <MetricBox label="ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
            <MetricBox label="Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
          </div>
        </div>
      </Card>

      <SectionDivider label="Preset Scenarios" />

      <Card title="Scenario Comparison">
        <BarChart
          data={sensitivity.map((s) => ({ label: s.label, value: s.netProfit }))}
          maxVal={Math.max(...sensitivity.map((s) => Math.abs(s.netProfit)))}
          isMobile={isMobile}
        />
      </Card>
      <Card title="Scenario Detail">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                {["Scenario", "All-In", "Resale", "Net Profit", "ROI"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: "8px 10px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sensitivity.map((s, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${theme.cardBorder}15` }}>
                  <td style={{ padding: "8px 10px", color: theme.text, fontWeight: i === 0 ? 700 : 400 }}>{s.label}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.textDim }}>{fmt(s.allIn)}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: theme.textDim }}>{fmt(s.resalePrice)}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.netProfit >= 0 ? theme.green : theme.red, fontWeight: 700 }}>{fmt(s.netProfit)}</td>
                  <td style={{ padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace", color: s.roi >= 0.15 ? theme.green : s.roi >= 0 ? theme.orange : theme.red }}>{pct(s.roi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
