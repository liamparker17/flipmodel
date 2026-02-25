import { describe, it, expect } from "vitest";
import {
  BUDGET_HARD_LIMIT_MULTIPLIER,
  BUDGET_WARNING_MULTIPLIER,
  BUDGET_ALERT_THRESHOLD,
  SA_VAT_RATE,
  DEFAULT_CURRENCY,
  LOGIN_MAX_ATTEMPTS,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "../constants";

describe("constants", () => {
  it("budget thresholds are in correct range", () => {
    expect(BUDGET_ALERT_THRESHOLD).toBeGreaterThan(0);
    expect(BUDGET_ALERT_THRESHOLD).toBeLessThan(1);
    expect(BUDGET_WARNING_MULTIPLIER).toBe(1.0);
    expect(BUDGET_HARD_LIMIT_MULTIPLIER).toBeGreaterThan(1.0);
  });

  it("pagination defaults are sensible", () => {
    expect(DEFAULT_PAGE_SIZE).toBeGreaterThan(0);
    expect(MAX_PAGE_SIZE).toBeGreaterThan(DEFAULT_PAGE_SIZE);
  });

  it("SA VAT rate is 15%", () => {
    expect(SA_VAT_RATE).toBe(0.15);
  });

  it("default currency is ZAR", () => {
    expect(DEFAULT_CURRENCY).toBe("ZAR");
  });

  it("login rate limit is reasonable", () => {
    expect(LOGIN_MAX_ATTEMPTS).toBeGreaterThanOrEqual(3);
    expect(LOGIN_MAX_ATTEMPTS).toBeLessThanOrEqual(10);
  });
});
