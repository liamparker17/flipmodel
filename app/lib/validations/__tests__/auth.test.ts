import { describe, it, expect } from "vitest";
import { signupSchema, loginSchema } from "../auth";

describe("signupSchema", () => {
  const validSignup = {
    name: "Liam Palmer",
    email: "liam@flipmodel.co.za",
    password: "SecurePass1",
    company: "FlipModel",
  };

  it("accepts valid signup data", () => {
    const result = signupSchema.safeParse(validSignup);
    expect(result.success).toBe(true);
  });

  it("accepts signup without optional company", () => {
    const { company, ...withoutCompany } = validSignup;
    const result = signupSchema.safeParse(withoutCompany);
    expect(result.success).toBe(true);
  });

  it("rejects empty name", () => {
    const result = signupSchema.safeParse({ ...validSignup, name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Name is required");
    }
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({ ...validSignup, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Invalid email");
    }
  });

  it("rejects missing email", () => {
    const { email, ...noEmail } = validSignup;
    const result = signupSchema.safeParse(noEmail);
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 10 characters", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "Short1Aa" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("at least 10 characters");
    }
  });

  it("rejects password without uppercase letter", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "alllowercase1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("uppercase");
    }
  });

  it("rejects password without lowercase letter", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "ALLUPPERCASE1" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("lowercase");
    }
  });

  it("rejects password without a number", () => {
    const result = signupSchema.safeParse({ ...validSignup, password: "NoNumbersHere" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(" ");
      expect(messages).toContain("number");
    }
  });

  it("rejects missing required fields entirely", () => {
    const result = signupSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("rejects name exceeding 100 characters", () => {
    const result = signupSchema.safeParse({ ...validSignup, name: "A".repeat(101) });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  const validLogin = {
    email: "liam@flipmodel.co.za",
    password: "anypassword",
  };

  it("accepts valid login data", () => {
    const result = loginSchema.safeParse(validLogin);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({ ...validLogin, email: "bad" });
    expect(result.success).toBe(false);
  });

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ ...validLogin, password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Password is required");
    }
  });

  it("rejects missing fields", () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
