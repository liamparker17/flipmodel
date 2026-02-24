// @ts-nocheck
"use client";
import { theme, NumInput, Card, Select } from "./theme";
import RoomBreakdown from "./RoomBreakdown";
import { detectRoomType } from "../data/roomTemplates";

interface Room {
  id: number;
  name: string;
  sqm: number;
  scope: string;
  customCost: number | null;
  roomType?: string;
  [key: string]: unknown;
}

interface RoomsStepProps {
  rooms: Room[];
  updateRoom: (id: number, key: string, value: unknown) => void;
  removeRoom: (id: number) => void;
  addRoom: () => void;
  isMobile: boolean;
}

export default function RoomsStep({ rooms, updateRoom, removeRoom, addRoom, isMobile }: RoomsStepProps) {
  return (
    <div>
      <Card subtitle="Define each room in the property and its renovation scope. Toggle to Detailed mode for per-item breakdowns.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>
            {rooms.length} rooms &middot; {rooms.reduce((s, r) => s + r.sqm, 0)} sqm total
          </span>
          <button onClick={addRoom} style={{
            background: theme.accent, color: "#000", border: "none", borderRadius: 8,
            padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
          }}>+ Add Room</button>
        </div>
      </Card>

      {rooms.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
            No rooms added yet. Tap &quot;+ Add Room&quot; to get started.
          </div>
        </Card>
      )}

      {rooms.map((room) => (
        <Card key={room.id} style={{ padding: isMobile ? 14 : 16 }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1.5fr 1fr 44px",
            gap: isMobile ? 10 : 10, alignItems: "end",
          }}>
            <div>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase" }}>Room Name</label>
              <input value={room.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                updateRoom(room.id, "name", e.target.value);
                const detected = detectRoomType(e.target.value);
                if (detected !== room.roomType) updateRoom(room.id, "roomType", detected);
              }} style={{
                background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
                padding: "10px 12px", color: theme.text, fontSize: 16, width: "100%", outline: "none",
                minHeight: 44,
              }} />
            </div>
            <NumInput label="Size (sqm)" value={room.sqm} onChange={(v: number) => updateRoom(room.id, "sqm", v)} prefix="" suffix="sqm" small isMobile={isMobile} />
            <Select label="Scope" value={room.scope} onChange={(v: string) => updateRoom(room.id, "scope", v)} options={[
              { value: "cosmetic", label: isMobile ? "Cosmetic" : "Cosmetic (25%)" },
              { value: "midLevel", label: isMobile ? "Mid-level" : "Mid-level (55%)" },
              { value: "fullGut", label: isMobile ? "Full gut" : "Full gut (100%)" },
            ]} />
            {isMobile ? (
              <div style={{ display: "flex", gap: 10, alignItems: "end" }}>
                <div style={{ flex: 1 }}>
                  <NumInput label="Override (R)" value={room.customCost || ""} onChange={(v: number) => updateRoom(room.id, "customCost", v || null)} small isMobile={isMobile} />
                </div>
                <button onClick={() => removeRoom(room.id)} style={{
                  background: theme.red, border: "none", color: "#fff", fontSize: 16,
                  cursor: "pointer", width: 44, height: 44, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  marginBottom: 6,
                }}>x</button>
              </div>
            ) : (
              <>
                <NumInput label="Override (R)" value={room.customCost || ""} onChange={(v: number) => updateRoom(room.id, "customCost", v || null)} small isMobile={isMobile} />
                <button onClick={() => removeRoom(room.id)} style={{
                  background: theme.red, border: "none", color: "#fff", fontSize: 16,
                  cursor: "pointer", width: 44, height: 44, borderRadius: 8,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 12,
                }}>x</button>
              </>
            )}
          </div>
          <RoomBreakdown room={room} onUpdateRoom={updateRoom} isMobile={isMobile} />
        </Card>
      ))}
    </div>
  );
}
