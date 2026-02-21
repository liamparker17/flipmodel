"use client";
import { useState } from "react";
import { theme } from "../../../components/theme";
import { getStyleOptionsForItem, type StyleOption } from "../lib/styleOptions";
import type { StylePreferences } from "../../../types/deal";

export function StylePicker({ category, itemKey, preferences, onChange }: {
  category: string;
  itemKey: string;
  preferences: StylePreferences;
  onChange: (prefs: StylePreferences) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const options = getStyleOptionsForItem(category, itemKey);

  if (!options) return null;

  const hasPrefs = Object.values(preferences).some(Boolean);

  return (
    <div style={{ marginTop: 8 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          background: hasPrefs ? `${theme.accent}12` : "transparent",
          border: `1px solid ${hasPrefs ? theme.accent + "40" : theme.cardBorder}`,
          borderRadius: 6, padding: "4px 12px", fontSize: 11,
          color: hasPrefs ? theme.accent : theme.textDim,
          cursor: "pointer", fontWeight: 500,
          display: "flex", alignItems: "center", gap: 6,
        }}
      >
        {expanded ? "▾" : "▸"} Customize
        {hasPrefs && (
          <span style={{ fontSize: 10, color: theme.accent }}>
            ({Object.values(preferences).filter(Boolean).join(", ")})
          </span>
        )}
      </button>

      {expanded && (
        <div style={{ marginTop: 8, padding: 12, background: theme.input, borderRadius: 6, border: `1px solid ${theme.inputBorder}` }}>
          {options.map((opt) => (
            <OptionRow key={opt.key} option={opt} selected={preferences[opt.key] || ""} onSelect={(val) => onChange({ ...preferences, [opt.key]: val })} />
          ))}
        </div>
      )}
    </div>
  );
}

function OptionRow({ option, selected, onSelect }: { option: StyleOption; selected: string; onSelect: (val: string) => void }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4, fontWeight: 500 }}>{option.label}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {option.values.map((v) => (
          <button
            key={v.value}
            onClick={() => onSelect(selected === v.value ? "" : v.value)}
            style={{
              background: selected === v.value ? theme.accent : "transparent",
              color: selected === v.value ? "#fff" : theme.textDim,
              border: `1px solid ${selected === v.value ? theme.accent : theme.cardBorder}`,
              borderRadius: 20, padding: "3px 12px", fontSize: 11,
              cursor: "pointer", fontWeight: selected === v.value ? 600 : 400,
              transition: "all 0.1s",
            }}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  );
}
