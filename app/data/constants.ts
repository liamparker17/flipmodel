// ─── JustHouses ERP Constants ───

export const SA_PRIME = 11.75;

export const SCOPE_MULT: Record<string, number> = { cosmetic: 0.25, midLevel: 0.55, fullGut: 1.0 };

interface UnitTypeInfo {
  label: string;
  suffix: string;
}

export const UNIT_TYPES: Record<string, UnitTypeInfo> = {
  sqm: { label: "per sqm", suffix: "/sqm" },
  lm: { label: "per linear metre", suffix: "/lm" },
  unit: { label: "per unit", suffix: "/unit" },
  point: { label: "per point", suffix: "/point" },
  room: { label: "per room", suffix: "/room" },
  fixed: { label: "fixed", suffix: "fixed" },
};

export const SA_PROFESSIONS: string[] = [
  "Builder / General Contractor",
  "Electrician",
  "Plumber",
  "Tiler",
  "Painter",
  "Plasterer",
  "Carpenter / Joiner",
  "Roofer",
  "Waterproofer",
  "Glazier",
  "Locksmith",
  "Flooring Installer",
  "Ceiling Installer",
  "Landscaper",
  "Paving Specialist",
  "Pool Technician",
  "HVAC Technician",
  "Demolition",
  "Welder / Steel Worker",
  "Pest Control",
  "Project Manager",
  "Labourer",
  "Other",
];

interface BankInfo {
  name: string;
  branchCode: string;
}

export const SA_BANKS: BankInfo[] = [
  { name: "FNB", branchCode: "250655" },
  { name: "ABSA", branchCode: "632005" },
  { name: "Standard Bank", branchCode: "051001" },
  { name: "Nedbank", branchCode: "198765" },
  { name: "Capitec", branchCode: "470010" },
  { name: "Investec", branchCode: "580105" },
  { name: "TymeBank", branchCode: "678910" },
  { name: "African Bank", branchCode: "430000" },
  { name: "Discovery Bank", branchCode: "679000" },
];

interface AccountType {
  value: string;
  label: string;
}

export const ACCOUNT_TYPES: AccountType[] = [
  { value: "cheque", label: "Cheque / Current" },
  { value: "savings", label: "Savings" },
];

export const QUICK_DEFAULTS: Record<string, number> = {
  deposit: 0,
  bondRate: SA_PRIME + 1,
  bondTerm: 240,
  transferAttorneyFees: 45000,
  bondRegistration: 25000,
  initialRepairs: 0,
  totalSqm: 180,
  erfSize: 600,
  agentCommission: 5,
  ratesAndTaxes: 1800,
  utilities: 1200,
  insurance: 950,
  security: 2500,
  levies: 0,
  contingencyPct: 10,
  pmPct: 8,
};

export const TOOLTIPS: Record<string, string> = {
  purchasePrice: "The agreed purchase price of the property before any additional costs.",
  deposit: "Upfront cash payment towards the purchase. Reduces your bond amount.",
  bondRate: "The annual interest rate on your bond. SA prime rate is currently " + SA_PRIME + "%. Leave as-is if unsure.",
  bondTerm: "How long you'll hold the bond, in months. Standard is 240 months (20 years).",
  cashPurchase: "Toggle this if you're buying without a bond (100% cash). No bond interest will apply.",
  transferDuty: "A government tax on property purchases, calculated on a sliding scale based on purchase price.",
  transferAttorneyFees: "Legal fees paid to the transfer attorney for registering the property in your name.",
  bondRegistration: "Fees for registering your bond with the deeds office. Leave at R 0 if paying cash.",
  initialRepairs: "Any urgent repairs needed before the main renovation begins (e.g. roof leaks, security).",
  totalSqm: "The total internal floor area of the property in square metres.",
  erfSize: "The total land/stand size in square metres.",
  ratesAndTaxes: "Monthly municipal rates and taxes payable while you hold the property.",
  utilities: "Monthly electricity, water, and other utility costs during the renovation period.",
  insurance: "Monthly insurance premium for the property during renovation.",
  security: "Monthly security costs (armed response, guards) during the renovation period.",
  levies: "Monthly body corporate or HOA levies. Leave at R 0 if not in a complex or estate.",
  renovationMonths: "How many months you expect the renovation to take from start to finish.",
  expectedPrice: "What you expect to sell the property for after renovation. Research comparable sales in the area.",
  areaBenchmarkPsqm: "Average price per sqm in the area. Helps you benchmark your expected resale price.",
  agentCommission: "The estate agent's commission percentage on the sale. Typically 5-7% in SA.",
  contingency: "Extra budget (as a %) to cover unexpected costs. 10-15% is standard for renovations.",
  pmPct: "Project management fee as a percentage of renovation costs. Typically 8-12%.",
  renoEstimate: "Your total estimated renovation budget. In Advanced Mode you can break this down room by room.",
  annualizedRoi: "ROI scaled to a 12-month period. Allows you to compare deals with different holding periods.",
};

export const STEPS: string[] = [
  "Acquisition",
  "Property",
  "Existing Rooms",
  "Materials & Finishes",
  "Rooms (Planned)",
  "Contractors",
  "Renovation Costs",
  "Holding Costs",
  "Resale & Profit",
  "Shop Materials",
  "Scenario Lab",
  "Expenses",
  "Summary",
];

export const STEP_SHORT: string[] = [
  "Acquire", "Property", "Before", "Palette", "Rooms", "Team", "Reno $",
  "Holding", "Resale", "Shop", "Scenarios", "Expenses", "Summary",
];

export const EXPENSE_CATEGORIES: string[] = [
  "Materials", "Labour", "Transport", "Permits & Compliance",
  "Professional Fees", "Insurance", "Utilities", "Equipment Hire",
  "Furnishing & Staging", "Marketing", "Miscellaneous",
];
