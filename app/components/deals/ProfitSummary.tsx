"use client";
import { theme, fmt, pct, MetricBox } from "../theme";
interface DealScoreInput {
  level: string;
  label: string;
  color: string;
  bg: string;
  desc: string;
}

interface ProfitSummaryProps {
  dealScore: DealScoreInput;
  allInCost: number;
  netProfit: number;
  roi: number;
  annualizedRoi: number;
  cashInvested: number;
  returnOnCash: number;
  renovationMonths: number;
  isMobile: boolean;
}

export default function ProfitSummary({
  dealScore, allInCost, netProfit, roi, annualizedRoi,
  cashInvested, returnOnCash, renovationMonths, isMobile,
}: ProfitSummaryProps) {
  return (
    <div>
      {/* Deal Score Badge */}
      <div style={{
        background: dealScore.bg, border: `1px solid ${dealScore.color}30`,
        borderRadius: 8, padding: isMobile ? 16 : 20, textAlign: "center", marginBottom: 12,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%",
          background: dealScore.color, display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 8px", fontSize: 22, fontWeight: 700, color: "#000",
        }}>
          {dealScore.level === "strong" ? "A" : dealScore.level === "marginal" ? "B" : "C"}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: dealScore.color, marginBottom: 2 }}>
          {dealScore.label}
        </div>
        <div style={{ fontSize: 11, color: theme.textDim }}>{dealScore.desc}</div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        background: `${theme.accent}08`, border: `1px solid ${theme.accent}20`,
        borderRadius: 8, padding: 14,
      }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <MetricBox label="All-In Cost" value={fmt(allInCost)} isMobile={isMobile} />
          <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${renovationMonths} months`} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <MetricBox label="Cash Required" value={fmt(cashInvested)} sub="Total cash outlay" isMobile={isMobile} />
          <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
        </div>
      </div>
    </div>
  );
}
