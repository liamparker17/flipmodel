import { z } from "zod";

export const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  currency: z.string().optional(),
  timezone: z.string().optional(),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
  logo: z.string().nullable().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  settings: z.any().optional(),
});
