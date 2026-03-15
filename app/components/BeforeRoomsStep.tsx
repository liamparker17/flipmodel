// @ts-nocheck
"use client";
import { theme, NumInput, Card } from "./theme";
import { detectRoomType } from "../data/roomTemplates";
import type { BeforeRoom, RoomData } from "@/types/deal";

interface BeforeRoomsStepProps {
  rooms: BeforeRoom[];
  setRooms: (rooms: BeforeRoom[]) => void;
  defaultCeilingHeight: number;
  plannedRooms: RoomData[];
  isMobile: boolean;
}

function PropertyDeltaSummary({ before, after }: { before: BeforeRoom[]; after: RoomData[] }) {
  const countByType = (rooms: { roomType: string }[]) =>
    rooms.reduce((acc, r) => ({ ...acc, [r.roomType]: (acc[r.roomType] || 0) + 1 }), {} as Record<string, number>);
  const bc = countByType(before);
  const ac = countByType(after);
  const allTypes = [...new Set([...Object.keys(bc), ...Object.keys(ac)])];
  const bSqm = before.reduce((s, r) => s + r.sqm, 0);
  const aSqm = after.reduce((s, r) => s + r.sqm, 0);
  if (before.length === 0 || after.length === 0) return null;
  return (
    <div style={{ ...{ background: theme.card, border: `1px solid ${theme.cardBorder}`, borderRadius: 8 }, padding: 16, marginTop: 16 }}>
      <h4 style={{ margin: "0 0 8px", color: theme.text }}>Property Transformation</h4>
      {allTypes.map(type => {
        const diff = (ac[type] || 0) - (bc[type] || 0);
        if (diff === 0) return null;
        return (
          <div key={type} style={{ color: theme.text, fontSize: 13, marginBottom: 4 }}>
            {diff > 0 ? "+" : ""}{diff} {type}
          </div>
        );
      })}
      <div style={{ color: theme.accent, fontWeight: 600, marginTop: 4, fontSize: 13 }}>
        {aSqm - bSqm > 0 ? "+" : ""}{aSqm - bSqm} sqm total
      </div>
    </div>
  );
}

export default function BeforeRoomsStep({
  rooms,
  setRooms,
  defaultCeilingHeight,
  plannedRooms,
  isMobile,
}: BeforeRoomsStepProps) {
  const nextId = rooms.length > 0 ? Math.max(...rooms.map(r => r.id)) + 1 : 1;

  const addRoom = () => {
    const newRoom: BeforeRoom = {
      id: nextId,
      name: "Room",
      sqm: 10,
      ceilingHeight: null,
      condition: undefined,
      notes: "",
      roomType: "bedroom",
    };
    setRooms([...rooms, newRoom]);
  };

  const updateRoom = (id: number, key: string, value: unknown) => {
    setRooms(rooms.map(r => {
      if (r.id !== id) return r;
      const updated = { ...r, [key]: value };
      // Auto-detect roomType when name changes
      if (key === "name") {
        updated.roomType = detectRoomType(value as string);
      }
      return updated;
    }));
  };

  const removeRoom = (id: number) => {
    setRooms(rooms.filter(r => r.id !== id));
  };

  const totalSqm = rooms.reduce((s, r) => s + r.sqm, 0);

  return (
    <div>
      {/* Header card */}
      <Card subtitle="Document each room's current condition before renovation. Used to calculate the property transformation delta.">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: theme.textDim }}>
            {rooms.length} rooms &middot; {totalSqm} sqm total
          </span>
          <button
            onClick={addRoom}
            style={{
              background: theme.accent, color: "#000", border: "none", borderRadius: 8,
              padding: "10px 18px", fontSize: 13, fontWeight: 700, cursor: "pointer", minHeight: 44,
            }}
          >
            + Add Room
          </button>
        </div>
      </Card>

      {/* Empty state */}
      {rooms.length === 0 && (
        <Card>
          <div style={{ textAlign: "center", padding: "32px 0", color: theme.textDim, fontSize: 14 }}>
            No rooms added yet. Tap &quot;+ Add Room&quot; to document the current state of the property.
          </div>
        </Card>
      )}

      {/* Room grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: 16,
        marginTop: rooms.length > 0 ? 16 : 0,
      }}>
        {rooms.map(room => (
          <div
            key={room.id}
            style={{
              background: theme.card,
              border: `1px solid ${theme.cardBorder}`,
              borderRadius: 8,
              padding: isMobile ? 14 : 16,
            }}
          >
            {/* Room name */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Room Name
              </label>
              <input
                value={room.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRoom(room.id, "name", e.target.value)}
                style={{
                  background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
                  padding: "10px 12px", color: theme.text, fontSize: 16, width: "100%", outline: "none",
                  minHeight: 44, boxSizing: "border-box",
                }}
              />
            </div>

            {/* Size + Ceiling height */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <NumInput
                label="Size (sqm)"
                value={room.sqm}
                onChange={(v: number) => updateRoom(room.id, "sqm", v)}
                prefix=""
                suffix="sqm"
                small
                isMobile={isMobile}
              />
              <NumInput
                label={`Ceiling (m) ${room.ceilingHeight == null ? `[${defaultCeilingHeight}]` : ""}`}
                value={room.ceilingHeight ?? ""}
                onChange={(v: number) => updateRoom(room.id, "ceilingHeight", v || null)}
                prefix=""
                suffix="m"
                small
                isMobile={isMobile}
              />
            </div>

            {/* Condition dropdown */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Condition (optional)
              </label>
              <select
                value={room.condition ?? ""}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  updateRoom(room.id, "condition", e.target.value || undefined)
                }
                style={{
                  background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
                  padding: "10px 12px", color: room.condition ? theme.text : theme.textDim,
                  fontSize: 14, width: "100%", outline: "none", minHeight: 44, cursor: "pointer",
                }}
              >
                <option value="">— Select condition —</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="derelict">Derelict</option>
              </select>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: theme.textDim, textTransform: "uppercase", display: "block", marginBottom: 4 }}>
                Notes
              </label>
              <textarea
                value={room.notes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateRoom(room.id, "notes", e.target.value)}
                rows={2}
                placeholder="e.g. cracked tiles, damp walls, needs rewiring..."
                style={{
                  background: theme.input, border: `1px solid ${theme.inputBorder}`, borderRadius: 8,
                  padding: "10px 12px", color: theme.text, fontSize: 13, width: "100%", outline: "none",
                  resize: "vertical", boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
            </div>

            {/* Remove button */}
            <button
              onClick={() => removeRoom(room.id)}
              style={{
                background: theme.red, border: "none", color: "#fff", fontSize: 13,
                cursor: "pointer", borderRadius: 8, padding: "8px 16px", minHeight: 36,
                fontWeight: 600,
              }}
            >
              Remove Room
            </button>
          </div>
        ))}
      </div>

      {/* Property delta summary */}
      <PropertyDeltaSummary before={rooms} after={plannedRooms} />
    </div>
  );
}
