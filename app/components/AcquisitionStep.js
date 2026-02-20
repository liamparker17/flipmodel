"use client";
import { theme, fmt, NumInput, Card, SectionDivider, MetricBox, Toggle, Tooltip } from "./theme";
import { TOOLTIPS } from "../data/constants";

export default function AcquisitionStep({ acq, updateAcq, transferDuty, totalAcquisition, isMobile }) {
  return (
    <div>
      <Card title="Your Purchase Details" subtitle="Enter the agreed purchase price and deposit amount for the property.">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Your Purchase Price (R)" value={acq.purchasePrice} onChange={(v) => updateAcq("purchasePrice", v)} tooltip={TOOLTIPS.purchasePrice} isMobile={isMobile} />
          <NumInput label="Your Deposit (R)" value={acq.deposit} onChange={(v) => updateAcq("deposit", v)} tooltip={TOOLTIPS.deposit} isMobile={isMobile} />
        </div>
        <Toggle label="Cash purchase (no bond)" value={acq.cashPurchase} onChange={(v) => updateAcq("cashPurchase", v)} tooltip={TOOLTIPS.cashPurchase} />
        {!acq.cashPurchase && (
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
            <NumInput label="Bond Interest (if any) %" value={acq.bondRate} onChange={(v) => updateAcq("bondRate", v)} prefix="" suffix="%" tooltip={TOOLTIPS.bondRate} isMobile={isMobile} />
            <NumInput label="Bond Term" value={acq.bondTerm} onChange={(v) => updateAcq("bondTerm", v)} prefix="" suffix="months" tooltip={TOOLTIPS.bondTerm} isMobile={isMobile} />
          </div>
        )}
      </Card>
      <SectionDivider label="Transfer & Registration" />
      <Card title="Transfer & Registration Costs" subtitle="These are the legal and government fees associated with transferring the property into your name.">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, padding: "12px 14px", background: theme.accentDim, borderRadius: 8 }}>
          <span style={{ fontSize: 12, color: theme.accent }}>Auto-calculated transfer duty:</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 14, color: theme.accent, fontWeight: 700 }}>{fmt(transferDuty)}</span>
          <Tooltip text={TOOLTIPS.transferDuty} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Transfer Attorney Fees (R)" value={acq.transferAttorneyFees} onChange={(v) => updateAcq("transferAttorneyFees", v)} tooltip={TOOLTIPS.transferAttorneyFees} isMobile={isMobile} />
          <NumInput label="Bond Registration (R)" value={acq.bondRegistration} onChange={(v) => updateAcq("bondRegistration", v)} tooltip={TOOLTIPS.bondRegistration} isMobile={isMobile} />
        </div>
        <NumInput label="Expected Renovation Costs (R)" value={acq.initialRepairs} onChange={(v) => updateAcq("initialRepairs", v)} tooltip={TOOLTIPS.initialRepairs} isMobile={isMobile} />
        <p style={{ fontSize: 11, color: theme.textDim, marginTop: -8 }}>Any urgent repairs identified before the main renovation (e.g. roof leaks). Leave at R 0 if none.</p>
      </Card>
      <SectionDivider label="Summary" />
      <Card title="Acquisition Summary" style={{ background: `${theme.accent}10`, borderColor: theme.accent }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <MetricBox label="Purchase Price" value={fmt(acq.purchasePrice)} isMobile={isMobile} />
          <MetricBox label="Transfer Duty" value={fmt(transferDuty)} isMobile={isMobile} />
          <MetricBox label="Total Acquisition" value={fmt(totalAcquisition)} color={theme.accent} isMobile={isMobile} />
        </div>
      </Card>
    </div>
  );
}
