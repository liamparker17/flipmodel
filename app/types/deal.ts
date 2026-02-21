export type DealStage =
  | "lead"
  | "analysing"
  | "offer_made"
  | "purchased"
  | "renovating"
  | "listed"
  | "sold";

export interface Deal {
  id: string;
  name: string;
  address: string;
  purchasePrice: number;
  expectedSalePrice: number;
  stage: DealStage;
  createdAt: string;
  updatedAt: string;
  notes: string;
  data: DealData;
}

export interface DealData {
  mode: "quick" | "advanced";
  acq: AcquisitionData;
  prop: PropertyData;
  rooms: RoomData[];
  nextRoomId: number;
  contractors: ContractorData[];
  costDb: Record<string, Record<string, CostItem>>;
  contingencyPct: number;
  pmPct: number;
  holding: HoldingData;
  resale: ResaleData;
  quickRenoEstimate: number;
}

export interface AcquisitionData {
  purchasePrice: number;
  deposit: number;
  bondRate: number;
  bondTerm: number;
  cashPurchase: boolean;
  transferAttorneyFees: number;
  bondRegistration: number;
  initialRepairs: number;
}

export interface PropertyData {
  totalSqm: number;
  erfSize: number;
  bedrooms: number;
  bathrooms: number;
  garages: number;
  stories: string;
}

export interface RoomData {
  id: number;
  name: string;
  sqm: number;
  scope: "cosmetic" | "midLevel" | "fullGut";
  customCost: number | null;
  notes: string;
  roomType: string;
  breakdownMode: "simple" | "detailed";
  detailedItems: DetailedItem[] | null;
}

export interface DetailedItem {
  key: string;
  label: string;
  unit: string;
  included: boolean;
  qty: number;
  unitCost: number;
}

export interface ContractorData {
  id: number;
  name: string;
  profession: string;
  dailyRate: number;
  daysWorked: number;
}

export interface CostItem {
  label: string;
  unit: "sqm" | "lm" | "point" | "room" | "fixed";
  cost: number;
}

export interface HoldingData {
  renovationMonths: number;
  ratesAndTaxes: number;
  utilities: number;
  insurance: number;
  security: number;
  levies: number;
}

export interface ResaleData {
  expectedPrice: number;
  areaBenchmarkPsqm: number;
  agentCommission: number;
}

export interface DealMetrics {
  purchasePrice: number;
  expectedPrice: number;
  renovationMonths: number;
  estimatedProfit: number;
  estimatedRoi: number;
}

export interface DealScoreResult {
  level: "strong" | "marginal" | "risky";
  label: string;
  color: string;
  bg: string;
  desc: string;
}

export interface StageDefinition {
  key: DealStage;
  label: string;
  color: string;
}
