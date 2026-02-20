"use client";
import { theme, NumInput, Card, Select } from "./theme";
import RoomBreakdown from "./RoomBreakdown";
import { detectRoomType } from "../data/roomTemplates";

export default function RoomsStep({ rooms, updateRoom, removeRoom, addRoom, isMobile }) {
  return (
    <div>
      <Card subtitle="Define each room in the property and its renovation scope. Toggle to Detailed mode for per-item breakdowns.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>
            {rooms.length} rooms &middot; {rooms.reduce((s, r) => s + r.sqm, 0)} sqm total
          </span>
          <button onClick={addRoom} style={{ background: theme.accent, color: "#000", border: "none", borderRadius: 8, padding: isMobile ? "10px 18px" : "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>+ Add Room</button>
        </div>
      </Card>
      {rooms.map((room) => (
        <Card key={room.id} style={{ padding: isMobile ? 12 : 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "2fr 1fr 1.5fr 1fr 30px", gap: isMobile ? 8 : 10, alignItems: "end" }}>
            <div style={isMobile ? { gridColumn: "1 / -1" } : {}}>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Room Name</label>
              <input value={room.name} onChange={(e) => {
                updateRoom(room.id, "name", e.target.value);
                // Auto-detect room type when name changes
                const detected = detectRoomType(e.target.value);
                if (detected !== room.roomType) updateRoom(room.id, "roomType", detected);
              }} style={{ background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8, padding: isMobile ? "10px 12px" : "6px 10px", color: theme.text, fontSize: isMobile ? 16 : 13, width: "100%", outline: "none" }} />
            </div>
            <NumInput label="Size (sqm)" value={room.sqm} onChange={(v) => updateRoom(room.id, "sqm", v)} prefix="" suffix="sqm" small isMobile={isMobile} />
            <Select label="Scope" value={room.scope} onChange={(v) => updateRoom(room.id, "scope", v)} options={[
              { value: "cosmetic", label: "Cosmetic (25%)" }, { value: "midLevel", label: "Mid-level (55%)" }, { value: "fullGut", label: "Full gut (100%)" },
            ]} />
            <NumInput label="Override (R)" value={room.customCost || ""} onChange={(v) => updateRoom(room.id, "customCost", v || null)} small isMobile={isMobile} />
            <button onClick={() => removeRoom(room.id)} style={{ background: "none", border: "none", color: theme.red, fontSize: 20, cursor: "pointer", padding: isMobile ? 8 : 0, marginBottom: 12 }}>x</button>
          </div>
          <RoomBreakdown room={room} onUpdateRoom={updateRoom} isMobile={isMobile} />
        </Card>
      ))}
    </div>
  );
}
