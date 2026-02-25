import { describe, it, expect } from "vitest";
import { diffChanges } from "../audit";

describe("diffChanges", () => {
  it("detects changed fields", () => {
    const original = { name: "Old", amount: 100, status: "draft" };
    const updated = { name: "New", amount: 200, status: "draft" };
    const result = diffChanges(original, updated, ["name", "amount", "status"]);
    expect(result).toEqual({
      name: { old: "Old", new: "New" },
      amount: { old: 100, new: 200 },
    });
  });

  it("returns undefined when no changes", () => {
    const original = { name: "Same", amount: 100 };
    const updated = { name: "Same", amount: 100 };
    const result = diffChanges(original, updated, ["name", "amount"]);
    expect(result).toBeUndefined();
  });

  it("ignores fields not in the fields list", () => {
    const original = { name: "Old", secret: "hidden" };
    const updated = { name: "New", secret: "changed" };
    const result = diffChanges(original, updated, ["name"]);
    expect(result).toEqual({ name: { old: "Old", new: "New" } });
    expect(result?.secret).toBeUndefined();
  });

  it("handles undefined values in updated (field not being changed)", () => {
    const original = { name: "Old", amount: 100 };
    const updated = { name: "New" };
    const result = diffChanges(original, updated as any, ["name", "amount"]);
    expect(result).toEqual({ name: { old: "Old", new: "New" } });
  });

  it("handles null to value changes", () => {
    const original = { note: null };
    const updated = { note: "Added note" };
    const result = diffChanges(original as any, updated, ["note"]);
    expect(result).toEqual({ note: { old: null, new: "Added note" } });
  });

  it("handles nested objects via JSON comparison", () => {
    const original = { data: { a: 1, b: 2 } };
    const updated = { data: { a: 1, b: 3 } };
    const result = diffChanges(original as any, updated as any, ["data"]);
    expect(result).toBeDefined();
    expect(result!.data.old).toEqual({ a: 1, b: 2 });
    expect(result!.data.new).toEqual({ a: 1, b: 3 });
  });
});
