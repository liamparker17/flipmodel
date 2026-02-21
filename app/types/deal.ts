export type DealStage =
  | "lead"
  | "analysing"
  | "offer_made"
  | "purchased"
  | "renovating"
  | "listed"
  | "sold";

export type DealPriority = "low" | "medium" | "high" | "urgent";

export interface Deal {
  id: string;
  name: string;
  address: string;
  purchasePrice: number;
  expectedSalePrice: number;
  stage: DealStage;
  priority: DealPriority;
  createdAt: string;
  updatedAt: string;
  notes: string;
  tags: string[];
  data: DealData;
  expenses: Expense[];
  milestones: Milestone[];
  activities: Activity[];
  contacts: DealContact[];
  documents: Document[];
  actualSalePrice?: number;
  actualSaleDate?: string;
  offerAmount?: number;
  offerDate?: string;
  purchaseDate?: string;
  transferDate?: string;
  listedDate?: string;
  soldDate?: string;
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

// ─── Expense Tracking ───
export type ExpenseCategory =
  | "materials"
  | "labour"
  | "permits"
  | "legal"
  | "utilities"
  | "transport"
  | "equipment"
  | "marketing"
  | "professional_fees"
  | "insurance"
  | "rates_taxes"
  | "contingency"
  | "other";

export type PaymentMethod = "cash" | "eft" | "card" | "cheque" | "account";

export interface Expense {
  id: string;
  dealId: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor: string;
  paymentMethod: PaymentMethod;
  receiptRef?: string;
  notes?: string;
  isProjected: boolean;
  createdAt: string;
}

// ─── Milestones & Tasks ───
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "overdue" | "skipped";

export interface Milestone {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completedDate?: string;
  status: MilestoneStatus;
  tasks: Task[];
  order: number;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignedTo?: string;
  dueDate?: string;
}

// ─── Activity Log ───
export type ActivityType =
  | "stage_change"
  | "note_added"
  | "expense_added"
  | "milestone_completed"
  | "document_added"
  | "contact_added"
  | "price_change"
  | "deal_created"
  | "data_updated"
  | "task_completed";

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

// ─── Contacts / CRM ───
export type ContactRole =
  | "agent"
  | "contractor"
  | "attorney"
  | "bank"
  | "inspector"
  | "architect"
  | "municipality"
  | "tenant"
  | "buyer"
  | "seller"
  | "other";

export interface DealContact {
  id: string;
  name: string;
  role: ContactRole;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

// ─── Documents ───
export type DocumentType =
  | "offer_to_purchase"
  | "title_deed"
  | "valuation"
  | "inspection_report"
  | "floor_plan"
  | "quote"
  | "invoice"
  | "receipt"
  | "compliance_certificate"
  | "photo"
  | "contract"
  | "other";

export interface Document {
  id: string;
  name: string;
  type: DocumentType;
  url?: string;
  notes?: string;
  addedAt: string;
}

// ─── Computed / Display Types ───
export interface DealMetrics {
  purchasePrice: number;
  expectedPrice: number;
  renovationMonths: number;
  estimatedProfit: number;
  estimatedRoi: number;
  totalExpenses?: number;
  budgetVariance?: number;
  daysInPipeline?: number;
  cashOnCashReturn?: number;
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

export interface PortfolioSummary {
  totalDeals: number;
  activeDeals: number;
  totalInvested: number;
  totalExpectedReturn: number;
  totalActualReturn: number;
  totalProfit: number;
  avgRoi: number;
  avgDaysInPipeline: number;
  dealsByStage: Record<DealStage, number>;
  monthlyExpenses: { month: string; amount: number }[];
  cashFlowProjection: { month: string; inflow: number; outflow: number; net: number }[];
}
