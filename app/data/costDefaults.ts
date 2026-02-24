// ─── Default Cost Database (ZAR) ───
// unit: "sqm" | "lm" | "unit" | "point" | "room" | "fixed"

export interface CostItem {
  label: string;
  unit: string;
  cost: number;
}

export type CostCategory = Record<string, CostItem>;
export type CostDatabase = Record<string, CostCategory>;

export const DEFAULT_COSTS: CostDatabase = {
  structural: {
    demolition: { label: "Demolition", unit: "sqm", cost: 350 },
    brickwork: { label: "Brickwork alterations", unit: "sqm", cost: 1800 },
    lintels: { label: "Lintels", unit: "fixed", cost: 8500 },
    steel: { label: "Structural steel", unit: "fixed", cost: 25000 },
    plastering: { label: "Plastering", unit: "sqm", cost: 220 },
    screeding: { label: "Screeding", unit: "sqm", cost: 180 },
    ceiling: { label: "Ceiling replacement", unit: "sqm", cost: 380 },
    insulation: { label: "Insulation", unit: "sqm", cost: 250 },
    roofing: { label: "Roofing repairs", unit: "sqm", cost: 450 },
    waterproofing: { label: "Waterproofing", unit: "sqm", cost: 320 },
    fascia: { label: "Fascia boards", unit: "lm", cost: 180 },
    dampProofing: { label: "Damp proofing", unit: "sqm", cost: 280 },
    crackRepairs: { label: "Crack repairs", unit: "fixed", cost: 8000 },
  },
  electrical: {
    rewiring: { label: "Full rewiring", unit: "sqm", cost: 650 },
    dbBoard: { label: "New DB board", unit: "fixed", cost: 18000 },
    lightFittings: { label: "Light fittings", unit: "point", cost: 180 },
    switchesPlugs: { label: "Switches & plugs", unit: "point", cost: 120 },
    coc: { label: "Electrical COC", unit: "fixed", cost: 4500 },
  },
  plumbing: {
    rePiping: { label: "Re-piping", unit: "sqm", cost: 480 },
    drainage: { label: "Drainage", unit: "fixed", cost: 15000 },
    geyser: { label: "Geyser replacement", unit: "fixed", cost: 22000 },
    bathroomFixtures: { label: "Bathroom fixtures", unit: "fixed", cost: 35000 },
    kitchenPlumbing: { label: "Kitchen plumbing", unit: "fixed", cost: 12000 },
    pressurePump: { label: "Pressure pump", unit: "fixed", cost: 8500 },
  },
  finishes: {
    flooring: { label: "Flooring", unit: "sqm", cost: 550 },
    skirting: { label: "Skirting", unit: "lm", cost: 85 },
    painting: { label: "Painting (walls + ceilings)", unit: "sqm", cost: 120 },
    cornices: { label: "Cornices", unit: "lm", cost: 95 },
    internalDoors: { label: "Internal doors", unit: "unit", cost: 4500 },
    frames: { label: "Door frames", unit: "unit", cost: 2800 },
    ironmongery: { label: "Ironmongery", unit: "unit", cost: 1200 },
    builtInCupboards: { label: "Built-in cupboards", unit: "sqm", cost: 3200 },
    kitchenCabinetry: { label: "Kitchen cabinetry", unit: "sqm", cost: 4500 },
    countertops: { label: "Countertops (granite/quartz)", unit: "sqm", cost: 3800 },
    tiling: { label: "Tiling", unit: "sqm", cost: 650 },
    mirrors: { label: "Mirrors", unit: "fixed", cost: 3500 },
    showerGlass: { label: "Shower glass", unit: "fixed", cost: 8500 },
    wardrobes: { label: "Wardrobes", unit: "sqm", cost: 3000 },
  },
  exterior: {
    roofCoating: { label: "Roof coating", unit: "sqm", cost: 180 },
    exteriorPainting: { label: "Exterior painting", unit: "sqm", cost: 150 },
    boundaryWall: { label: "Boundary wall repair", unit: "fixed", cost: 35000 },
    paving: { label: "Paving", unit: "sqm", cost: 450 },
    driveway: { label: "Driveway resurfacing", unit: "sqm", cost: 380 },
    landscaping: { label: "Landscaping", unit: "fixed", cost: 25000 },
    irrigation: { label: "Irrigation", unit: "fixed", cost: 18000 },
    poolRefurb: { label: "Pool refurb", unit: "fixed", cost: 65000 },
  },
  compliance: {
    architect: { label: "Architect", unit: "fixed", cost: 45000 },
    structuralEngineer: { label: "Structural engineer", unit: "fixed", cost: 25000 },
    municipalFees: { label: "Municipal submission fees", unit: "fixed", cost: 15000 },
    electricalCoc: { label: "Electrical COC", unit: "fixed", cost: 4500 },
    plumbingCoc: { label: "Plumbing COC", unit: "fixed", cost: 3500 },
    nhbrc: { label: "NHBRC (if relevant)", unit: "fixed", cost: 12000 },
  },
  projectLevel: {
    siteSecurity: { label: "Site security", unit: "fixed", cost: 18000 },
    skipHire: { label: "Skip hire", unit: "fixed", cost: 12000 },
  },
};
