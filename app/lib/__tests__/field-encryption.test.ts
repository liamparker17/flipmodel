import { describe, it, expect, vi, beforeEach } from "vitest";

// Set a test encryption key before importing
const TEST_KEY = "a".repeat(64); // 64 hex chars = 32 bytes

describe("field-encryption", () => {
  describe("with valid encryption key", () => {
    beforeEach(() => {
      vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);
    });

    it("encryptSensitiveFields and decryptSensitiveFields round-trip", async () => {
      const { encryptSensitiveFields, decryptSensitiveFields } = await import(
        "../field-encryption"
      );

      const data = {
        accountNumber: "1234567890",
        branchCode: "250655",
        name: "Test User",
      };

      const encrypted = encryptSensitiveFields(data);

      // Sensitive fields should be changed
      expect(encrypted.accountNumber).not.toBe("1234567890");
      expect(encrypted.branchCode).not.toBe("250655");
      // Non-sensitive fields should be untouched
      expect(encrypted.name).toBe("Test User");

      const decrypted = decryptSensitiveFields(encrypted);
      expect(decrypted.accountNumber).toBe("1234567890");
      expect(decrypted.branchCode).toBe("250655");
      expect(decrypted.name).toBe("Test User");
    });

    it("round-trips with custom field list", async () => {
      const { encryptSensitiveFields, decryptSensitiveFields } = await import(
        "../field-encryption"
      );

      const data = { secret: "my-secret", public: "visible" };
      const encrypted = encryptSensitiveFields(data, ["secret"]);
      expect(encrypted.secret).not.toBe("my-secret");
      expect(encrypted.public).toBe("visible");

      const decrypted = decryptSensitiveFields(encrypted, ["secret"]);
      expect(decrypted.secret).toBe("my-secret");
    });

    it("leaves non-string fields untouched", async () => {
      const { encryptSensitiveFields } = await import("../field-encryption");

      const data = { accountNumber: 12345, branchCode: null, other: true };
      const result = encryptSensitiveFields(data as any);
      // Non-string values should remain as-is
      expect(result.accountNumber).toBe(12345);
      expect(result.branchCode).toBeNull();
      expect(result.other).toBe(true);
    });

    it("leaves empty string fields untouched", async () => {
      const { encryptSensitiveFields } = await import("../field-encryption");

      const data = { accountNumber: "", branchCode: "" };
      const result = encryptSensitiveFields(data);
      expect(result.accountNumber).toBe("");
      expect(result.branchCode).toBe("");
    });

    it("does not modify the original object", async () => {
      const { encryptSensitiveFields } = await import("../field-encryption");

      const data = { accountNumber: "1234567890", branchCode: "250655" };
      const original = { ...data };
      encryptSensitiveFields(data);
      expect(data.accountNumber).toBe(original.accountNumber);
      expect(data.branchCode).toBe(original.branchCode);
    });
  });

  describe("with missing encryption key", () => {
    beforeEach(() => {
      vi.stubEnv("ENCRYPTION_KEY", "");
    });

    it("encryptSensitiveFields leaves values as-is when key is missing", async () => {
      // Force re-import to pick up new env
      vi.resetModules();
      const { encryptSensitiveFields } = await import("../field-encryption");

      const data = { accountNumber: "1234567890", branchCode: "250655" };
      const result = encryptSensitiveFields(data);
      // Should silently fail and leave data unchanged
      expect(result.accountNumber).toBe("1234567890");
      expect(result.branchCode).toBe("250655");
    });

    it("decryptSensitiveFields leaves values as-is when key is missing", async () => {
      vi.resetModules();
      const { decryptSensitiveFields } = await import("../field-encryption");

      const data = { accountNumber: "some-legacy-data", branchCode: "250655" };
      const result = decryptSensitiveFields(data);
      expect(result.accountNumber).toBe("some-legacy-data");
      expect(result.branchCode).toBe("250655");
    });
  });

  describe("maskSensitiveField", () => {
    it("masks a normal-length value showing last 4 chars", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField("1234567890")).toBe("****7890");
    });

    it("masks a short value (< 4 chars) with just asterisks", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField("abc")).toBe("****");
    });

    it("masks exactly 4-character value", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField("abcd")).toBe("****abcd");
    });

    it("handles null value", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField(null)).toBe("****");
    });

    it("handles undefined value", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField(undefined)).toBe("****");
    });

    it("handles empty string", async () => {
      const { maskSensitiveField } = await import("../field-encryption");
      expect(maskSensitiveField("")).toBe("****");
    });
  });
});
