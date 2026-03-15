import { z } from "zod";

export const createMilestoneSchema = z.object({
  dealId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.string().optional(),
  order: z.number().int().optional(),
  assignedContractorId: z.string().optional(),
  assignedToMemberId: z.string().optional(),
  roomId: z.string().optional(),
  tasks: z.array(z.object({
    title: z.string().min(1),
    assignedTo: z.string().optional(),
    dueDate: z.string().optional(),
  })).optional(),
});
