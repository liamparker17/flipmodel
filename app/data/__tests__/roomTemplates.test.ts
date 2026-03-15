import { describe, it, expect } from "vitest";
import { calcAutoQty, generateRoomsFromProperty } from "../roomTemplates";

describe("calcAutoQty", () => {
  it("calculates sqm unchanged", () => {
    expect(calcAutoQty("sqm", 16)).toBe(16);
  });
  it("calculates linear meters from perimeter", () => {
    expect(calcAutoQty("lm", 16)).toBe(16);
  });
  it("calculates wall area with default ceiling height 2.4m", () => {
    expect(calcAutoQty("wallArea", 16)).toBe(38.4);
  });
  it("calculates wall area with custom ceiling height", () => {
    expect(calcAutoQty("wallArea", 16, 3.0)).toBe(48);
  });
  it("deducts door sqm from wall area", () => {
    expect(calcAutoQty("wallArea", 16, 2.4, 1.9)).toBe(36.5);
  });
  it("deducts window sqm from wall area", () => {
    expect(calcAutoQty("wallArea", 16, 2.4, 0, 2.88)).toBe(35.5);
  });
  it("deducts both doors and windows", () => {
    expect(calcAutoQty("wallArea", 16, 2.4, 1.9, 2.88)).toBe(33.6);
  });
  it("never returns negative wall area", () => {
    expect(calcAutoQty("wallArea", 4, 2.4, 50, 50)).toBe(0);
  });
  it("returns fixed number for numeric autoQty", () => {
    expect(calcAutoQty(3, 16)).toBe(3);
  });
});

describe("generateRoomsFromProperty", () => {
  it("generates rooms matching property details", () => {
    const rooms = generateRoomsFromProperty({ bedrooms: 3, bathrooms: 2, garages: 1 });
    const types = rooms.map(r => r.roomType);
    expect(types.filter(t => t === "bedroom")).toHaveLength(3);
    expect(types.filter(t => t === "bathroom")).toHaveLength(2);
    expect(types).toContain("kitchen");
    expect(types).toContain("lounge");
    expect(types).toContain("garage");
  });
  it("omits garage when garages is 0", () => {
    const rooms = generateRoomsFromProperty({ bedrooms: 2, bathrooms: 1, garages: 0 });
    expect(rooms.map(r => r.roomType)).not.toContain("garage");
  });
  it("returns valid RoomData objects", () => {
    const rooms = generateRoomsFromProperty({ bedrooms: 3, bathrooms: 2, garages: 1 });
    for (const room of rooms) {
      expect(room.id).toBeGreaterThan(0);
      expect(room.sqm).toBeGreaterThan(0);
      expect(room.breakdownMode).toBe("simple");
      expect(room.customCost).toBeNull();
    }
  });
});
