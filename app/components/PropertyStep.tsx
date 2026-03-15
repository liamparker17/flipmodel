// @ts-nocheck
"use client";
import { NumInput, Card, Select } from "./theme";
import { TOOLTIPS } from "../data/constants";

interface PropertyStepProps {
  prop: Record<string, unknown>;
  updateProp: (key: string, value: unknown) => void;
  propAfter?: Record<string, unknown>;
  updatePropAfter?: (key: string, value: unknown) => void;
  isMobile: boolean;
}

export default function PropertyStep({ prop, updateProp, propAfter, updatePropAfter, isMobile }: PropertyStepProps) {
  const showAfter = !!updatePropAfter;
  const after = propAfter || prop;
  const handleAfter = updatePropAfter || updateProp;

  return (
    <>
      <Card title="Current Property (As Purchased)" subtitle="Describe the property as it is right now, before any renovation work.">
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
          <NumInput label="Total Property Size" value={prop.totalSqm} onChange={(v: number) => updateProp("totalSqm", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.totalSqm} isMobile={isMobile} />
          <NumInput label="Erf / Stand Size" value={prop.erfSize} onChange={(v: number) => updateProp("erfSize", v)} prefix="" suffix="sqm" tooltip={TOOLTIPS.erfSize} isMobile={isMobile} />
          <NumInput label="Bedrooms" value={prop.bedrooms} onChange={(v: number) => updateProp("bedrooms", v)} prefix="" isMobile={isMobile} />
          <NumInput label="Bathrooms" value={prop.bathrooms} onChange={(v: number) => updateProp("bathrooms", v)} prefix="" isMobile={isMobile} />
          <NumInput label="Garages" value={prop.garages} onChange={(v: number) => updateProp("garages", v)} prefix="" isMobile={isMobile} />
          <Select label="Stories" value={prop.stories} onChange={(v: string) => updateProp("stories", v)} options={[
            { value: "single", label: "Single storey" }, { value: "double", label: "Double storey" },
          ]} />
          <NumInput label="Default Ceiling Height (m)" value={prop.defaultCeilingHeight ?? 2.4} onChange={(v: number) => updateProp("defaultCeilingHeight", v)} prefix="" suffix="m" step={0.1} isMobile={isMobile} />
        </div>
      </Card>

      {showAfter && (
        <Card title="Planned Property (After Renovation)" subtitle="What will the property look like after renovation? E.g. converting a garage to a bedroom.">
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "0 20px" }}>
            <NumInput label="Total Property Size" value={after.totalSqm} onChange={(v: number) => handleAfter("totalSqm", v)} prefix="" suffix="sqm" tooltip="Final property size after any extensions or conversions" isMobile={isMobile} />
            <NumInput label="Erf / Stand Size" value={after.erfSize} onChange={(v: number) => handleAfter("erfSize", v)} prefix="" suffix="sqm" isMobile={isMobile} />
            <NumInput label="Bedrooms" value={after.bedrooms} onChange={(v: number) => handleAfter("bedrooms", v)} prefix="" isMobile={isMobile} />
            <NumInput label="Bathrooms" value={after.bathrooms} onChange={(v: number) => handleAfter("bathrooms", v)} prefix="" isMobile={isMobile} />
            <NumInput label="Garages" value={after.garages} onChange={(v: number) => handleAfter("garages", v)} prefix="" isMobile={isMobile} />
            <Select label="Stories" value={after.stories} onChange={(v: string) => handleAfter("stories", v)} options={[
              { value: "single", label: "Single storey" }, { value: "double", label: "Double storey" },
            ]} />
          </div>
        </Card>
      )}
    </>
  );
}
