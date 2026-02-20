"use client";
import { theme, fmt, pct, Card, SectionDivider, MetricBox, BarChart, CTAButton } from "./theme";

export default function SummaryStep({
  acq, holding, resale, prop, transferDuty,
  allInCost, agentComm, netProfit, grossProfit, roi, annualizedRoi, returnOnCash,
  cashInvested, breakEvenResale, renoCostPerSqm, dealScore,
  totalAcquisition, totalRenovation, totalHoldingCost,
  totalRoomMaterialCost, contractorLabour, fixedCosts, pmCost, contingency,
  roomCosts, contractors, resetAll,
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
      <DealScoreBadge />
      <div style={{ marginTop: 20 }} />

      <Card title="Project Cost Stack" style={{ background: `${theme.accent}08` }}>
        <BarChart data={[
          { label: "Purchase Price", value: acq.purchasePrice },
          { label: "Transfer & Fees", value: transferDuty + acq.transferAttorneyFees + acq.bondRegistration },
          { label: "Renovation", value: totalRenovation },
          { label: "Holding Costs", value: totalHoldingCost },
          { label: "Agent Commission", value: agentComm },
        ]} isMobile={isMobile} />
      </Card>

      <SectionDivider label="Key Metrics" />
      <Card title="Key Metrics">
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
          <MetricBox label="All-In Cost" value={fmt(allInCost)} isMobile={isMobile} />
          <MetricBox label="Resale Price" value={fmt(resale.expectedPrice)} isMobile={isMobile} />
          <MetricBox label="Net Profit" value={fmt(netProfit)} color={netProfit >= 0 ? theme.green : theme.red} isMobile={isMobile} />
          <MetricBox label="ROI" value={pct(roi)} color={roi >= 0.15 ? theme.green : roi >= 0 ? theme.orange : theme.red} isMobile={isMobile} />
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricBox label="Annualized ROI" value={pct(annualizedRoi)} color={annualizedRoi >= 0.3 ? theme.green : annualizedRoi >= 0.15 ? theme.orange : theme.red} sub={`${holding.renovationMonths} month hold`} isMobile={isMobile} />
          <MetricBox label="Return on Cash" value={pct(returnOnCash)} color={returnOnCash >= 0.2 ? theme.green : theme.orange} isMobile={isMobile} />
          <MetricBox label="Reno Cost/sqm" value={fmt(renoCostPerSqm)} isMobile={isMobile} />
          <MetricBox label="Break-Even" value={fmt(breakEvenResale)} isMobile={isMobile} />
        </div>
      </Card>

      <SectionDivider label="Cash Analysis" />
      <CashAnalysis />

      {/* Renovation Cost Breakdown */}
      <SectionDivider label="Renovation Breakdown" />
      <Card title="Renovation Cost Breakdown">
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 2.2 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textDim }}>Room-Level Material Costs:</span>
            <span style={{ color: theme.text }}>{fmt(totalRoomMaterialCost)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textDim }}>Contractor Labour:</span>
            <span style={{ color: theme.text }}>{fmt(contractorLabour)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textDim }}>Fixed / Project Costs:</span>
            <span style={{ color: theme.text }}>{fmt(fixedCosts)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textDim }}>PM Fee (8%):</span>
            <span style={{ color: theme.text }}>{fmt(pmCost)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: theme.textDim }}>Contingency (10%):</span>
            <span style={{ color: theme.text }}>{fmt(contingency)}</span>
          </div>
          <div style={{ borderTop: `1px solid ${theme.cardBorder}`, paddingTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span style={{ color: theme.accent }}>Total Renovation:</span>
            <span style={{ color: theme.accent }}>{fmt(totalRenovation)}</span>
          </div>
        </div>
      </Card>

      <SectionDivider label="Room Breakdown" />
      <Card title="Room Cost Breakdown">
        {roomCosts.map((r) => (
          <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
            <span style={{ color: theme.text }}>{r.name} <span style={{ color: theme.textDim, fontSize: 11 }}>({r.sqm}sqm, {r.scope}{r.breakdownMode === "detailed" ? ", detailed" : ""})</span></span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(r.totalCost)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: theme.text }}>Room-level total</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(totalRoomMaterialCost)}</span>
        </div>
      </Card>

      {/* Contractor Summary */}
      {contractors.length > 0 && (
        <>
          <SectionDivider label="Contractors" />
          <Card title="Contractor Summary">
            {contractors.map((c) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.cardBorder}20`, fontSize: 13 }}>
                <span style={{ color: theme.text }}>{c.name} <span style={{ color: theme.textDim, fontSize: 11 }}>({c.profession}, {c.daysWorked} days)</span></span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(c.dailyRate * c.daysWorked)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 0", fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: theme.text }}>Total contractor labour</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: theme.accent }}>{fmt(contractorLabour)}</span>
            </div>
          </Card>
        </>
      )}

      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
        <CTAButton label="Start New Calculation" onClick={resetAll} primary={false} isMobile={isMobile} />
      </div>
    </div>
  );
}
