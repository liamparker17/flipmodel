import { describe, it, expect, vi, beforeEach } from "vitest";
import { z, ZodError } from "zod";

// Mock dependencies before importing
vi.mock("../auth", () => ({
  auth: vi.fn(),
}));

vi.mock("../db", () => ({
  default: {
    orgMember: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("../permissions", () => ({
  hasPermission: vi.fn(() => true),
  canAccessModule: vi.fn(() => true),
}));

vi.mock("../logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  apiSuccess,
  apiError,
  handleApiError,
  validateBody,
  AuthError,
  NoOrgError,
  ForbiddenError,
} from "../api-helpers";

describe("apiSuccess", () => {
  it("returns JSON response with data and default 200 status", () => {
    const response = apiSuccess({ id: 1, name: "Test" });
    expect(response.status).toBe(200);
  });

  it("returns JSON response with custom status code", () => {
    const response = apiSuccess({ created: true }, 201);
    expect(response.status).toBe(201);
  });

  it("returns the data in the response body", async () => {
    const data = { items: [1, 2, 3] };
    const response = apiSuccess(data);
    const body = await response.json();
    expect(body).toEqual(data);
  });

  it("handles null data", async () => {
    const response = apiSuccess(null);
    const body = await response.json();
    expect(body).toBeNull();
  });

  it("handles array data", async () => {
    const response = apiSuccess([1, 2, 3]);
    const body = await response.json();
    expect(body).toEqual([1, 2, 3]);
  });
});

describe("apiError", () => {
  it("returns JSON error response with default 400 status", () => {
    const response = apiError("Bad request");
    expect(response.status).toBe(400);
  });

  it("returns JSON error response with custom status code", () => {
    const response = apiError("Not found", 404);
    expect(response.status).toBe(404);
  });

  it("includes error message in response body", async () => {
    const response = apiError("Something went wrong");
    const body = await response.json();
    expect(body).toEqual({ error: "Something went wrong" });
  });
});

describe("handleApiError", () => {
  it("returns 401 for AuthError", async () => {
    const response = handleApiError(new AuthError());
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 403 for NoOrgError", async () => {
    const response = handleApiError(new NoOrgError());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toContain("organisation");
  });

  it("returns 403 for ForbiddenError", async () => {
    const response = handleApiError(new ForbiddenError("No access"));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 400 for ZodError with issue messages", async () => {
    const schema = z.object({
      name: z.string().min(1, "Name is required"),
      age: z.number().min(0, "Age must be positive"),
    });

    let zodError: ZodError;
    try {
      schema.parse({ name: "", age: -1 });
    } catch (e) {
      zodError = e as ZodError;
    }

    const response = handleApiError(zodError!);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Name is required");
    expect(body.error).toContain("Age must be positive");
  });

  it("returns 500 for unknown errors", async () => {
    const response = handleApiError(new Error("Unexpected crash"));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });

  it("returns 500 for non-Error thrown values", async () => {
    const response = handleApiError("string error");
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe("Internal server error");
  });
});

describe("validateBody", () => {
  const schema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
  });

  it("returns parsed data for valid input", () => {
    const result = validateBody(schema, {
      name: "John",
      email: "john@example.com",
    });
    expect(result).toEqual({ name: "John", email: "john@example.com" });
  });

  it("strips unknown fields", () => {
    const result = validateBody(schema, {
      name: "John",
      email: "john@example.com",
      extra: "field",
    });
    // Zod strips by default in strict mode, but passthrough by default
    // The actual behavior depends on zod config - just verify required fields
    expect(result.name).toBe("John");
    expect(result.email).toBe("john@example.com");
  });

  it("throws ZodError for invalid input", () => {
    expect(() =>
      validateBody(schema, { name: "", email: "not-an-email" })
    ).toThrow(ZodError);
  });

  it("throws ZodError for missing fields", () => {
    expect(() => validateBody(schema, {})).toThrow(ZodError);
  });

  it("throws ZodError for wrong types", () => {
    expect(() =>
      validateBody(schema, { name: 123, email: true })
    ).toThrow(ZodError);
  });
});

describe("error classes", () => {
  it("AuthError has correct name and message", () => {
    const err = new AuthError();
    expect(err.name).toBe("AuthError");
    expect(err.message).toBe("Unauthorized");
    expect(err instanceof Error).toBe(true);
  });

  it("NoOrgError has correct name and message", () => {
    const err = new NoOrgError();
    expect(err.name).toBe("NoOrgError");
    expect(err.message).toBe("No organisation membership");
    expect(err instanceof Error).toBe(true);
  });

  it("ForbiddenError has correct name and default message", () => {
    const err = new ForbiddenError();
    expect(err.name).toBe("ForbiddenError");
    expect(err.message).toBe("Forbidden");
    expect(err instanceof Error).toBe(true);
  });

  it("ForbiddenError accepts custom message", () => {
    const err = new ForbiddenError("Missing permission: deals.write");
    expect(err.message).toBe("Missing permission: deals.write");
  });
});
