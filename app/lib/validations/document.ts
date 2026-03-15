import { z } from "zod";

export const createDocumentSchema = z.object({
  dealId: z.string().optional(),
  name: z.string().min(1),
  type: z.string().min(1),
  url: z.string().optional(),
  notes: z.string().optional(),
});
