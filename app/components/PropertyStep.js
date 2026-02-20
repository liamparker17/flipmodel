"use client";
import { NumInput, Card, Select } from "./theme";
import { TOOLTIPS } from "../data/constants";

export default function PropertyStep({ prop, updateProp, isMobile }) {
  return (
    <Card title="Your Property Details" subtitle="Describe the property so we can calculate accurate renovation cost estimates per square metre.">
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
        <NumInput label="Total Property Size" value={prop.totalSqm} onChange={(v) => updateProp("totalSqm", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.totalSqm} isMobile={isMobile} />
        <NumInput label="Erf / Stand Size" value={prop.erfSize} onChange={(v) => updateProp("erfSize", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.erfSize} isMobile={isMobile} />
        <NumInput label="Bedrooms" value={prop.bedrooms} onChange={(v) => updateProp("bedrooms", v)} prefix="" isMobile={isMobile} />
        <NumInput label="Bathrooms" value={prop.bathrooms} onChange={(v) => updateProp("bathrooms", v)} prefix="" isMobile={isMobile} />
        <NumInput label="Garages" value={prop.garages} onChange={(v) => updateProp("garages", v)} prefix="" isMobile={isMobile} />
        <Select label="Stories" value={prop.stories} onChange={(v) => updateProp("stories", v)} options={[
          { value: "single", label: "Single storey" }, { value: "double", label: "Double storey" },
        ]} />
      </div>
    </Card>
  );
}
