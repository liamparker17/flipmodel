// @ts-nocheck
"use client";
import { theme, fmt } from "./theme";
import { ROOM_TEMPLATES, generateRoomItems, calcAutoQty, detectRoomType } from "../data/roomTemplates";
import { UNIT_TYPES } from "../data/constants";
import type { MaterialPalette } from "@/types/deal";

interface DetailedItem {
  key: string;
  label: string;
  included: boolean;
  qty: number;
  unitCost: number;
  unit: string;
  paletteRef?: string | null;
}

interface Room {
  id: number;
  name: string;
  sqm: number;
  scope: string;
  roomType?: string;
  breakdownMode?: string;
  detailedItems?: DetailedItem[] | null;
  ceilingHeight?: number | null;
  doorSqm?: number;
  windowSqm?: number;
  [key: string]: unknown;
}

interface RoomBreakdownProps {
  room: Room;
  onUpdateRoom: (id: number, key: string, value: unknown) => void;
  isMobile: boolean;
  defaultCeilingHeight: number;
  palette: MaterialPalette;
}

export default function RoomBreakdown({ room, onUpdateRoom, isMobile, defaultCeilingHeight, palette }: RoomBreakdownProps) {
  const roomType = room.roomType || detectRoomType(room.name);
  const template = (ROOM_TEMPLATES as Record<string, unknown>)[roomType];
  const isDetailed = room.breakdownMode === "detailed";

  const effectiveCeiling = room.ceilingHeight ?? defaultCeilingHeight;
  const effectiveDoors = room.doorSqm ?? 0;
  const effectiveWindows = room.windowSqm ?? 0;

  const toggleMode = () => {
    if (!isDetailed) {
      const items = room.detailedItems && room.detailedItems.length > 0
        ? room.detailedItems
        : generateRoomItems(roomType, room.sqm);
      onUpdateRoom(room.id, "detailedItems", items);
      onUpdateRoom(room.id, "breakdownMode", "detailed");
    } else {
      onUpdateRoom(room.id, "breakdownMode", "simple");
    }
  };

  const updateItem = (idx: number, field: string, value: unknown) => {
    const newItems = [...(room.detailedItems || [])];
    newItems[idx] = { ...newItems[idx], [field]: value };
    onUpdateRoom(room.id, "detailedItems", newItems);
  };

  const getEffectiveUnitCost = (item: DetailedItem) => {
    if (!item.paletteRef) return item.unitCost;
    const tile = palette.tiles.find(t => t.id === item.paletteRef);
    if (tile) return tile.pricePerSqm;
    const color = palette.colors.find(c => c.id === item.paletteRef);
    if (color) return color.pricePerLitre;
    return item.unitCost;
  };

  const detailedTotal = isDetailed && room.detailedItems
    ? room.detailedItems.filter((i) => i.included).reduce((s, i) => s + i.qty * getEffectiveUnitCost(i), 0)
    : 0;

  const roomTypeOptions = Object.entries(ROOM_TEMPLATES as Record<string, { label: string }>).map(([key, t]) => ({ value: key, label: t.label }));

  const handleRoomTypeChange = (newType: string) => {
    onUpdateRoom(room.id, "roomType", newType);
    if (isDetailed) {
      const items = generateRoomItems(newType, room.sqm);
      onUpdateRoom(room.id, "detailedItems", items);
    }
  };

  const handleSqmChange = (newSqm: number) => {
    onUpdateRoom(room.id, "sqm", newSqm);
    if (isDetailed && room.detailedItems) {
      const tmpl = (ROOM_TEMPLATES as Record<string, { items: Array<{ key: string; autoQty: unknown }> }>)[roomType];
      if (tmpl) {
        const newItems = room.detailedItems.map((item) => {
          const tmplItem = tmpl.items.find((t) => t.key === item.key);
          if (tmplItem && typeof tmplItem.autoQty !== "number") {
            return { ...item, qty: calcAutoQty(tmplItem.autoQty as string, newSqm, effectiveCeiling, effectiveDoors, effectiveWindows) };
          }
          return item;
        });
        onUpdateRoom(room.id, "detailedItems", newItems);
      }
    }
  };

  const inputSmall: React.CSSProperties = {
    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
    padding: "8px 10px", color: theme.text, fontSize: 16, textAlign: "right",
    outline: "none", fontFamily: "'JetBrains Mono', monospace", minHeight: 40,
  };

  const labelStyle: React.CSSProperties = { fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Room Type</label>
          <select value={roomType} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleRoomTypeChange(e.target.value)} style={{
            background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
            padding: "10px 12px", color: theme.text, fontSize: 16, width: "100%", outline: "none",
            minHeight: 44,
          }}>
            {roomTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
          <span style={{ fontSize: 12, color: theme.textDim }}>Simple</span>
          <div onClick={toggleMode} style={{
            width: 48, height: 28, borderRadius: 14,
            background: isDetailed ? theme.accent : theme.inputBorder,
            cursor: "pointer", position: "relative", transition: "all 0.2s",
          }}>
            <div style={{ width: 22, height: 22, borderRadius: 11, background: "#fff", position: "absolute", top: 3, left: isDetailed ? 23 : 3, transition: "all 0.2s" }} />
          </div>
          <span style={{ fontSize: 12, color: isDetailed ? theme.accent : theme.textDim, fontWeight: isDetailed ? 600 : 400 }}>Detailed</span>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={labelStyle}>Ceiling Height (m)</label>
          <input
            type="number"
            step={0.1}
            value={room.ceilingHeight ?? ""}
            placeholder={String(defaultCeilingHeight)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdateRoom(room.id, "ceilingHeight", e.target.value === "" ? null : Number(e.target.value))
            }
            style={{ ...inputSmall, width: "100%" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={labelStyle}>Door Area (sqm)</label>
          <input
            type="number"
            step={0.1}
            value={room.doorSqm ?? ""}
            placeholder="0"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdateRoom(room.id, "doorSqm", e.target.value === "" ? 0 : Number(e.target.value))
            }
            style={{ ...inputSmall, width: "100%" }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={labelStyle}>Window Area (sqm)</label>
          <input
            type="number"
            step={0.1}
            value={room.windowSqm ?? ""}
            placeholder="0"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onUpdateRoom(room.id, "windowSqm", e.target.value === "" ? 0 : Number(e.target.value))
            }
            style={{ ...inputSmall, width: "100%" }}
          />
        </div>
      </div>
      <div style={{ fontSize: 13, color: theme.textDim, marginTop: 4, marginBottom: 8 }}>
        Volume: {(room.sqm * effectiveCeiling).toFixed(1)} m³ | Net Wall: {calcAutoQty("wallArea", room.sqm, effectiveCeiling, effectiveDoors, effectiveWindows)} sqm
      </div>

      {isDetailed && room.detailedItems && (
        <div style={{ marginTop: 12 }}>
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {room.detailedItems.map((item, idx) => {
                const effectiveUnitCost = getEffectiveUnitCost(item);
                const lineTotal = item.included ? item.qty * effectiveUnitCost : 0;
                return (
                  <div key={item.key} style={{
                    background: theme.input, borderRadius: 8, padding: 12,
                    opacity: item.included ? 1 : 0.4,
                    border: `1px solid ${theme.inputBorder}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={item.included} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, "included", e.target.checked)}
                          style={{ cursor: "pointer", width: 22, height: 22 }}
                        />
                        <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 10, color: theme.textDim }}>{(UNIT_TYPES as Record<string, { suffix: string }>)[item.unit]?.suffix || item.unit}</span>
                    </div>
                    {item.key.toLowerCase().includes("tile") && palette.tiles.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Tile (from palette)</label>
                        <select value={item.paletteRef || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const ref = e.target.value || null;
                          const tile = palette.tiles.find(t => t.id === ref);
                          updateItem(idx, "paletteRef", ref);
                          if (tile) updateItem(idx, "unitCost", tile.pricePerSqm);
                        }} style={{ ...inputSmall, width: "100%", textAlign: "left" }}>
                          <option value="">Manual price</option>
                          {palette.tiles.map(t => <option key={t.id} value={t.id}>{t.label} (R{t.pricePerSqm}/sqm)</option>)}
                        </select>
                      </div>
                    )}
                    {item.key.toLowerCase().includes("paint") && palette.colors.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Paint (from palette)</label>
                        <select value={item.paletteRef || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const ref = e.target.value || null;
                          const color = palette.colors.find(c => c.id === ref);
                          updateItem(idx, "paletteRef", ref);
                          if (color) updateItem(idx, "unitCost", color.pricePerLitre);
                        }} style={{ ...inputSmall, width: "100%", textAlign: "left" }}>
                          <option value="">Manual price</option>
                          {palette.colors.map(c => <option key={c.id} value={c.id}>{c.name} (R{c.pricePerLitre}/L)</option>)}
                        </select>
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Qty</label>
                        <input type="number" value={item.qty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, "qty", Number(e.target.value))}
                          style={{ ...inputSmall, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Unit Cost</label>
                        <input type="number" value={effectiveUnitCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          updateItem(idx, "unitCost", Number(e.target.value));
                          updateItem(idx, "paletteRef", null);
                        }}
                          style={{ ...inputSmall, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Total</label>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 14, fontWeight: 700,
                          color: item.included ? theme.accent : theme.textDim, padding: "8px 0",
                        }}>{fmt(lineTotal)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div style={{
                background: `${theme.accent}10`, borderRadius: 8, padding: 14,
                display: "flex", justifyContent: "space-between", alignItems: "center",
                border: `1px solid ${theme.accent}40`,
              }}>
                <span style={{ fontWeight: 700, color: theme.text }}>Room Total</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: theme.accent, fontSize: 16 }}>{fmt(detailedTotal)}</span>
              </div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.cardBorder}` }}>
                    <th style={{ width: 30, padding: "6px 4px" }}></th>
                    <th style={{ textAlign: "left", padding: "6px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1 }}>Item</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, width: 70 }}>Qty</th>
                    <th style={{ textAlign: "center", padding: "6px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, width: 50 }}>Unit</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, width: 100 }}>Unit Cost</th>
                    <th style={{ textAlign: "right", padding: "6px 8px", color: theme.textDim, textTransform: "uppercase", fontSize: 10, letterSpacing: 1, width: 110 }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {room.detailedItems.map((item, idx) => {
                    const effectiveUnitCost = getEffectiveUnitCost(item);
                    const lineTotal = item.included ? item.qty * effectiveUnitCost : 0;
                    return (
                      <tr key={item.key} style={{ borderBottom: `1px solid ${theme.cardBorder}15`, opacity: item.included ? 1 : 0.4 }}>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="checkbox" checked={item.included} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, "included", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
                        </td>
                        <td style={{ padding: "4px 8px", color: theme.text }}>
                          <div>{item.label}</div>
                          {item.key.toLowerCase().includes("tile") && palette.tiles.length > 0 && (
                            <select value={item.paletteRef || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              const ref = e.target.value || null;
                              const tile = palette.tiles.find(t => t.id === ref);
                              updateItem(idx, "paletteRef", ref);
                              if (tile) updateItem(idx, "unitCost", tile.pricePerSqm);
                            }} style={{ ...inputSmall, fontSize: 11, marginTop: 4, textAlign: "left" }}>
                              <option value="">Manual price</option>
                              {palette.tiles.map(t => <option key={t.id} value={t.id}>{t.label} (R{t.pricePerSqm}/sqm)</option>)}
                            </select>
                          )}
                          {item.key.toLowerCase().includes("paint") && palette.colors.length > 0 && (
                            <select value={item.paletteRef || ""} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              const ref = e.target.value || null;
                              const color = palette.colors.find(c => c.id === ref);
                              updateItem(idx, "paletteRef", ref);
                              if (color) updateItem(idx, "unitCost", color.pricePerLitre);
                            }} style={{ ...inputSmall, fontSize: 11, marginTop: 4, textAlign: "left" }}>
                              <option value="">Manual price</option>
                              {palette.colors.map(c => <option key={c.id} value={c.id}>{c.name} (R{c.pricePerLitre}/L)</option>)}
                            </select>
                          )}
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          <input type="number" value={item.qty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateItem(idx, "qty", Number(e.target.value))}
                            style={{ ...inputSmall, width: 60 }}
                          />
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "center", fontSize: 10, color: theme.textDim }}>
                          {(UNIT_TYPES as Record<string, { suffix: string }>)[item.unit]?.suffix || item.unit}
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          <input type="number" value={effectiveUnitCost} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            updateItem(idx, "unitCost", Number(e.target.value));
                            updateItem(idx, "paletteRef", null);
                          }}
                            style={{ ...inputSmall, width: 90 }}
                          />
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", color: item.included ? theme.accent : theme.textDim }}>
                          {fmt(lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: `2px solid ${theme.cardBorder}` }}>
                    <td colSpan={5} style={{ padding: "8px 8px", fontWeight: 700, color: theme.text, textAlign: "right" }}>Room Total</td>
                    <td style={{ padding: "8px 8px", textAlign: "right", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: theme.accent, fontSize: 14 }}>
                      {fmt(detailedTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
