"use client";
import { theme, fmt, pct, MetricBox, SliderInput, Card } from "../theme";

interface SensCalcResult {
  allIn: number;
  resalePrice: number;
  netProfit: number;
  roi: number;
  annRoi: number;
  holdMonths: number;
}

interface ROIResultsProps {
  sensResaleAdj: number;
  onSensResaleAdj: (v: number) => void;
  sensRenoAdj: number;
  onSensRenoAdj: (v: number) => void;
  sensHoldAdj: number;
  onSensHoldAdj: (v: number) => void;
  sensCalc: SensCalcResult;
  isMobile: boolean;
}

export default function ROIResults({
  sensResaleAdj, onSensResaleAdj,
  sensRenoAdj, onSensRenoAdj,
  sensHoldAdj, onSensHoldAdj,
  sensCalc, isMobile,
}: ROIResultsProps) {
  const isBase = sensResaleAdj === 0 && sensRenoAdj === 0 && sensHoldAdj === 0;

  return (
    <Card title="Sensitivity Sliders" subtitle="Drag to see how changes affect your profit and ROI in real time.">
      <SliderInput label="Resale Price Adjustment" value={sensResaleAdj} onChange={onSensResaleAdj} min={-15} max={15} />
      <SliderInput label="Renovation Overrun" value={sensRenoAdj} onChange={onSensRenoAdj} min={0} max={30} />
      <SliderInput label="Extra Holding Time" value={sensHoldAdj} onChange={onSensHoldAdj} min={0} max={14} suffix=" mo" />
      <div style={{ background: theme.input, borderRadius: 10, padding: 14, marginTop: 8 }}>
        <div style={{ fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>
          {isBase ? "Base Scenario" : "Adjusted Scenario"}
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <MetricBox label="Adj. Net Profit" value={fmt(sensCalc.netProfit)} color={sensCalc.netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
          <MetricBox label="Adj. ROI" value={pct(sensCalc.roi)} color={sensCalc.roi >= 0.15 ? theme.green : sensCalc.roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Adj. Ann. ROI" value={pct(sensCalc.annRoi)} color={sensCalc.annRoi >= 0.3 ? theme.green : sensCalc.annRoi >= 0.15 ? theme.orange : theme.red} sub={`${sensCalc.holdMonths} mo hold`} isMobile={isMobile} />
        </div>
      </div>
    </Card>
  );
}
