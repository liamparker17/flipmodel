// ─── Tool Categories with defaults ───
export type ToolCategoryKey =
  | "angle_grinder"
  | "circular_saw"
  | "drill"
  | "impact_driver"
  | "jigsaw"
  | "sander"
  | "heat_gun"
  | "tile_cutter"
  | "compressor"
  | "nail_gun"
  | "planer"
  | "router"
  | "demolition_hammer"
  | "ladder"
  | "scaffolding"
  | "wheelbarrow"
  | "generator"
  | "paint_sprayer"
  | "pressure_washer"
  | "level_laser"
  | "hand_tool_set"
  | "other";

export interface ToolCategoryInfo {
  label: string;
  defaultLifespanMonths: number;
  defaultReplacementCost: number;
}

export const TOOL_CATEGORY_DEFAULTS: Record<ToolCategoryKey, ToolCategoryInfo> = {
  angle_grinder: { label: "Angle Grinder", defaultLifespanMonths: 18, defaultReplacementCost: 1200 },
  circular_saw: { label: "Circular Saw", defaultLifespanMonths: 24, defaultReplacementCost: 2500 },
  drill: { label: "Drill", defaultLifespanMonths: 36, defaultReplacementCost: 1800 },
  impact_driver: { label: "Impact Driver", defaultLifespanMonths: 30, defaultReplacementCost: 2200 },
  jigsaw: { label: "Jigsaw", defaultLifespanMonths: 24, defaultReplacementCost: 1500 },
  sander: { label: "Sander", defaultLifespanMonths: 18, defaultReplacementCost: 900 },
  heat_gun: { label: "Heat Gun", defaultLifespanMonths: 36, defaultReplacementCost: 600 },
  tile_cutter: { label: "Tile Cutter", defaultLifespanMonths: 24, defaultReplacementCost: 3500 },
  compressor: { label: "Compressor", defaultLifespanMonths: 48, defaultReplacementCost: 4500 },
  nail_gun: { label: "Nail Gun", defaultLifespanMonths: 30, defaultReplacementCost: 2800 },
  planer: { label: "Planer", defaultLifespanMonths: 24, defaultReplacementCost: 3200 },
  router: { label: "Router", defaultLifespanMonths: 30, defaultReplacementCost: 2600 },
  demolition_hammer: { label: "Demolition Hammer", defaultLifespanMonths: 18, defaultReplacementCost: 5500 },
  ladder: { label: "Ladder", defaultLifespanMonths: 60, defaultReplacementCost: 2000 },
  scaffolding: { label: "Scaffolding", defaultLifespanMonths: 72, defaultReplacementCost: 8000 },
  wheelbarrow: { label: "Wheelbarrow", defaultLifespanMonths: 36, defaultReplacementCost: 800 },
  generator: { label: "Generator", defaultLifespanMonths: 48, defaultReplacementCost: 12000 },
  paint_sprayer: { label: "Paint Sprayer", defaultLifespanMonths: 24, defaultReplacementCost: 3500 },
  pressure_washer: { label: "Pressure Washer", defaultLifespanMonths: 36, defaultReplacementCost: 4000 },
  level_laser: { label: "Level / Laser", defaultLifespanMonths: 48, defaultReplacementCost: 3000 },
  hand_tool_set: { label: "Hand Tool Set", defaultLifespanMonths: 60, defaultReplacementCost: 1500 },
  other: { label: "Other", defaultLifespanMonths: 24, defaultReplacementCost: 1000 },
};

// ─── Status & Condition ───
export type ToolStatus = "available" | "checked_out" | "maintenance" | "retired" | "lost" | "damaged";
export type ToolCondition = "new" | "excellent" | "good" | "fair" | "poor" | "broken";

// ─── Core Entities ───
export interface Tool {
  id: string;
  name: string;
  category: ToolCategoryKey;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate: string;
  purchaseCost: number;
  expectedLifespanMonths: number;
  replacementCost: number;
  status: ToolStatus;
  condition: ToolCondition;
  currentHolderType?: "contractor" | "property" | "storage";
  currentHolderId?: string;
  currentHolderName?: string;
  currentDealId?: string;
  currentDealName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ToolCheckout {
  id: string;
  toolId: string;
  contractorName: string;
  contractorId?: string;
  dealId?: string;
  dealName?: string;
  propertyAddress?: string;
  checkedOutAt: string;
  expectedReturnDate?: string;
  returnedAt?: string;
  conditionOut: ToolCondition;
  conditionIn?: ToolCondition;
  notes?: string;
}

export interface ToolMaintenanceEntry {
  id: string;
  toolId: string;
  date: string;
  type: "service" | "repair" | "blade_change" | "calibration" | "other";
  description: string;
  cost?: number;
  performedBy?: string;
  notes?: string;
}

export interface ToolIncident {
  id: string;
  toolId: string;
  date: string;
  type: "lost" | "stolen" | "damaged" | "broken";
  contractorName: string;
  contractorId?: string;
  dealId?: string;
  dealName?: string;
  description: string;
  estimatedCost?: number;
  recoveryStatus: "pending" | "charged_back" | "written_off" | "resolved";
  recoveryAmount?: number;
  notes?: string;
}

export interface ToolLockerData {
  tools: Tool[];
  checkouts: ToolCheckout[];
  maintenance: ToolMaintenanceEntry[];
  incidents: ToolIncident[];
}
