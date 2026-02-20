"use client";
import { theme, fmt } from "./theme";
import { ROOM_TEMPLATES, generateRoomItems, calcAutoQty, detectRoomType } from "../data/roomTemplates";
import { UNIT_TYPES } from "../data/constants";

export default function RoomBreakdown({ room, onUpdateRoom, isMobile }) {
  const roomType = room.roomType || detectRoomType(room.name);
  const template = ROOM_TEMPLATES[roomType];
  const isDetailed = room.breakdownMode === "detailed";

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

  const updateItem = (idx, field, value) => {
    const newItems = [...(room.detailedItems || [])];
    newItems[idx] = { ...newItems[idx], [field]: value };
    onUpdateRoom(room.id, "detailedItems", newItems);
  };

  const detailedTotal = isDetailed && room.detailedItems
    ? room.detailedItems.filter((i) => i.included).reduce((s, i) => s + i.qty * i.unitCost, 0)
    : 0;

  const roomTypeOptions = Object.entries(ROOM_TEMPLATES).map(([key, t]) => ({ value: key, label: t.label }));

  const handleRoomTypeChange = (newType) => {
    onUpdateRoom(room.id, "roomType", newType);
    if (isDetailed) {
      const items = generateRoomItems(newType, room.sqm);
      onUpdateRoom(room.id, "detailedItems", items);
    }
  };

  const handleSqmChange = (newSqm) => {
    onUpdateRoom(room.id, "sqm", newSqm);
    if (isDetailed && room.detailedItems) {
      const tmpl = ROOM_TEMPLATES[roomType];
      if (tmpl) {
        const newItems = room.detailedItems.map((item) => {
          const tmplItem = tmpl.items.find((t) => t.key === item.key);
          if (tmplItem && typeof tmplItem.autoQty !== "number") {
            return { ...item, qty: calcAutoQty(tmplItem.autoQty, newSqm) };
          }
          return item;
        });
        onUpdateRoom(room.id, "detailedItems", newItems);
      }
    }
  };

  const inputSmall = {
    background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 6,
    padding: "8px 10px", color: theme.text, fontSize: 16, textAlign: "right",
    outline: "none", fontFamily: "'JetBrains Mono', monospace", minHeight: 40,
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 150 }}>
          <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", letterSpacing: 1 }}>Room Type</label>
          <select value={roomType} onChange={(e) => handleRoomTypeChange(e.target.value)} style={{
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

      {isDetailed && room.detailedItems && (
        <div style={{ marginTop: 12 }}>
          {isMobile ? (
            // Mobile: card layout for each item
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {room.detailedItems.map((item, idx) => {
                const lineTotal = item.included ? item.qty * item.unitCost : 0;
                return (
                  <div key={item.key} style={{
                    background: theme.input, borderRadius: 8, padding: 12,
                    opacity: item.included ? 1 : 0.4,
                    border: `1px solid ${theme.inputBorder}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="checkbox" checked={item.included} onChange={(e) => updateItem(idx, "included", e.target.checked)}
                          style={{ cursor: "pointer", width: 22, height: 22 }}
                        />
                        <span style={{ fontSize: 13, color: theme.text, fontWeight: 500 }}>{item.label}</span>
                      </div>
                      <span style={{ fontSize: 10, color: theme.textDim }}>{UNIT_TYPES[item.unit]?.suffix || item.unit}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      <div>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Qty</label>
                        <input type="number" value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                          style={{ ...inputSmall, width: "100%" }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 10, color: theme.textDim }}>Unit Cost</label>
                        <input type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))}
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
            // Desktop: table layout
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
                    const lineTotal = item.included ? item.qty * item.unitCost : 0;
                    return (
                      <tr key={item.key} style={{ borderBottom: `1px solid ${theme.cardBorder}15`, opacity: item.included ? 1 : 0.4 }}>
                        <td style={{ padding: "4px 4px", textAlign: "center" }}>
                          <input type="checkbox" checked={item.included} onChange={(e) => updateItem(idx, "included", e.target.checked)} style={{ cursor: "pointer", width: 18, height: 18 }} />
                        </td>
                        <td style={{ padding: "4px 8px", color: theme.text }}>{item.label}</td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          <input type="number" value={item.qty} onChange={(e) => updateItem(idx, "qty", Number(e.target.value))}
                            style={{ ...inputSmall, width: 60 }}
                          />
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "center", fontSize: 10, color: theme.textDim }}>
                          {UNIT_TYPES[item.unit]?.suffix || item.unit}
                        </td>
                        <td style={{ padding: "4px 8px", textAlign: "right" }}>
                          <input type="number" value={item.unitCost} onChange={(e) => updateItem(idx, "unitCost", Number(e.target.value))}
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
