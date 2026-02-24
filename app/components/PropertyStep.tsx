// @ts-nocheck
"use client";
import { NumInput, Card, Select } from "./theme";
import { TOOLTIPS } from "../data/constants";

interface PropertyStepProps {
  prop: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
  isMobile: boolean;
}

export default function PropertyStep({ prop, updateProp, isMobile }: PropertyStepProps) {
  return (
    <Card title="Your Property Details" subtitle="Describe the property so we can calculate accurate renovation cost estimates per square metre.">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
        <NumInput label="Total Property Size" value={prop.totalSqm} onChange={(v: number) => updateProp("totalSqm", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.totalSqm} isMobile={isMobile} />
        <NumInput label="Erf / Stand Size" value={prop.erfSize} onChange={(v: number) => updateProp("erfSize", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.erfSize} isMobile={isMobile} />
        <NumInput label="Bedrooms" value={prop.bedrooms} onChange={(v: number) => updateProp("bedrooms", v)} prefix="" isMobile={isMobile} />
        <NumInput label="Bathrooms" value={prop.bathrooms} onChange={(v: number) => updateProp("bathrooms", v)} prefix="" isMobile={isMobile} />
        <NumInput label="Garages" value={prop.garages} onChange={(v: number) => updateProp("garages", v)} prefix="" isMobile={isMobile} />
        <Select label="Stories" value={prop.stories} onChange={(v: string) => updateProp("stories", v)} options={[
          { value: "single", label: "Single storey" }, { value: "double", label: "Double storey" },
        ]} />
      </div>
    </Card>
  );
}
