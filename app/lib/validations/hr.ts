import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeNumber: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  idNumber: z.string().optional(),
  taxNumber: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  employmentType: z.string().optional(),
  startDate: z.string().min(1),
  baseSalary: z.number().min(0).optional(),
  hourlyRate: z.number().min(0).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  branchCode: z.string().optional(),
  contactId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const createLeaveSchema = z.object({
  employeeId: z.string().min(1),
  leaveType: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  days: z.number().positive().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const updateLeaveSchema = createLeaveSchema.partial().omit({ employeeId: true });

export const createPayslipSchema = z.object({
  employeeId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  basePay: z.number().min(0),
  overtime: z.number().min(0).optional(),
  bonus: z.number().min(0).optional(),
  commission: z.number().min(0).optional(),
  paye: z.number().min(0).optional(),
  uif: z.number().min(0).optional(),
  pensionFund: z.number().min(0).optional(),
  medicalAid: z.number().min(0).optional(),
  otherDeductions: z.number().min(0).optional(),
  notes: z.string().optional(),
});

export const updatePayslipSchema = createPayslipSchema.partial().omit({ employeeId: true });
