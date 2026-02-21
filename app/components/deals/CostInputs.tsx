"use client";
import { theme, NumInput, Toggle, Tooltip } from "../theme";
import { TOOLTIPS } from "../../data/constants";

interface CostInputsProps {
  purchasePrice: number;
  onPurchasePriceChange: (v: number) => void;
  renoEstimate: number;
  onRenoEstimateChange: (v: number) => void;
  expectedPrice: number;
  onExpectedPriceChange: (v: number) => void;
  renovationMonths: number;
  onRenovationMonthsChange: (v: number) => void;
  cashPurchase: boolean;
  onCashPurchaseChange: (v: boolean) => void;
  isMobile: boolean;
}

export default function CostInputs({
  purchasePrice, onPurchasePriceChange,
  renoEstimate, onRenoEstimateChange,
  expectedPrice, onExpectedPriceChange,
  renovationMonths, onRenovationMonthsChange,
  cashPurchase, onCashPurchaseChange,
  isMobile,
}: CostInputsProps) {
  return (
    <>
      <NumInput label="Your Purchase Price (R)" value={purchasePrice} onChange={onPurchasePriceChange} tooltip={TOOLTIPS.purchasePrice} isMobile={isMobile} />
      <NumInput label="Your Renovation Estimate (R)" value={renoEstimate} onChange={onRenoEstimateChange} tooltip={TOOLTIPS.renoEstimate} isMobile={isMobile} />
      <NumInput label="Expected Sale Price (R)" value={expectedPrice} onChange={onExpectedPriceChange} tooltip={TOOLTIPS.expectedPrice} isMobile={isMobile} />
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
          <label style={{ display: "flex", alignItems: "center", fontSize: 11, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>
            Holding Period<Tooltip text={TOOLTIPS.renovationMonths} />
          </label>
          <span style={{ fontSize: 14, fontWeight: 700, color: theme.accent, fontFamily: "'JetBrains Mono', monospace" }}>
            {renovationMonths} months
          </span>
        </div>
        <input
          type="range" min={1} max={18} step={1} value={renovationMonths}
          onChange={(e) => onRenovationMonthsChange(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: theme.textDim, marginTop: 4 }}>
          <span>1 mo</span><span>18 mo</span>
        </div>
      </div>
      <Toggle label="Cash purchase (no bond)" value={cashPurchase} onChange={onCashPurchaseChange} tooltip={TOOLTIPS.cashPurchase} />
    </>
  );
}
