import { describe, it, expect } from "vitest";
import { calcAutoQty } from "../roomTemplates";

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
