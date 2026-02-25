import { describe, it, expect } from "vitest";
import { parsePagination, paginatedResult } from "../pagination";

function mockRequest(params: Record<string, string> = {}) {
  const url = new URL("http://localhost:3000/api/test");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }
  return { nextUrl: url } as any;
}

describe("parsePagination", () => {
  it("returns defaults when no params provided", () => {
    const result = parsePagination(mockRequest());
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.skip).toBe(0);
  });

  it("parses page and limit from query params", () => {
    const result = parsePagination(mockRequest({ page: "3", limit: "25" }));
    expect(result.page).toBe(3);
    expect(result.limit).toBe(25);
    expect(result.skip).toBe(50);
  });

  it("clamps page to minimum of 1", () => {
    const result = parsePagination(mockRequest({ page: "0" }));
    expect(result.page).toBe(1);
  });

  it("clamps page to minimum of 1 for negative values", () => {
    const result = parsePagination(mockRequest({ page: "-5" }));
    expect(result.page).toBe(1);
  });

  it("clamps limit to maximum of 200", () => {
    const result = parsePagination(mockRequest({ limit: "500" }));
    expect(result.limit).toBe(200);
  });

  it("falls back to default limit for zero", () => {
    const result = parsePagination(mockRequest({ limit: "0" }));
    expect(result.limit).toBe(50); // 0 is falsy, falls back to DEFAULT_LIMIT
  });

  it("handles non-numeric values gracefully", () => {
    const result = parsePagination(mockRequest({ page: "abc", limit: "xyz" }));
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
  });

  it("calculates skip correctly for page 2", () => {
    const result = parsePagination(mockRequest({ page: "2", limit: "10" }));
    expect(result.skip).toBe(10);
  });
});

describe("paginatedResult", () => {
  it("returns correct pagination metadata", () => {
    const data = [{ id: 1 }, { id: 2 }];
    const result = paginatedResult(data, 100, { page: 1, limit: 10, skip: 0 });
    expect(result.data).toEqual(data);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(10);
    expect(result.pagination.total).toBe(100);
    expect(result.pagination.totalPages).toBe(10);
    expect(result.pagination.hasMore).toBe(true);
  });

  it("returns hasMore false on last page", () => {
    const result = paginatedResult([], 20, { page: 2, limit: 10, skip: 10 });
    expect(result.pagination.hasMore).toBe(false);
    expect(result.pagination.totalPages).toBe(2);
  });

  it("handles zero total", () => {
    const result = paginatedResult([], 0, { page: 1, limit: 10, skip: 0 });
    expect(result.pagination.total).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
    expect(result.pagination.hasMore).toBe(false);
  });

  it("handles single page", () => {
    const result = paginatedResult([{ id: 1 }], 1, { page: 1, limit: 50, skip: 0 });
    expect(result.pagination.totalPages).toBe(1);
    expect(result.pagination.hasMore).toBe(false);
  });
});
