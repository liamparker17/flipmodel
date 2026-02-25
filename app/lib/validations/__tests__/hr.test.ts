import { describe, it, expect } from "vitest";
import {
  createEmployeeSchema,
  updateEmployeeSchema,
  createLeaveSchema,
  updateLeaveSchema,
  createPayslipSchema,
  updatePayslipSchema,
} from "../hr";

describe("createEmployeeSchema", () => {
  it("accepts valid employee data", () => {
    const result = createEmployeeSchema.safeParse({
      employeeNumber: "EMP-001",
      firstName: "John",
      lastName: "Doe",
      startDate: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("accepts full employee data with optional fields", () => {
    const result = createEmployeeSchema.safeParse({
      employeeNumber: "EMP-002",
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@example.com",
      phone: "+27821234567",
      idNumber: "9001015800086",
      taxNumber: "1234567890",
      position: "Site Manager",
      department: "Operations",
      employmentType: "full_time",
      startDate: "2026-02-01",
      baseSalary: 35000,
      hourlyRate: 200,
      bankName: "FNB",
      accountNumber: "62012345678",
      branchCode: "250655",
      contactId: "contact-123",
      notes: "Senior hire",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string email", () => {
    const result = createEmployeeSchema.safeParse({
      employeeNumber: "EMP-003",
      firstName: "Test",
      lastName: "User",
      email: "",
      startDate: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(createEmployeeSchema.safeParse({}).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ employeeNumber: "EMP-001" }).success).toBe(false);
    expect(createEmployeeSchema.safeParse({ firstName: "John", lastName: "Doe" }).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    const result = createEmployeeSchema.safeParse({
      employeeNumber: "EMP-001",
      firstName: "John",
      lastName: "Doe",
      email: "not-an-email",
      startDate: "2026-01-15",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative salary", () => {
    const result = createEmployeeSchema.safeParse({
      employeeNumber: "EMP-001",
      firstName: "John",
      lastName: "Doe",
      startDate: "2026-01-15",
      baseSalary: -5000,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateEmployeeSchema", () => {
  it("accepts partial updates", () => {
    expect(updateEmployeeSchema.safeParse({ firstName: "Updated" }).success).toBe(true);
    expect(updateEmployeeSchema.safeParse({ baseSalary: 40000 }).success).toBe(true);
    expect(updateEmployeeSchema.safeParse({}).success).toBe(true);
  });
});

describe("createLeaveSchema", () => {
  it("accepts valid leave request", () => {
    const result = createLeaveSchema.safeParse({
      employeeId: "emp-123",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      days: 5,
      leaveType: "annual",
      reason: "Holiday",
    });
    expect(result.success).toBe(true);
  });

  it("accepts minimal leave request", () => {
    const result = createLeaveSchema.safeParse({
      employeeId: "emp-123",
      startDate: "2026-03-01",
      endDate: "2026-03-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing employeeId", () => {
    const result = createLeaveSchema.safeParse({
      startDate: "2026-03-01",
      endDate: "2026-03-05",
    });
    expect(result.success).toBe(false);
  });

  it("rejects zero or negative days", () => {
    const result = createLeaveSchema.safeParse({
      employeeId: "emp-123",
      startDate: "2026-03-01",
      endDate: "2026-03-05",
      days: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLeaveSchema", () => {
  it("accepts partial updates without employeeId", () => {
    expect(updateLeaveSchema.safeParse({ leaveType: "sick" }).success).toBe(true);
    expect(updateLeaveSchema.safeParse({ days: 3 }).success).toBe(true);
    expect(updateLeaveSchema.safeParse({}).success).toBe(true);
  });
});

describe("createPayslipSchema", () => {
  it("accepts valid payslip data", () => {
    const result = createPayslipSchema.safeParse({
      employeeId: "emp-123",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      basePay: 25000,
      paye: 4500,
      uif: 250,
    });
    expect(result.success).toBe(true);
  });

  it("accepts full payslip with all deductions", () => {
    const result = createPayslipSchema.safeParse({
      employeeId: "emp-123",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      basePay: 35000,
      overtime: 2500,
      bonus: 5000,
      commission: 1000,
      paye: 8500,
      uif: 350,
      pensionFund: 2625,
      medicalAid: 3200,
      otherDeductions: 500,
      notes: "January payslip",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    expect(createPayslipSchema.safeParse({}).success).toBe(false);
    expect(createPayslipSchema.safeParse({ employeeId: "emp-123" }).success).toBe(false);
    expect(createPayslipSchema.safeParse({
      employeeId: "emp-123",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
    }).success).toBe(false);
  });

  it("rejects negative basePay", () => {
    const result = createPayslipSchema.safeParse({
      employeeId: "emp-123",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      basePay: -1000,
    });
    expect(result.success).toBe(false);
  });
});

describe("updatePayslipSchema", () => {
  it("accepts partial updates without employeeId", () => {
    expect(updatePayslipSchema.safeParse({ basePay: 30000 }).success).toBe(true);
    expect(updatePayslipSchema.safeParse({ paye: 5000, uif: 300 }).success).toBe(true);
    expect(updatePayslipSchema.safeParse({}).success).toBe(true);
  });
});
