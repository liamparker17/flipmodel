import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createLeaveSchema,
  updateLeaveSchema,
  createPayslipSchema,
} from "@/lib/validations/hr";

// ---------------------------------------------------------------------------
// Mock setup
// ---------------------------------------------------------------------------

const mockPrisma = {
  employee: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  leaveRecord: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  payslip: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
  },
  orgMember: { findFirst: vi.fn() },
};

vi.mock("@/lib/db", () => ({ default: mockPrisma }));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/audit", () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
  diffChanges: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
  canAccessModule: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/field-encryption", () => ({
  encryptSensitiveFields: vi.fn((data: Record<string, unknown>) => data),
}));

const ORG_MEMBER = {
  id: "member-1",
  orgId: "org-1",
  userId: "user-1",
  role: "admin",
  departmentId: null,
  title: null,
  moduleOverrides: null,
  permissionOverrides: null,
  isActive: true,
  joinedAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.orgMember.findFirst.mockResolvedValue(ORG_MEMBER);
});

function makeRequest(body?: unknown, url = "http://localhost/api/hr") {
  return new Request(url, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  }) as unknown as import("next/server").NextRequest;
}

// ===========================================================================
// 1 - createEmployeeSchema validation
// ===========================================================================

describe("createEmployeeSchema", () => {
  const validEmployee = {
    employeeNumber: "EMP-001",
    firstName: "Jane",
    lastName: "Doe",
    startDate: "2026-01-15",
  };

  it("accepts valid employee with required fields only", () => {
    expect(createEmployeeSchema.safeParse(validEmployee).success).toBe(true);
  });

  it("rejects missing employeeNumber", () => {
    const { employeeNumber: _, ...rest } = validEmployee;
    expect(createEmployeeSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty employeeNumber", () => {
    expect(
      createEmployeeSchema.safeParse({ ...validEmployee, employeeNumber: "" }).success
    ).toBe(false);
  });

  it("rejects missing firstName", () => {
    const { firstName: _, ...rest } = validEmployee;
    expect(createEmployeeSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing lastName", () => {
    const { lastName: _, ...rest } = validEmployee;
    expect(createEmployeeSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing startDate", () => {
    const { startDate: _, ...rest } = validEmployee;
    expect(createEmployeeSchema.safeParse(rest).success).toBe(false);
  });

  it("accepts valid email", () => {
    const result = createEmployeeSchema.safeParse({
      ...validEmployee,
      email: "jane@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string email", () => {
    const result = createEmployeeSchema.safeParse({
      ...validEmployee,
      email: "",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email format", () => {
    const result = createEmployeeSchema.safeParse({
      ...validEmployee,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative baseSalary", () => {
    expect(
      createEmployeeSchema.safeParse({ ...validEmployee, baseSalary: -1000 }).success
    ).toBe(false);
  });

  it("accepts zero baseSalary", () => {
    expect(
      createEmployeeSchema.safeParse({ ...validEmployee, baseSalary: 0 }).success
    ).toBe(true);
  });

  it("rejects negative hourlyRate", () => {
    expect(
      createEmployeeSchema.safeParse({ ...validEmployee, hourlyRate: -50 }).success
    ).toBe(false);
  });

  it("accepts all optional fields", () => {
    const result = createEmployeeSchema.safeParse({
      ...validEmployee,
      email: "jane@example.com",
      phone: "+27821234567",
      idNumber: "9001015012084",
      taxNumber: "1234567890",
      position: "Developer",
      department: "Engineering",
      employmentType: "full_time",
      baseSalary: 45000,
      hourlyRate: 250,
      bankName: "FNB",
      accountNumber: "62345678901",
      branchCode: "250655",
      contactId: "contact-1",
      notes: "Senior hire",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 2 - createLeaveSchema validation
// ===========================================================================

describe("createLeaveSchema", () => {
  const validLeave = {
    employeeId: "emp-1",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
  };

  it("accepts valid leave request with required fields", () => {
    expect(createLeaveSchema.safeParse(validLeave).success).toBe(true);
  });

  it("rejects missing employeeId", () => {
    const { employeeId: _, ...rest } = validLeave;
    expect(createLeaveSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects empty employeeId", () => {
    expect(
      createLeaveSchema.safeParse({ ...validLeave, employeeId: "" }).success
    ).toBe(false);
  });

  it("rejects missing startDate", () => {
    const { startDate: _, ...rest } = validLeave;
    expect(createLeaveSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing endDate", () => {
    const { endDate: _, ...rest } = validLeave;
    expect(createLeaveSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-positive days when provided", () => {
    expect(
      createLeaveSchema.safeParse({ ...validLeave, days: 0 }).success
    ).toBe(false);
    expect(
      createLeaveSchema.safeParse({ ...validLeave, days: -1 }).success
    ).toBe(false);
  });

  it("accepts optional fields", () => {
    const result = createLeaveSchema.safeParse({
      ...validLeave,
      leaveType: "sick",
      days: 5,
      reason: "Flu",
      notes: "Doctor's note attached",
    });
    expect(result.success).toBe(true);
  });
});

// ===========================================================================
// 3 - createPayslipSchema validation
// ===========================================================================

describe("createPayslipSchema", () => {
  const validPayslip = {
    employeeId: "emp-1",
    periodStart: "2026-02-01",
    periodEnd: "2026-02-28",
    basePay: 30000,
  };

  it("accepts valid payslip with required fields", () => {
    expect(createPayslipSchema.safeParse(validPayslip).success).toBe(true);
  });

  it("rejects missing employeeId", () => {
    const { employeeId: _, ...rest } = validPayslip;
    expect(createPayslipSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing periodStart", () => {
    const { periodStart: _, ...rest } = validPayslip;
    expect(createPayslipSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects missing periodEnd", () => {
    const { periodEnd: _, ...rest } = validPayslip;
    expect(createPayslipSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects negative basePay", () => {
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, basePay: -1000 }).success
    ).toBe(false);
  });

  it("accepts zero basePay", () => {
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, basePay: 0 }).success
    ).toBe(true);
  });

  it("rejects negative deduction fields", () => {
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, paye: -500 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, uif: -50 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, pensionFund: -200 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, medicalAid: -100 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, otherDeductions: -10 }).success
    ).toBe(false);
  });

  it("rejects negative earning fields", () => {
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, overtime: -100 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, bonus: -100 }).success
    ).toBe(false);
    expect(
      createPayslipSchema.safeParse({ ...validPayslip, commission: -100 }).success
    ).toBe(false);
  });
});

// ===========================================================================
// 4 - Payslip calculation: gross = base + overtime + bonus + commission,
//     net = gross - deductions
// ===========================================================================

describe("POST /api/hr/payslips - payslip calculation", () => {
  it("calculates grossPay, totalDeductions, and netPay correctly", async () => {
    const { POST } = await import("@/api/hr/payslips/route");

    const body = {
      employeeId: "emp-1",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      basePay: 30000,
      overtime: 5000,
      bonus: 2000,
      commission: 3000,
      paye: 8000,
      uif: 300,
      pensionFund: 1500,
      medicalAid: 1000,
      otherDeductions: 200,
    };

    const expectedGross = 30000 + 5000 + 2000 + 3000; // 40000
    const expectedDeductions = 8000 + 300 + 1500 + 1000 + 200; // 11000
    const expectedNet = expectedGross - expectedDeductions; // 29000

    mockPrisma.payslip.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "ps-1", ...data })
    );

    const res = await POST(makeRequest(body, "http://localhost/api/hr/payslips"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.grossPay).toBe(expectedGross);
    expect(json.totalDeductions).toBe(expectedDeductions);
    expect(json.netPay).toBe(expectedNet);
  });

  it("handles payslip with zero optional earnings and deductions", async () => {
    const { POST } = await import("@/api/hr/payslips/route");

    const body = {
      employeeId: "emp-1",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      basePay: 25000,
    };

    mockPrisma.payslip.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "ps-2", ...data })
    );

    const res = await POST(makeRequest(body, "http://localhost/api/hr/payslips"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.grossPay).toBe(25000);
    expect(json.totalDeductions).toBe(0);
    expect(json.netPay).toBe(25000);
  });

  it("netPay can be negative when deductions exceed gross", async () => {
    const { POST } = await import("@/api/hr/payslips/route");

    const body = {
      employeeId: "emp-1",
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
      basePay: 1000,
      paye: 500,
      uif: 300,
      pensionFund: 400,
    };

    mockPrisma.payslip.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({ id: "ps-3", ...data })
    );

    const res = await POST(makeRequest(body, "http://localhost/api/hr/payslips"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.grossPay).toBe(1000);
    expect(json.totalDeductions).toBe(1200);
    expect(json.netPay).toBe(-200);
  });
});

// ===========================================================================
// 5 - Leave request approval / rejection
// ===========================================================================

describe("POST /api/hr/leave/[leaveId]/approve - leave approval", () => {
  it("approves a pending leave request", async () => {
    const { POST } = await import("@/api/hr/leave/[leaveId]/approve/route");

    mockPrisma.leaveRecord.findFirst.mockResolvedValue({
      id: "leave-1",
      orgId: "org-1",
      status: "pending",
    });

    const updated = {
      id: "leave-1",
      status: "approved",
      approvedBy: "user-1",
      approvedAt: new Date(),
    };
    mockPrisma.leaveRecord.update.mockResolvedValue(updated);

    const req = makeRequest(
      { action: "approve" },
      "http://localhost/api/hr/leave/leave-1/approve"
    );
    const params = { params: Promise.resolve({ leaveId: "leave-1" }) };
    const res = await POST(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("approved");
  });

  it("rejects a pending leave request", async () => {
    const { POST } = await import("@/api/hr/leave/[leaveId]/approve/route");

    mockPrisma.leaveRecord.findFirst.mockResolvedValue({
      id: "leave-1",
      orgId: "org-1",
      status: "pending",
    });

    const updated = {
      id: "leave-1",
      status: "rejected",
      approvedBy: "user-1",
      approvedAt: new Date(),
    };
    mockPrisma.leaveRecord.update.mockResolvedValue(updated);

    const req = makeRequest(
      { action: "reject" },
      "http://localhost/api/hr/leave/leave-1/approve"
    );
    const params = { params: Promise.resolve({ leaveId: "leave-1" }) };
    const res = await POST(req, params);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("rejected");
  });

  it("rejects invalid action value", async () => {
    const { POST } = await import("@/api/hr/leave/[leaveId]/approve/route");

    const req = makeRequest(
      { action: "cancel" },
      "http://localhost/api/hr/leave/leave-1/approve"
    );
    const params = { params: Promise.resolve({ leaveId: "leave-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("approve");
  });

  it("rejects approval of non-pending leave", async () => {
    const { POST } = await import("@/api/hr/leave/[leaveId]/approve/route");

    mockPrisma.leaveRecord.findFirst.mockResolvedValue({
      id: "leave-1",
      orgId: "org-1",
      status: "approved",
    });

    const req = makeRequest(
      { action: "approve" },
      "http://localhost/api/hr/leave/leave-1/approve"
    );
    const params = { params: Promise.resolve({ leaveId: "leave-1" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("not pending");
  });

  it("returns 404 when leave record not found", async () => {
    const { POST } = await import("@/api/hr/leave/[leaveId]/approve/route");

    mockPrisma.leaveRecord.findFirst.mockResolvedValue(null);

    const req = makeRequest(
      { action: "approve" },
      "http://localhost/api/hr/leave/leave-999/approve"
    );
    const params = { params: Promise.resolve({ leaveId: "leave-999" }) };
    const res = await POST(req, params);

    expect(res.status).toBe(404);
  });
});

// ===========================================================================
// 6 - Create employee route
// ===========================================================================

describe("POST /api/hr/employees - create employee", () => {
  it("creates employee and returns 201", async () => {
    const { POST } = await import("@/api/hr/employees/route");

    const body = {
      employeeNumber: "EMP-001",
      firstName: "Jane",
      lastName: "Doe",
      startDate: "2026-01-15",
    };

    const created = {
      id: "emp-new",
      orgId: "org-1",
      ...body,
      email: null,
      position: "",
      employmentType: "full_time",
      baseSalary: 0,
    };
    mockPrisma.employee.create.mockResolvedValue(created);

    const res = await POST(makeRequest(body, "http://localhost/api/hr/employees"));
    const json = await res.json();

    expect(res.status).toBe(201);
    expect(json.firstName).toBe("Jane");
    expect(json.employmentType).toBe("full_time");
  });

  it("returns 400 for invalid body", async () => {
    const { POST } = await import("@/api/hr/employees/route");

    const res = await POST(makeRequest({}, "http://localhost/api/hr/employees"));
    expect(res.status).toBe(400);
  });
});
