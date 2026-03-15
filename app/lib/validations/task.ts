import { z } from "zod";

export const updateTaskSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
  assignedTo: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});
