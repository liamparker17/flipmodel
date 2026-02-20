"use client";
import { theme, fmt, NumInput, Card, SectionDivider, MetricBox } from "./theme";
import { UNIT_TYPES, TOOLTIPS } from "../data/constants";

export default function CostDatabase({
  costDb, updateCostItem, pmPct, setPmPct, contingencyPct, setContingencyPct,
  totalRoomMaterialCost, contractorLabour, fixedCosts, pmCost, contingency, totalRenovation, renoCostPerSqm,
  isMobile,
}) {
  return (
    <div>
      {Object.entries(costDb).map(([catKey, items]) => (
        <Card key={catKey} title={catKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())} subtitle="Adjust unit costs below. Per-sqm items are multiplied by room sizes and scope.">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "4px 20px" }}>
            {Object.entries(items).map(([itemKey, item]) => (
              <div key={itemKey} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ flex: 1, fontSize: 12, color: theme.textDim }}>{item.label}</span>
                <div style={{ display: "flex", alignItems: "center", background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6, padding: "4px 8px", width: 120 }}>
                  <span style={{ fontSize: 10, color: theme.textDim, marginRight: 3 }}>R</span>
                  <input type="number" value={item.cost} onChange={(e) => updateCostItem(catKey, itemKey, e.target.value)} style={{ background: "transparent", border: "none", color: theme.text, fontSize: 12, width: "100%", outline: "none", fontFamily: "'JetBrains Mono', monospace" }} />
                </div>
                <span style={{ fontSize: 9, color: theme.textDim, width: 40 }}>{UNIT_TYPES[item.unit]?.suffix || item.unit}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}
      <SectionDivider label="Project Overheads" />
      <Card title="Project Overheads" subtitle="Percentage-based fees applied on top of renovation costs.">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Project Management Fee" value={pmPct} onChange={setPmPct} prefix="" suffix="%" tooltip={TOOLTIPS.pmPct} isMobile={isMobile} />
          <NumInput label="Contingency Buffer" value={contingencyPct} onChange={setContingencyPct} prefix="" suffix="%" tooltip={TOOLTIPS.contingency} isMobile={isMobile} />
        </div>
      </Card>
      <SectionDivider label="Cost Summary" />
      <Card title="Renovation Cost Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricBox label="Room-Level Material" value={fmt(totalRoomMaterialCost)} isMobile={isMobile} />
          <MetricBox label="Contractor Labour" value={fmt(contractorLabour)} isMobile={isMobile} />
          <MetricBox label="Fixed Costs" value={fmt(fixedCosts)} isMobile={isMobile} />
          <MetricBox label="PM Fee" value={fmt(pmCost)} isMobile={isMobile} />
          <MetricBox label="Contingency" value={fmt(contingency)} isMobile={isMobile} />
          <MetricBox label="Total Renovation" value={fmt(totalRenovation)} color={theme.accent} isMobile={isMobile} />
          <MetricBox label="Cost/sqm" value={fmt(renoCostPerSqm)} sub="per sqm" isMobile={isMobile} />
        </div>
      </Card>
    </div>
  );
}
