// @ts-nocheck
"use client";
import { theme, NumInput, Card } from "./theme";
import type { MaterialPalette, ColorSelection, TileSelection } from "@/types/deal";

interface MaterialPaletteStepProps {
  palette: MaterialPalette;
  updatePalette: (p: MaterialPalette) => void;
  isMobile: boolean;
}

const COLOR_ROLES: { value: ColorSelection["role"]; label: string }[] = [
  { value: "exterior", label: "Exterior Color" },
  { value: "exterior_accent", label: "Exterior Accent" },
  { value: "interior", label: "Interior Color" },
  { value: "interior_accent", label: "Interior Accent" },
];

const TILE_TYPES: { value: TileSelection["type"]; label: string }[] = [
  { value: "ceramic", label: "Ceramic" },
  { value: "porcelain", label: "Porcelain" },
  { value: "vinyl", label: "Vinyl" },
  { value: "natural_stone", label: "Natural Stone" },
  { value: "other", label: "Other" },
];

const TILE_SIZES = ["300x300", "600x600", "300x600", "800x800"];

function makeDefaultColors(): ColorSelection[] {
  return COLOR_ROLES.map((role) => ({
    id: crypto.randomUUID(),
    role: role.value,
    name: "",
    brand: "",
    productCode: "",
    pricePerLitre: 0,
  }));
}

const inputStyle: React.CSSProperties = {
  background: theme.input,
  border: `1px solid ${theme.inputBorder}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: theme.text,
  fontSize: 14,
  width: "100%",
  outline: "none",
  minHeight: 44,
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  color: theme.textDim,
  textTransform: "uppercase",
  display: "block",
  marginBottom: 4,
};

export default function MaterialPaletteStep({
  palette,
  updatePalette,
  isMobile,
}: MaterialPaletteStepProps) {
  // Initialize colors with 4 default entries if empty
  const colors = palette.colors.length === 4
    ? palette.colors
    : makeDefaultColors();

  // Ensure we sync if we just initialized defaults
  if (palette.colors.length !== 4) {
    // Will render once with defaults, then update parent
    setTimeout(() => updatePalette({ ...palette, colors }), 0);
  }

  const updateColor = (id: string, key: string, value: unknown) => {
    const updated = colors.map((c) => (c.id === id ? { ...c, [key]: value } : c));
    updatePalette({ ...palette, colors: updated });
  };

  const tiles = palette.tiles;

  const addTile = () => {
    const newTile: TileSelection = {
      id: crypto.randomUUID(),
      label: "",
      type: "ceramic",
      size: "600x600",
      pricePerSqm: 0,
      brand: "",
      supplier: "",
    };
    updatePalette({ ...palette, tiles: [...tiles, newTile] });
  };

  const updateTile = (id: string, key: string, value: unknown) => {
    const updated = tiles.map((t) => (t.id === id ? { ...t, [key]: value } : t));
    updatePalette({ ...palette, tiles: updated });
  };

  const removeTile = (id: string) => {
    updatePalette({ ...palette, tiles: tiles.filter((t) => t.id !== id) });
  };

  return (
    <div>
      {/* Colors Section */}
      <Card title="Paint Colors" subtitle="Define the paint palette for your renovation. Each role has a dedicated color selection.">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {colors.map((color) => {
            const roleLabel = COLOR_ROLES.find((r) => r.value === color.role)?.label ?? color.role;
            return (
              <div
                key={color.id}
                style={{
                  background: theme.input,
                  border: `1px solid ${theme.inputBorder}`,
                  borderRadius: 8,
                  padding: isMobile ? 12 : 16,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 700, color: theme.accent, marginBottom: 12 }}>
                  {roleLabel}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={labelStyle}>Color Name</label>
                    <input
                      value={color.name}
                      onChange={(e) => updateColor(color.id, "name", e.target.value)}
                      placeholder="e.g. Warm White"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Brand</label>
                    <input
                      value={color.brand}
                      onChange={(e) => updateColor(color.id, "brand", e.target.value)}
                      placeholder="e.g. Plascon, Dulux"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Product Code</label>
                    <input
                      value={color.productCode}
                      onChange={(e) => updateColor(color.id, "productCode", e.target.value)}
                      placeholder="e.g. PL-WW-001"
                      style={inputStyle}
                    />
                  </div>
                  <NumInput
                    label="Price per Litre"
                    value={color.pricePerLitre}
                    onChange={(v: number) => updateColor(color.id, "pricePerLitre", v)}
                    suffix="/L"
                    isMobile={isMobile}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tiles Section */}
      <Card title="Tile Selections" subtitle="Define your tile choices. These can be referenced from room breakdowns." style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <button
            onClick={addTile}
            style={{
              background: theme.accent,
              color: "#000",
              border: "none",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            + Add Tile
          </button>
        </div>

        {tiles.length === 0 && (
          <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
            No tiles added yet. Tap &quot;+ Add Tile&quot; to define your tile selections.
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {tiles.map((tile) => (
            <div
              key={tile.id}
              style={{
                background: theme.input,
                border: `1px solid ${theme.inputBorder}`,
                borderRadius: 8,
                padding: isMobile ? 12 : 16,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={labelStyle}>Label</label>
                  <input
                    value={tile.label}
                    onChange={(e) => updateTile(tile.id, "label", e.target.value)}
                    placeholder="e.g. Kitchen floor tile"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select
                    value={tile.type}
                    onChange={(e) => updateTile(tile.id, "type", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {TILE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Size</label>
                  <select
                    value={tile.size}
                    onChange={(e) => updateTile(tile.id, "size", e.target.value)}
                    style={{ ...inputStyle, cursor: "pointer" }}
                  >
                    {TILE_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <NumInput
                  label="Price per sqm"
                  value={tile.pricePerSqm}
                  onChange={(v: number) => updateTile(tile.id, "pricePerSqm", v)}
                  suffix="/sqm"
                  isMobile={isMobile}
                />
                <div>
                  <label style={labelStyle}>Brand</label>
                  <input
                    value={tile.brand}
                    onChange={(e) => updateTile(tile.id, "brand", e.target.value)}
                    placeholder="e.g. Italtile"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Supplier (optional)</label>
                  <input
                    value={tile.supplier}
                    onChange={(e) => updateTile(tile.id, "supplier", e.target.value)}
                    placeholder="e.g. CTM, Tile Africa"
                    style={inputStyle}
                  />
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => removeTile(tile.id)}
                  style={{
                    background: theme.red,
                    border: "none",
                    color: "#fff",
                    fontSize: 13,
                    cursor: "pointer",
                    borderRadius: 8,
                    padding: "8px 16px",
                    minHeight: 36,
                    fontWeight: 600,
                  }}
                >
                  Remove Tile
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
