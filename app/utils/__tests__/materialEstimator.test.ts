import { describe, it, expect } from "vitest";
import {
  estimateMaterials,
  calcSupplierTotal,
  SUPPLIER_MULTIPLIERS,
} from "../materialEstimator";

describe("estimateMaterials", () => {
  describe("quick mode", () => {
    it("generates material categories for quick mode with default sqm", () => {
      const result = estimateMaterials([], { totalSqm: 180 }, "quick");

      // Should have multiple material categories
      expect(result.length).toBeGreaterThan(0);

      const categoryNames = result.map((c) => c.category);
      expect(categoryNames).toContain("tiles");
      expect(categoryNames).toContain("paint");
      expect(categoryNames).toContain("plumbing");
      expect(categoryNames).toContain("electrical");
      expect(categoryNames).toContain("flooring");
      expect(categoryNames).toContain("hardware");
    });

    it("uses default 180 sqm when totalSqm is missing", () => {
      const result1 = estimateMaterials([], {}, "quick");
      const result2 = estimateMaterials([], { totalSqm: 180 }, "quick");

      // Both should produce the same output
      expect(result1.length).toBe(result2.length);
    });

    it("scales material quantities with property size", () => {
      const small = estimateMaterials([], { totalSqm: 80 }, "quick");
      const large = estimateMaterials([], { totalSqm: 300 }, "quick");

      const smallPaint = small.find((c) => c.category === "paint");
      const largePaint = large.find((c) => c.category === "paint");

      // Larger property should need more paint
      const smallWallBuckets = smallPaint!.items[0].qty;
      const largeWallBuckets = largePaint!.items[0].qty;
      expect(largeWallBuckets).toBeGreaterThan(smallWallBuckets);
    });
  });

  describe("advanced mode with rooms", () => {
    it("generates tile materials for bathroom rooms", () => {
      const rooms = [
        { sqm: 8, roomType: "bathroom" },
        { sqm: 12, roomType: "bedroom" },
      ];

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const tiles = result.find((c) => c.category === "tiles");
      expect(tiles).toBeDefined();
      expect(tiles!.items.length).toBeGreaterThan(0);
    });

    it("generates plumbing materials for bathroom and kitchen rooms", () => {
      const rooms = [
        { sqm: 8, roomType: "bathroom" },
        { sqm: 15, roomType: "kitchen" },
      ];

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const plumbing = result.find((c) => c.category === "plumbing");
      expect(plumbing).toBeDefined();

      // 1 toilet (bathroom only)
      expect(plumbing!.items[0].qty).toBe(1);
      // 2 basins (1 bathroom + 1 kitchen)
      expect(plumbing!.items[1].qty).toBe(2);
      // 3 taps (2 bathroom + 1 kitchen)
      expect(plumbing!.items[2].qty).toBe(3);
    });

    it("generates flooring for bedroom and lounge rooms", () => {
      const rooms = [
        { sqm: 16, roomType: "bedroom" },
        { sqm: 25, roomType: "lounge" },
      ];

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const flooring = result.find((c) => c.category === "flooring");
      expect(flooring).toBeDefined();

      // Laminate sqm should be ceil((16 + 25) * 1.10) = ceil(45.1) = 46
      expect(flooring!.items[0].qty).toBe(46);
    });

    it("calculates electrical points per room type", () => {
      const rooms = [
        { sqm: 16, roomType: "bedroom" },   // 4 points
        { sqm: 8, roomType: "bathroom" },    // 2 points
        { sqm: 20, roomType: "kitchen" },    // 8 points
      ];

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const electrical = result.find((c) => c.category === "electrical");
      expect(electrical).toBeDefined();

      // Total points = 4 + 2 + 8 = 14
      // Switches = ceil(14 * 0.4) = ceil(5.6) = 6
      expect(electrical!.items[0].qty).toBe(6);
      // Sockets = ceil(14 * 0.6) = ceil(8.4) = 9
      expect(electrical!.items[1].qty).toBe(9);
    });

    it("generates waterproofing only when bathrooms exist", () => {
      const noBathrooms = [{ sqm: 16, roomType: "bedroom" }];
      const withBathroom = [{ sqm: 8, roomType: "bathroom" }];

      const result1 = estimateMaterials(noBathrooms as any, { totalSqm: 100 }, "advanced");
      const result2 = estimateMaterials(withBathroom as any, { totalSqm: 100 }, "advanced");

      expect(result1.find((c) => c.category === "waterproofing")).toBeUndefined();
      expect(result2.find((c) => c.category === "waterproofing")).toBeDefined();
    });

    it("generates doors for bedroom, bathroom, lounge, and other room types", () => {
      const rooms = [
        { sqm: 16, roomType: "bedroom" },   // 1 door
        { sqm: 8, roomType: "bathroom" },    // 1 door
        { sqm: 20, roomType: "lounge" },     // 1 door
      ];

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const doors = result.find((c) => c.category === "doors_windows");
      expect(doors).toBeDefined();
      // 3 doors total
      expect(doors!.items[0].qty).toBe(3);
    });

    it("does not generate doors category for kitchen-only rooms", () => {
      const rooms = [{ sqm: 20, roomType: "kitchen" }]; // 0 doors

      const result = estimateMaterials(rooms as any, { totalSqm: 100 }, "advanced");
      const doors = result.find((c) => c.category === "doors_windows");
      expect(doors).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it("handles empty rooms in advanced mode (falls through to quick calculation)", () => {
      const result = estimateMaterials([], { totalSqm: 100 }, "advanced");
      // With 0 rooms, the function uses quick-mode fallback
      expect(result.length).toBeGreaterThan(0);
    });

    it("all items have positive qty and totalCost", () => {
      const result = estimateMaterials([], { totalSqm: 180 }, "quick");
      for (const category of result) {
        for (const item of category.items) {
          expect(item.qty).toBeGreaterThanOrEqual(0);
          expect(item.totalCost).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("totalCost equals qty * unitPrice for each item", () => {
      const result = estimateMaterials([], { totalSqm: 180 }, "quick");
      for (const category of result) {
        for (const item of category.items) {
          expect(item.totalCost).toBe(item.qty * item.unitPrice);
        }
      }
    });
  });
});

describe("calcSupplierTotal", () => {
  const materials = estimateMaterials([], { totalSqm: 180 }, "quick");

  it("applies no multiplier for leroymerlin (1.0)", () => {
    const total = calcSupplierTotal(materials, "leroymerlin");
    // Manually sum all item totalCosts
    let expected = 0;
    for (const cat of materials) {
      for (const item of cat.items) {
        expected += item.totalCost;
      }
    }
    expect(total).toBe(Math.round(expected));
  });

  it("applies builders multiplier (1.03)", () => {
    const base = calcSupplierTotal(materials, "leroymerlin");
    const builders = calcSupplierTotal(materials, "builders");
    expect(builders).toBeGreaterThan(base);
  });

  it("applies cashbuild multiplier (0.97)", () => {
    const base = calcSupplierTotal(materials, "leroymerlin");
    const cashbuild = calcSupplierTotal(materials, "cashbuild");
    expect(cashbuild).toBeLessThan(base);
  });

  it("defaults to multiplier 1.0 for unknown supplier", () => {
    const base = calcSupplierTotal(materials, "leroymerlin");
    const unknown = calcSupplierTotal(materials, "unknown_supplier");
    expect(unknown).toBe(base);
  });

  it("returns 0 for empty materials", () => {
    expect(calcSupplierTotal([], "leroymerlin")).toBe(0);
  });
});

describe("SUPPLIER_MULTIPLIERS", () => {
  it("has expected supplier keys", () => {
    expect(SUPPLIER_MULTIPLIERS).toHaveProperty("leroymerlin");
    expect(SUPPLIER_MULTIPLIERS).toHaveProperty("builders");
    expect(SUPPLIER_MULTIPLIERS).toHaveProperty("cashbuild");
  });
});
