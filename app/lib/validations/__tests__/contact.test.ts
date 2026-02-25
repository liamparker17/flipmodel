import { describe, it, expect } from "vitest";
import { createContactSchema, updateContactSchema } from "../contact";

describe("createContactSchema", () => {
  it("accepts minimal valid contact", () => {
    const result = createContactSchema.safeParse({ name: "John Smith" });
    expect(result.success).toBe(true);
  });

  it("accepts contact with all fields", () => {
    const result = createContactSchema.safeParse({
      name: "Jane Doe",
      role: "contractor",
      company: "Doe Construction",
      phone: "+27821234567",
      email: "jane@doe.co.za",
      notes: "Excellent plumber",
      profession: "plumber",
      dailyRate: 1500,
      bankName: "FNB",
      accountNumber: "62012345678",
      branchCode: "250655",
      accountType: "cheque",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = createContactSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = createContactSchema.safeParse({
      name: "Test",
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty string email", () => {
    const result = createContactSchema.safeParse({
      name: "Test",
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("accepts undefined email", () => {
    const result = createContactSchema.safeParse({
      name: "Test",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateContactSchema", () => {
  it("accepts partial updates", () => {
    const result = updateContactSchema.safeParse({ phone: "+27829876543" });
    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateContactSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
