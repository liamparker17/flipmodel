import { describe, it, expect, beforeAll, vi } from "vitest";

// Set a test encryption key before importing
const TEST_KEY = "a".repeat(64); // 64 hex chars = 32 bytes
vi.stubEnv("ENCRYPTION_KEY", TEST_KEY);

import { encrypt, decrypt, isEncrypted } from "../encryption";

describe("encryption", () => {
  it("encrypts and decrypts a string correctly", () => {
    const plaintext = "Hello, World!";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("produces different ciphertext for same input (random IV)", () => {
    const plaintext = "Same input";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
  });

  it("handles empty string", () => {
    const encrypted = encrypt("");
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe("");
  });

  it("handles unicode characters", () => {
    const plaintext = "South African Rand: R1,000.00 / Tshiluba";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it("handles long strings", () => {
    const plaintext = "x".repeat(10000);
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});

describe("isEncrypted", () => {
  it("returns true for encrypted strings", () => {
    const encrypted = encrypt("test");
    expect(isEncrypted(encrypted)).toBe(true);
  });

  it("returns false for plain strings", () => {
    expect(isEncrypted("hello")).toBe(false);
    expect(isEncrypted("")).toBe(false);
  });

  it("returns false for short strings", () => {
    expect(isEncrypted("abc")).toBe(false);
  });
});
