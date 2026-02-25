import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "../logger";

describe("logger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("logs info messages as JSON", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test message", { key: "value" });
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("info");
    expect(output.message).toBe("test message");
    expect(output.key).toBe("value");
    expect(output.timestamp).toBeDefined();
  });

  it("logs error messages to stderr", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.error("error occurred", { code: 500 });
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("error");
    expect(output.message).toBe("error occurred");
    expect(output.code).toBe(500);
  });

  it("logs warn messages", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    logger.warn("warning");
    expect(spy).toHaveBeenCalledOnce();
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(output.level).toBe("warn");
  });

  it("includes ISO timestamp", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test");
    const output = JSON.parse(spy.mock.calls[0][0]);
    expect(() => new Date(output.timestamp)).not.toThrow();
    expect(new Date(output.timestamp).toISOString()).toBe(output.timestamp);
  });
});
