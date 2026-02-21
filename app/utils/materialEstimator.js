// ─── Material Estimator ───
// Generates a structured shopping list from room + renovation data.
// All quantities include waste/overage factors.

const WASTE_FACTOR = 1.10; // 10% waste on area-based materials

/**
 * Material categories with items, search terms, and pricing.
 * searchTerm is used for supplier deep links.
 */
const MATERIAL_CATALOG = {
  tiles: {
    label: "Tiles",
    items: [
      { key: "floorTiles", label: "Floor Tiles (ceramic)", searchTerm: "ceramic floor tile 600x600 matt", unitPrice: 299, unit: "sqm", perUnit: 1 },
      { key: "wallTiles", label: "Wall Tiles (ceramic)", searchTerm: "ceramic wall tile 300x600 gloss white", unitPrice: 279, unit: "sqm", perUnit: 1 },
      { key: "tileAdhesive", label: "Tile Adhesive (20kg bag)", searchTerm: "tal bond fix tile adhesive 20kg", unitPrice: 189, unit: "bag", perUnit: 4 },
      { key: "tileGrout", label: "Tile Grout (5kg)", searchTerm: "tal grout grey 5kg", unitPrice: 129, unit: "bag", perUnit: 20 },
      { key: "tileSpacer", label: "Tile Spacers (3mm)", searchTerm: "tile spacers 3mm", unitPrice: 35, unit: "pack", perUnit: 25 },
    ],
  },
  paint: {
    label: "Paint",
    items: [
      { key: "wallPaint", label: "Interior Wall Paint (5L)", searchTerm: "plascon wall and all interior 5 litre", unitPrice: 549, unit: "bucket", perUnit: 40 },
      { key: "ceilingPaint", label: "Ceiling Paint (5L)", searchTerm: "dulux ceiling paint brilliant white 5L", unitPrice: 399, unit: "bucket", perUnit: 50 },
      { key: "primer", label: "Primer / Undercoat (5L)", searchTerm: "plascon universal undercoat primer 5L", unitPrice: 349, unit: "bucket", perUnit: 50 },
      { key: "exteriorPaint", label: "Exterior Paint (5L)", searchTerm: "exterior wall paint 5L", unitPrice: 649, unit: "bucket", perUnit: 35 },
      { key: "paintRollerKit", label: "Paint Roller Kit", searchTerm: "paint roller set 225mm with tray", unitPrice: 189, unit: "kit", perUnit: 0 },
    ],
  },
  plumbing: {
    label: "Plumbing Fixtures",
    items: [
      { key: "toilet", label: "Toilet Suite", searchTerm: "close coupled toilet suite white", unitPrice: 2499, unit: "unit", perUnit: 0 },
      { key: "basin", label: "Wash Basin", searchTerm: "bathroom basin", unitPrice: 1299, unit: "unit", perUnit: 0 },
      { key: "taps", label: "Basin Mixer Tap", searchTerm: "basin mixer tap chrome", unitPrice: 899, unit: "unit", perUnit: 0 },
      { key: "showerHead", label: "Shower Head Set", searchTerm: "shower head set", unitPrice: 1199, unit: "unit", perUnit: 0 },
      { key: "geyser", label: "Geyser (150L)", searchTerm: "geyser 150 litre", unitPrice: 7999, unit: "unit", perUnit: 0 },
    ],
  },
  electrical: {
    label: "Electrical Fittings",
    items: [
      { key: "lightSwitch", label: "Light Switch", searchTerm: "light switch white", unitPrice: 49, unit: "unit", perUnit: 0 },
      { key: "plugSocket", label: "Plug Socket", searchTerm: "plug socket double", unitPrice: 69, unit: "unit", perUnit: 0 },
      { key: "downlight", label: "LED Downlight", searchTerm: "LED downlight recessed 5W warm white", unitPrice: 149, unit: "unit", perUnit: 0 },
      { key: "dbBoard", label: "Distribution Board", searchTerm: "distribution board 12 way", unitPrice: 1899, unit: "unit", perUnit: 0 },
      { key: "cableRoll", label: "Electrical Cable (2.5mm, 100m)", searchTerm: "electrical cable 2.5mm 100m", unitPrice: 1499, unit: "roll", perUnit: 0 },
    ],
  },
  flooring: {
    label: "Flooring",
    items: [
      { key: "laminate", label: "Laminate Flooring", searchTerm: "laminate flooring 8mm oak", unitPrice: 249, unit: "sqm", perUnit: 1 },
      { key: "underlay", label: "Flooring Underlay", searchTerm: "laminate flooring underlay", unitPrice: 49, unit: "sqm", perUnit: 1 },
      { key: "skirting", label: "Skirting Board (2.7m)", searchTerm: "MDF skirting board 18mm 2.7m", unitPrice: 89, unit: "length", perUnit: 2.7 },
      { key: "thresholdStrip", label: "Threshold Strip", searchTerm: "door threshold strip", unitPrice: 129, unit: "unit", perUnit: 0 },
    ],
  },
  adhesives: {
    label: "Adhesives & Sealants",
    items: [
      { key: "constructionAdhesive", label: "Construction Adhesive", searchTerm: "construction adhesive", unitPrice: 89, unit: "tube", perUnit: 0 },
      { key: "silicone", label: "Silicone Sealant", searchTerm: "silicone sealant clear 280ml", unitPrice: 79, unit: "tube", perUnit: 0 },
      { key: "floorAdhesive", label: "Floor Tile Adhesive (20kg)", searchTerm: "floor tile adhesive 20kg", unitPrice: 199, unit: "bag", perUnit: 4 },
      { key: "woodGlue", label: "Wood Glue (1L)", searchTerm: "wood glue 1 litre", unitPrice: 119, unit: "bottle", perUnit: 0 },
    ],
  },
  hardware: {
    label: "Miscellaneous Hardware",
    items: [
      { key: "screwPack", label: "Screw Assortment Pack", searchTerm: "screw assortment pack", unitPrice: 149, unit: "pack", perUnit: 0 },
      { key: "rawlPlugs", label: "Rawl Plugs (100 pack)", searchTerm: "rawl plugs 100", unitPrice: 59, unit: "pack", perUnit: 0 },
      { key: "doorHandle", label: "Door Handle Set", searchTerm: "door handle set satin chrome", unitPrice: 299, unit: "set", perUnit: 0 },
      { key: "hinges", label: "Door Hinges (pair)", searchTerm: "door hinges pair", unitPrice: 79, unit: "pair", perUnit: 0 },
      { key: "dustSheet", label: "Dust Sheet (4x5m)", searchTerm: "dust sheet 4x5m", unitPrice: 129, unit: "sheet", perUnit: 0 },
    ],
  },
  finishes: {
    label: "Finishes",
    items: [
      { key: "cornice", label: "Cornice / Coving (2.7m)", searchTerm: "polystyrene cornice 2.7m", unitPrice: 69, unit: "length", perUnit: 2.7 },
      { key: "ceilingRose", label: "Ceiling Rose", searchTerm: "ceiling rose polystyrene", unitPrice: 149, unit: "unit", perUnit: 0 },
      { key: "curtainRail", label: "Curtain Rail (2m)", searchTerm: "curtain rail steel 2m", unitPrice: 189, unit: "unit", perUnit: 0 },
    ],
  },
  doors_windows: {
    label: "Doors & Windows",
    items: [
      { key: "interiorDoor", label: "Interior Door (hollow core)", searchTerm: "interior door hollow core white", unitPrice: 899, unit: "unit", perUnit: 0 },
      { key: "doorFrame", label: "Door Frame Set", searchTerm: "door frame set pine", unitPrice: 499, unit: "set", perUnit: 0 },
      { key: "windowHandle", label: "Window Handle", searchTerm: "aluminium window handle", unitPrice: 89, unit: "unit", perUnit: 0 },
    ],
  },
  waterproofing: {
    label: "Waterproofing",
    items: [
      { key: "waterproofMembrane", label: "Waterproofing Membrane (5L)", searchTerm: "waterproofing membrane 5 litre", unitPrice: 599, unit: "bucket", perUnit: 10 },
      { key: "dampCourse", label: "Damp-proof Course (30m)", searchTerm: "damp proof course 30m", unitPrice: 249, unit: "roll", perUnit: 30 },
    ],
  },
};

/**
 * Estimate materials from room data.
 * @param {Array} rooms - Array of room objects with { name, sqm, scope, roomType }
 * @param {Object} prop - Property info with { totalSqm }
 * @param {string} mode - "quick" or "advanced"
 * @returns {Array} Array of { category, label, items: [{ key, label, searchTerm, qty, unit, unitPrice, totalCost }] }
 */
export function estimateMaterials(rooms, prop, mode) {
  // Aggregate areas by type
  let totalTileArea = 0;
  let totalWallTileArea = 0;
  let totalPaintArea = 0;
  let totalFloorArea = 0;
  let totalPerimeter = 0;
  let bathroomCount = 0;
  let kitchenCount = 0;
  let totalRoomCount = rooms.length;
  let totalElectricalPoints = 0;
  let totalDoors = 0;

  rooms.forEach((room) => {
    const sqm = room.sqm || 0;
    const perimeter = 4 * Math.sqrt(sqm);
    const wallArea = perimeter * 2.4;
    const type = room.roomType || "bedroom";

    totalPerimeter += perimeter;

    // Tiles: bathrooms, kitchens, sculleries
    if (["bathroom", "kitchen", "scullery"].includes(type)) {
      totalTileArea += sqm;
      if (type === "bathroom") {
        totalWallTileArea += wallArea;
      } else {
        totalWallTileArea += 3; // splashback only
      }
    }

    // Paint: all rooms except tiled ones
    if (!["bathroom"].includes(type)) {
      totalPaintArea += sqm + wallArea;
    }

    // Flooring: bedrooms, lounge, entrance
    if (["bedroom", "lounge", "entrance"].includes(type)) {
      totalFloorArea += sqm;
    }

    // Counts
    if (type === "bathroom") bathroomCount++;
    if (type === "kitchen") kitchenCount++;

    // Estimate electrical points and doors
    if (type === "bedroom") { totalElectricalPoints += 4; totalDoors += 1; }
    else if (type === "bathroom") { totalElectricalPoints += 2; totalDoors += 1; }
    else if (type === "kitchen") { totalElectricalPoints += 8; }
    else if (type === "lounge") { totalElectricalPoints += 6; totalDoors += 1; }
    else { totalElectricalPoints += 2; totalDoors += 1; }
  });

  // Quick mode: use totalSqm as fallback
  if (mode === "quick" || rooms.length === 0) {
    const sqm = prop.totalSqm || 180;
    totalTileArea = sqm * 0.2; // ~20% tiled
    totalWallTileArea = totalTileArea * 2;
    totalPaintArea = sqm * 3; // walls + ceiling
    totalFloorArea = sqm * 0.5; // ~50% laminate
    totalPerimeter = 4 * Math.sqrt(sqm) * 5; // rough total
    bathroomCount = 2;
    kitchenCount = 1;
    totalElectricalPoints = Math.round(sqm / 4);
    totalDoors = Math.round(sqm / 15);
    totalRoomCount = Math.round(sqm / 15);
  }

  const result = [];

  // ── Tiles ──
  if (totalTileArea > 0) {
    const tileFloor = Math.ceil(totalTileArea * WASTE_FACTOR);
    const tileWall = Math.ceil(totalWallTileArea * WASTE_FACTOR);
    const totalTile = tileFloor + tileWall;
    const adhesiveBags = Math.ceil(totalTile / 4);
    const groutBags = Math.ceil(totalTile / 20);
    const spacerPacks = Math.ceil(totalTile / 25);

    result.push({
      category: "tiles",
      label: MATERIAL_CATALOG.tiles.label,
      items: [
        { ...MATERIAL_CATALOG.tiles.items[0], qty: tileFloor, totalCost: tileFloor * 299 },
        { ...MATERIAL_CATALOG.tiles.items[1], qty: tileWall, totalCost: tileWall * 279 },
        { ...MATERIAL_CATALOG.tiles.items[2], qty: adhesiveBags, totalCost: adhesiveBags * 189 },
        { ...MATERIAL_CATALOG.tiles.items[3], qty: groutBags, totalCost: groutBags * 129 },
        { ...MATERIAL_CATALOG.tiles.items[4], qty: spacerPacks, totalCost: spacerPacks * 35 },
      ],
    });
  }

  // ── Paint ──
  if (totalPaintArea > 0) {
    const wallBuckets = Math.ceil(totalPaintArea / 40);
    const ceilBuckets = Math.ceil((totalPaintArea * 0.3) / 50); // ~30% is ceiling
    const primerBuckets = Math.ceil(totalPaintArea / 50);
    const exteriorBuckets = Math.ceil((prop.totalSqm || 180) * 0.4 / 35); // exterior walls
    const rollerKits = Math.ceil(totalRoomCount / 5) || 1;

    result.push({
      category: "paint",
      label: MATERIAL_CATALOG.paint.label,
      items: [
        { ...MATERIAL_CATALOG.paint.items[0], qty: wallBuckets, totalCost: wallBuckets * 549 },
        { ...MATERIAL_CATALOG.paint.items[1], qty: ceilBuckets, totalCost: ceilBuckets * 399 },
        { ...MATERIAL_CATALOG.paint.items[2], qty: primerBuckets, totalCost: primerBuckets * 349 },
        { ...MATERIAL_CATALOG.paint.items[3], qty: exteriorBuckets, totalCost: exteriorBuckets * 649 },
        { ...MATERIAL_CATALOG.paint.items[4], qty: rollerKits, totalCost: rollerKits * 189 },
      ],
    });
  }

  // ── Plumbing ──
  if (bathroomCount > 0 || kitchenCount > 0) {
    const toilets = bathroomCount;
    const basins = bathroomCount + kitchenCount;
    const taps = bathroomCount * 2 + kitchenCount;
    const showerSets = bathroomCount;
    const geysers = bathroomCount > 1 ? 1 : (bathroomCount > 0 ? 1 : 0);

    result.push({
      category: "plumbing",
      label: MATERIAL_CATALOG.plumbing.label,
      items: [
        { ...MATERIAL_CATALOG.plumbing.items[0], qty: toilets, totalCost: toilets * 2499 },
        { ...MATERIAL_CATALOG.plumbing.items[1], qty: basins, totalCost: basins * 1299 },
        { ...MATERIAL_CATALOG.plumbing.items[2], qty: taps, totalCost: taps * 899 },
        { ...MATERIAL_CATALOG.plumbing.items[3], qty: showerSets, totalCost: showerSets * 1199 },
        { ...MATERIAL_CATALOG.plumbing.items[4], qty: geysers, totalCost: geysers * 7999 },
      ],
    });
  }

  // ── Electrical ──
  if (totalElectricalPoints > 0) {
    const switches = Math.ceil(totalElectricalPoints * 0.4);
    const sockets = Math.ceil(totalElectricalPoints * 0.6);
    const downlights = Math.ceil(totalElectricalPoints * 0.5);
    const dbBoards = 1;
    const cableRolls = Math.ceil(totalElectricalPoints / 20) || 1;

    result.push({
      category: "electrical",
      label: MATERIAL_CATALOG.electrical.label,
      items: [
        { ...MATERIAL_CATALOG.electrical.items[0], qty: switches, totalCost: switches * 49 },
        { ...MATERIAL_CATALOG.electrical.items[1], qty: sockets, totalCost: sockets * 69 },
        { ...MATERIAL_CATALOG.electrical.items[2], qty: downlights, totalCost: downlights * 149 },
        { ...MATERIAL_CATALOG.electrical.items[3], qty: dbBoards, totalCost: dbBoards * 1899 },
        { ...MATERIAL_CATALOG.electrical.items[4], qty: cableRolls, totalCost: cableRolls * 1499 },
      ],
    });
  }

  // ── Flooring ──
  if (totalFloorArea > 0) {
    const laminateSqm = Math.ceil(totalFloorArea * WASTE_FACTOR);
    const underlaySqm = laminateSqm;
    const skirtingLengths = Math.ceil(totalPerimeter / 2.7);
    const thresholds = totalDoors;

    result.push({
      category: "flooring",
      label: MATERIAL_CATALOG.flooring.label,
      items: [
        { ...MATERIAL_CATALOG.flooring.items[0], qty: laminateSqm, totalCost: laminateSqm * 249 },
        { ...MATERIAL_CATALOG.flooring.items[1], qty: underlaySqm, totalCost: underlaySqm * 49 },
        { ...MATERIAL_CATALOG.flooring.items[2], qty: skirtingLengths, totalCost: skirtingLengths * 89 },
        { ...MATERIAL_CATALOG.flooring.items[3], qty: thresholds, totalCost: thresholds * 129 },
      ],
    });
  }

  // ── Adhesives ──
  const adhesiveTubes = Math.ceil(totalRoomCount / 3) || 1;
  const siliconeTubes = bathroomCount * 2 + kitchenCount;
  const floorAdhesiveBags = totalTileArea > 0 ? Math.ceil(totalTileArea / 4) : 0;

  if (adhesiveTubes > 0 || siliconeTubes > 0 || floorAdhesiveBags > 0) {
    result.push({
      category: "adhesives",
      label: MATERIAL_CATALOG.adhesives.label,
      items: [
        { ...MATERIAL_CATALOG.adhesives.items[0], qty: adhesiveTubes, totalCost: adhesiveTubes * 89 },
        { ...MATERIAL_CATALOG.adhesives.items[1], qty: Math.max(siliconeTubes, 1), totalCost: Math.max(siliconeTubes, 1) * 79 },
        ...(floorAdhesiveBags > 0 ? [{ ...MATERIAL_CATALOG.adhesives.items[2], qty: floorAdhesiveBags, totalCost: floorAdhesiveBags * 199 }] : []),
        { ...MATERIAL_CATALOG.adhesives.items[3], qty: 1, totalCost: 119 },
      ],
    });
  }

  // ── Hardware ──
  const screwPacks = Math.ceil(totalRoomCount / 4) || 1;
  const rawlPacks = Math.ceil(totalRoomCount / 5) || 1;
  const doorHandleSets = totalDoors;
  const hingePairs = totalDoors * 3;
  const dustSheets = Math.ceil(totalRoomCount / 3) || 1;

  result.push({
    category: "hardware",
    label: MATERIAL_CATALOG.hardware.label,
    items: [
      { ...MATERIAL_CATALOG.hardware.items[0], qty: screwPacks, totalCost: screwPacks * 149 },
      { ...MATERIAL_CATALOG.hardware.items[1], qty: rawlPacks, totalCost: rawlPacks * 59 },
      { ...MATERIAL_CATALOG.hardware.items[2], qty: doorHandleSets, totalCost: doorHandleSets * 299 },
      { ...MATERIAL_CATALOG.hardware.items[3], qty: hingePairs, totalCost: hingePairs * 79 },
      { ...MATERIAL_CATALOG.hardware.items[4], qty: dustSheets, totalCost: dustSheets * 129 },
    ],
  });

  // ── Finishes ──
  const corniceLengths = Math.ceil(totalPerimeter / 2.7);
  const ceilingRoses = totalRoomCount;
  const curtainRails = Math.max(Math.round(totalRoomCount * 0.4), 1); // ~40% of rooms have windows needing rails

  if (corniceLengths > 0) {
    result.push({
      category: "finishes",
      label: MATERIAL_CATALOG.finishes.label,
      items: [
        { ...MATERIAL_CATALOG.finishes.items[0], qty: corniceLengths, totalCost: corniceLengths * 69 },
        { ...MATERIAL_CATALOG.finishes.items[1], qty: ceilingRoses, totalCost: ceilingRoses * 149 },
        { ...MATERIAL_CATALOG.finishes.items[2], qty: curtainRails, totalCost: curtainRails * 189 },
      ],
    });
  }

  // ── Doors & Windows ──
  if (totalDoors > 0) {
    const windowHandles = Math.max(Math.round(totalRoomCount * 0.6), 1);

    result.push({
      category: "doors_windows",
      label: MATERIAL_CATALOG.doors_windows.label,
      items: [
        { ...MATERIAL_CATALOG.doors_windows.items[0], qty: totalDoors, totalCost: totalDoors * 899 },
        { ...MATERIAL_CATALOG.doors_windows.items[1], qty: totalDoors, totalCost: totalDoors * 499 },
        { ...MATERIAL_CATALOG.doors_windows.items[2], qty: windowHandles, totalCost: windowHandles * 89 },
      ],
    });
  }

  // ── Waterproofing ──
  if (bathroomCount > 0) {
    const waterproofBuckets = bathroomCount;
    const dampCourseRolls = Math.ceil((prop.totalSqm || 180) * 0.1 / 30); // ~10% of perimeter

    result.push({
      category: "waterproofing",
      label: MATERIAL_CATALOG.waterproofing.label,
      items: [
        { ...MATERIAL_CATALOG.waterproofing.items[0], qty: waterproofBuckets, totalCost: waterproofBuckets * 599 },
        { ...MATERIAL_CATALOG.waterproofing.items[1], qty: Math.max(dampCourseRolls, 1), totalCost: Math.max(dampCourseRolls, 1) * 249 },
      ],
    });
  }

  return result;
}

/**
 * Supplier pricing multipliers (placeholder for future real pricing).
 * Leroy Merlin is baseline (1.0), Builders Warehouse slightly different.
 */
export const SUPPLIER_MULTIPLIERS = {
  leroymerlin: 1.0,
  builders: 1.03, // ~3% more on average (placeholder)
  cashbuild: 0.97, // ~3% less on average (placeholder — budget supplier)
};

/**
 * Calculate total material cost for a supplier.
 * @param {Array} materials - Output from estimateMaterials()
 * @param {"leroymerlin"|"builders"|"cashbuild"} supplier
 * @returns {number}
 */
export function calcSupplierTotal(materials, supplier) {
  const mult = SUPPLIER_MULTIPLIERS[supplier] || 1;
  let total = 0;
  for (const cat of materials) {
    for (const item of cat.items) {
      total += item.totalCost * mult;
    }
  }
  return Math.round(total);
}
