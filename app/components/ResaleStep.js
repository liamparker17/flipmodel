"use client";
import { theme, fmt, pct, NumInput, Card, SectionDivider, MetricBox, Tooltip } from "./theme";
import { TOOLTIPS } from "../data/constants";

export default function ResaleStep({
  resale, updateResale, prop, allInCost, agentComm, grossProfit, netProfit, profitPerSqm,
  roi, annualizedRoi, returnOnCash, cashInvested, breakEvenResale, dealScore,
  totalAcquisition, totalRenovation, totalHoldingCost, holding, transferDuty,
  isMobile,
}) {
  const DealScoreBadge = () => (
    <div style={{
      background: dealScore.bg, border: `1px solid ${dealScore.color}40`,
      borderRadius: 12, padding: isMobile ? 20 : 28, textAlign: "center",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "50%",
        background: dealScore.color, display: "flex", alignItems: "center", justifyContent: "center",
        margin: "0 auto 12px", fontSize: 28,
      }}>
        {dealScore.level === "strong" ? "+" : dealScore.level === "marginal" ? "~" : "-"}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: dealScore.color, marginBottom: 4 }}>
        {dealScore.label}
      </div>
      <div style={{ fontSize: 12, color: theme.textDim }}>{dealScore.desc}</div>
    </div>
  );

  const CashAnalysis = () => (
    <Card title="Cash Required vs Profit" subtitle="How much cash goes in, maximum exposure, and what comes back.">
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <MetricBox label="Total Cash In" value={fmt(cashInvested)} sub="Your total cash outlay" isMobile={isMobile} />
        <MetricBox label="Max Exposure" value={fmt(allInCost)} sub="Total capital at risk" isMobile={isMobile} />
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} sub="After agent commission" isMobile={isMobile} />
        <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : returnOnCash >= 0 ? theme.orange : theme.red} sub="Profit / cash invested" isMobile={isMobile} />
      </div>
      <div style={{ marginTop: 16, padding: "12px 0" }}>
        <div style={{ display: "flex", height: 28, borderRadius: 6, overflow: "hidden", background: theme.input }}>
          {allInCost > 0 && (
            <>
              <div style={{ width: `${(totalAcquisition / allInCost) * 100}%`, background: theme.accent, opacity: 0.6 }} title="Acquisition" />
              <div style={{ width: `${(totalRenovation / allInCost) * 100}%`, background: theme.orange, opacity: 0.6 }} title="Renovation" />
              <div style={{ width: `${(totalHoldingCost / allInCost) * 100}%`, background: theme.red, opacity: 0.5 }} title="Holding" />
            </>
          )}
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 11, color: theme.textDim, flexWrap: "wrap" }}>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.accent, opacity: 0.6, marginRight: 4, verticalAlign: "middle" }} />Acquisition</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.orange, opacity: 0.6, marginRight: 4, verticalAlign: "middle" }} />Renovation</span>
          <span><span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: theme.red, opacity: 0.5, marginRight: 4, verticalAlign: "middle" }} />Holding</span>
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <Card title="Your Resale Projections" subtitle="Estimate your expected selling price and agent costs to calculate projected profit.">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Your Expected Resale Price (R)" value={resale.expectedPrice} onChange={(v) => updateResale("expectedPrice", v)} tooltip={TOOLTIPS.expectedPrice} isMobile={isMobile} />
          <NumInput label="Area Benchmark (R/sqm)" value={resale.areaBenchmarkPsqm} onChange={(v) => updateResale("areaBenchmarkPsqm", v)} suffix="/sqm" tooltip={TOOLTIPS.areaBenchmarkPsqm} isMobile={isMobile} />
          <NumInput label="Agent Commission" value={resale.agentCommission} onChange={(v) => updateResale("agentCommission", v)} prefix="" suffix="%" tooltip={TOOLTIPS.agentCommission} isMobile={isMobile} />
        </div>
        <div style={{ fontSize: 12, color: theme.textDim, marginTop: 8 }}>
          Benchmark resale value: {fmt(resale.areaBenchmarkPsqm * prop.totalSqm)} ({prop.totalSqm} sqm x {fmt(resale.areaBenchmarkPsqm)}/sqm)
        </div>
      </Card>

      <SectionDivider label="Deal Score" />
      <DealScoreBadge />
      <div style={{ marginTop: 20 }} />

      <SectionDivider label="Profit Analysis" />
      <Card title="Your Profit Analysis" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <MetricBox label="All-In Cost" value={fmt(allInCost)} isMobile={isMobile} />
          <MetricBox label="Resale Price" value={fmt(resale.expectedPrice)} isMobile={isMobile} />
          <MetricBox label="Agent Commission" value={fmt(agentComm)} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <MetricBox label="Gross Profit" value={fmt(grossProfit)} color={grossProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
          <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
          <MetricBox label="Profit/sqm" value={fmt(profitPerSqm)} color={profitPerSqm >= 0 ? theme.green : theme.red} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
          <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
          <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`Over ${holding.renovationMonths} months`} isMobile={isMobile} />
          <MetricBox label="Break-Even Resale" value={fmt(breakEvenResale)} isMobile={isMobile} />
        </div>
      </Card>

      <SectionDivider label="Cash Analysis" />
      <CashAnalysis />

      <Card title="Formulas">
        <div style={{ fontSize: 11, color: theme.textDim, fontFamily: "'JetBrains Mono', monospace", lineHeight: 2, overflowX: "auto" }}>
          <div>All-In = Acquisition({fmt(totalAcquisition)}) + Renovation({fmt(totalRenovation)}) + Holding({fmt(totalHoldingCost)})</div>
          <div>Gross Profit = Resale - All-In = {fmt(resale.expectedPrice)} - {fmt(allInCost)} = {fmt(grossProfit)}</div>
          <div>Net Profit = Gross - Agent = {fmt(grossProfit)} - {fmt(agentComm)} = {fmt(netProfit)}</div>
          <div>ROI = Net / All-In = {pct(roi)}</div>
          <div>Annualized ROI = ROI x (12 / {holding.renovationMonths}mo) = {pct(annualizedRoi)}</div>
          <div>Return on Cash = Net / Cash Invested = {fmt(netProfit)} / {fmt(cashInvested)} = {pct(returnOnCash)}</div>
        </div>
      </Card>
    </div>
  );
}
