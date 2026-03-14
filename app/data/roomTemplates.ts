// ─── Room Templates for Detailed Breakdowns ───
// Each item: { key, label, unit, defaultCost, autoQty }
// autoQty: "sqm" = room area, "lm" = perimeter estimate, "wallArea" = perimeter x 2.4m, number = fixed qty

export interface RoomTemplateItem {
  key: string;
  label: string;
  unit: string;
  defaultCost: number;
  autoQty: number | "sqm" | "lm" | "wallArea";
}

export interface RoomTemplate {
  label: string;
  items: RoomTemplateItem[];
}

export const ROOM_TEMPLATES: Record<string, RoomTemplate> = {
  bathroom: {
    label: "Bathroom",
    items: [
      { key: "toilet", label: "Toilet", unit: "unit", defaultCost: 3500, autoQty: 1 },
      { key: "basin", label: "Basin", unit: "unit", defaultCost: 2800, autoQty: 1 },
      { key: "showerBath", label: "Shower / Bath", unit: "unit", defaultCost: 6500, autoQty: 1 },
      { key: "tapsMixers", label: "Taps & mixers", unit: "unit", defaultCost: 3200, autoQty: 2 },
      { key: "floorTiles", label: "Floor tiles", unit: "sqm", defaultCost: 650, autoQty: "sqm" },
      { key: "wallTiles", label: "Wall tiles", unit: "sqm", defaultCost: 650, autoQty: "wallArea" },
      { key: "waterproofing", label: "Waterproofing", unit: "sqm", defaultCost: 320, autoQty: "sqm" },
      { key: "plumbingRoughIn", label: "Plumbing rough-in", unit: "room", defaultCost: 12000, autoQty: 1 },
      { key: "vanity", label: "Vanity", unit: "unit", defaultCost: 5500, autoQty: 1 },
      { key: "mirror", label: "Mirror", unit: "unit", defaultCost: 2500, autoQty: 1 },
      { key: "showerGlass", label: "Shower glass", unit: "unit", defaultCost: 8500, autoQty: 1 },
      { key: "towelRails", label: "Towel rails", unit: "unit", defaultCost: 800, autoQty: 2 },
      { key: "extractorFan", label: "Extractor fan", unit: "unit", defaultCost: 1200, autoQty: 1 },
    ],
  },
  kitchen: {
    label: "Kitchen",
    items: [
      { key: "cabinetry", label: "Cabinetry", unit: "lm", defaultCost: 4500, autoQty: "lm" },
      { key: "countertops", label: "Countertops", unit: "lm", defaultCost: 3800, autoQty: "lm" },
      { key: "sink", label: "Sink", unit: "unit", defaultCost: 3500, autoQty: 1 },
      { key: "taps", label: "Taps", unit: "unit", defaultCost: 2800, autoQty: 1 },
      { key: "splashback", label: "Splashback tiling", unit: "sqm", defaultCost: 650, autoQty: 3 },
      { key: "plumbing", label: "Plumbing", unit: "room", defaultCost: 8000, autoQty: 1 },
      { key: "electrical", label: "Electrical points", unit: "point", defaultCost: 850, autoQty: 8 },
      { key: "extractorHood", label: "Extractor / Hood", unit: "unit", defaultCost: 4500, autoQty: 1 },
      { key: "appliances", label: "Built-in appliances allowance", unit: "fixed", defaultCost: 25000, autoQty: 1 },
    ],
  },
  bedroom: {
    label: "Bedroom",
    items: [
      { key: "flooring", label: "Flooring", unit: "sqm", defaultCost: 550, autoQty: "sqm" },
      { key: "painting", label: "Painting (walls)", unit: "sqm", defaultCost: 120, autoQty: "wallArea" },
      { key: "skirtingCornices", label: "Skirting & Cornices", unit: "lm", defaultCost: 180, autoQty: "lm" },
      { key: "curtainRails", label: "Curtain rails", unit: "unit", defaultCost: 1200, autoQty: 1 },
      { key: "builtInCupboards", label: "Built-in cupboards", unit: "lm", defaultCost: 3200, autoQty: 2 },
      { key: "lightFittings", label: "Light fittings", unit: "unit", defaultCost: 1500, autoQty: 2 },
      { key: "electrical", label: "Electrical points", unit: "point", defaultCost: 850, autoQty: 4 },
    ],
  },
  lounge: {
    label: "Lounge / Dining",
    items: [
      { key: "flooring", label: "Flooring", unit: "sqm", defaultCost: 550, autoQty: "sqm" },
      { key: "painting", label: "Painting (walls)", unit: "sqm", defaultCost: 120, autoQty: "wallArea" },
      { key: "skirtingCornices", label: "Skirting & Cornices", unit: "lm", defaultCost: 180, autoQty: "lm" },
      { key: "lightFittings", label: "Light fittings", unit: "unit", defaultCost: 1500, autoQty: 2 },
      { key: "electrical", label: "Electrical points", unit: "point", defaultCost: 850, autoQty: 6 },
      { key: "featureWall", label: "Feature wall allowance", unit: "fixed", defaultCost: 8000, autoQty: 1 },
    ],
  },
  entrance: {
    label: "Entrance / Passage",
    items: [
      { key: "flooring", label: "Flooring", unit: "sqm", defaultCost: 550, autoQty: "sqm" },
      { key: "painting", label: "Painting (walls)", unit: "sqm", defaultCost: 120, autoQty: "wallArea" },
      { key: "skirtingCornices", label: "Skirting & Cornices", unit: "lm", defaultCost: 180, autoQty: "lm" },
      { key: "lightFittings", label: "Light fittings", unit: "unit", defaultCost: 1500, autoQty: 2 },
    ],
  },
  garage: {
    label: "Garage",
    items: [
      { key: "floorCoating", label: "Floor coating / Epoxy", unit: "sqm", defaultCost: 280, autoQty: "sqm" },
      { key: "painting", label: "Painting (walls)", unit: "sqm", defaultCost: 120, autoQty: "wallArea" },
      { key: "electrical", label: "Electrical", unit: "room", defaultCost: 6000, autoQty: 1 },
      { key: "garageDoor", label: "Garage door", unit: "unit", defaultCost: 18000, autoQty: 1 },
      { key: "lighting", label: "Lighting", unit: "unit", defaultCost: 1500, autoQty: 2 },
    ],
  },
  patio: {
    label: "Patio",
    items: [
      { key: "pavingTiling", label: "Paving / Tiling", unit: "sqm", defaultCost: 450, autoQty: "sqm" },
      { key: "ceiling", label: "Ceiling", unit: "sqm", defaultCost: 380, autoQty: "sqm" },
      { key: "painting", label: "Painting", unit: "sqm", defaultCost: 120, autoQty: "sqm" },
      { key: "lighting", label: "Lighting", unit: "unit", defaultCost: 1500, autoQty: 3 },
      { key: "waterproofing", label: "Waterproofing", unit: "sqm", defaultCost: 320, autoQty: "sqm" },
    ],
  },
  scullery: {
    label: "Scullery",
    items: [
      { key: "flooring", label: "Flooring", unit: "sqm", defaultCost: 550, autoQty: "sqm" },
      { key: "tiling", label: "Wall tiling", unit: "sqm", defaultCost: 650, autoQty: "wallArea" },
      { key: "plumbing", label: "Plumbing", unit: "room", defaultCost: 6000, autoQty: 1 },
      { key: "cabinetry", label: "Cabinetry", unit: "lm", defaultCost: 3500, autoQty: 2 },
      { key: "countertop", label: "Countertop", unit: "lm", defaultCost: 3000, autoQty: 2 },
      { key: "painting", label: "Painting (walls)", unit: "sqm", defaultCost: 120, autoQty: "wallArea" },
    ],
  },
};

// Maps room names to template keys for auto-detection
export const ROOM_TYPE_MAP: Record<string, string> = {
  bathroom: "bathroom",
  "en-suite": "bathroom",
  ensuite: "bathroom",
  kitchen: "kitchen",
  bedroom: "bedroom",
  master: "bedroom",
  lounge: "lounge",
  living: "lounge",
  dining: "lounge",
  entrance: "entrance",
  passage: "entrance",
  hall: "entrance",
  hallway: "entrance",
  garage: "garage",
  patio: "patio",
  veranda: "patio",
  stoep: "patio",
  scullery: "scullery",
  laundry: "scullery",
};

// Detect room type from name
export function detectRoomType(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, type] of Object.entries(ROOM_TYPE_MAP)) {
    if (lower.includes(keyword)) return type;
  }
  return "bedroom"; // default fallback
}

// Calculate auto-quantity for a room item
export function calcAutoQty(autoQty: number | "sqm" | "lm" | "wallArea", roomSqm: number): number {
  if (typeof autoQty === "number") return autoQty;
  const perimeter = 4 * Math.sqrt(roomSqm);
  switch (autoQty) {
    case "sqm": return roomSqm;
    case "lm": return Math.round(perimeter * 10) / 10;
    case "wallArea": return Math.round(perimeter * 2.4 * 10) / 10;
    default: return 1;
  }
}

export interface GeneratedRoomItem {
  key: string;
  label: string;
  unit: string;
  included: boolean;
  qty: number;
  unitCost: number;
}

// Generate detailed items for a room from its template
export function generateRoomItems(roomType: string, roomSqm: number): GeneratedRoomItem[] {
  const template = ROOM_TEMPLATES[roomType];
  if (!template) return [];
  return template.items.map((item) => ({
    key: item.key,
    label: item.label,
    unit: item.unit,
    included: true,
    qty: calcAutoQty(item.autoQty, roomSqm),
    unitCost: item.defaultCost,
  }));
}

export interface PresetRoom {
  name: string;
  sqm: number;
  scope: string;
  roomType: string;
}

export const PRESET_ROOMS: PresetRoom[] = [
  { name: "Master Bedroom", sqm: 16, scope: "midLevel", roomType: "bedroom" },
  { name: "Bedroom 2", sqm: 12, scope: "midLevel", roomType: "bedroom" },
  { name: "Bedroom 3", sqm: 10, scope: "cosmetic", roomType: "bedroom" },
  { name: "Main Bathroom", sqm: 8, scope: "fullGut", roomType: "bathroom" },
  { name: "En-suite Bathroom", sqm: 6, scope: "fullGut", roomType: "bathroom" },
  { name: "Kitchen", sqm: 14, scope: "fullGut", roomType: "kitchen" },
  { name: "Lounge", sqm: 22, scope: "midLevel", roomType: "lounge" },
  { name: "Dining Room", sqm: 14, scope: "cosmetic", roomType: "lounge" },
  { name: "Scullery", sqm: 6, scope: "midLevel", roomType: "scullery" },
  { name: "Entrance Hall", sqm: 8, scope: "cosmetic", roomType: "entrance" },
  { name: "Passage", sqm: 10, scope: "cosmetic", roomType: "entrance" },
  { name: "Garage", sqm: 36, scope: "cosmetic", roomType: "garage" },
  { name: "Patio", sqm: 20, scope: "cosmetic", roomType: "patio" },
];
