import { z } from "zod";

const detailedItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  unit: z.string(),
  included: z.boolean(),
  qty: z.number(),
  unitCost: z.number(),
});

const roomDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  sqm: z.number(),
  scope: z.enum(["cosmetic", "midLevel", "fullGut"]),
  customCost: z.number().nullable(),
  notes: z.string(),
  roomType: z.string(),
  breakdownMode: z.enum(["simple", "detailed"]),
  detailedItems: z.array(detailedItemSchema).nullable(),
});

const contractorDataSchema = z.object({
  id: z.number(),
  name: z.string(),
  profession: z.string(),
  dailyRate: z.number(),
  daysWorked: z.number(),
});

const costItemSchema = z.object({
  label: z.string(),
  unit: z.enum(["sqm", "lm", "point", "room", "fixed"]),
  cost: z.number(),
});

const dealDataSchema = z.object({
  mode: z.enum(["quick", "advanced"]),
  acq: z.object({
    purchasePrice: z.number(),
    deposit: z.number(),
    bondRate: z.number(),
    bondTerm: z.number(),
    cashPurchase: z.boolean(),
    transferAttorneyFees: z.number(),
    bondRegistration: z.number(),
    initialRepairs: z.number(),
  }),
  prop: z.object({
    totalSqm: z.number(),
    erfSize: z.number(),
    bedrooms: z.number(),
    bathrooms: z.number(),
    garages: z.number(),
    stories: z.string(),
  }),
  rooms: z.array(roomDataSchema),
  nextRoomId: z.number(),
  contractors: z.array(contractorDataSchema),
  costDb: z.record(z.string(), z.record(z.string(), costItemSchema)),
  contingencyPct: z.number(),
  pmPct: z.number(),
  holding: z.object({
    renovationMonths: z.number(),
    ratesAndTaxes: z.number(),
    utilities: z.number(),
    insurance: z.number(),
    security: z.number(),
    levies: z.number(),
  }),
  resale: z.object({
    expectedPrice: z.number(),
    areaBenchmarkPsqm: z.number(),
    agentCommission: z.number(),
  }),
  quickRenoEstimate: z.number(),
});

export const createDealSchema = z.object({
  name: z.string().min(1, "Deal name is required").max(200),
  address: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).optional(),
  expectedSalePrice: z.number().min(0).optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: dealDataSchema.optional(),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  address: z.string().max(500).optional(),
  purchasePrice: z.number().min(0).optional(),
  expectedSalePrice: z.number().min(0).optional(),
  actualSalePrice: z.number().min(0).nullable().optional(),
  stage: z.string().optional(),
  priority: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  data: dealDataSchema.optional(),
  offerAmount: z.number().min(0).nullable().optional(),
  offerDate: z.string().nullable().optional(),
  purchaseDate: z.string().nullable().optional(),
  transferDate: z.string().nullable().optional(),
  listedDate: z.string().nullable().optional(),
  soldDate: z.string().nullable().optional(),
  actualSaleDate: z.string().nullable().optional(),
});
