/**
 * Static Price Database — real ZAR prices researched from SA supplier websites.
 * Last updated: February 2026
 *
 * Each entry maps a material key (from MATERIAL_CATALOG) to verified prices.
 * When exact products aren't stocked, the closest equivalent is used.
 *
 * Sources: leroymerlin.co.za, builders.co.za, cashbuild.co.za
 */

export interface SupplierPrice {
  price: number;           // ZAR incl. VAT
  productName: string;     // actual product name at the supplier
  inStock: boolean;        // whether typically available
  deliveryDays: number;    // typical delivery window
}

export type SupplierPriceEntry = {
  leroymerlin: SupplierPrice;
  builders: SupplierPrice;
  cashbuild: SupplierPrice;
};

/**
 * Key format: "{category}_{itemKey}" — matches the material ID generated
 * in the suppliers page (e.g. "tiles_floorTiles", "paint_wallPaint").
 */
export const PRICE_DATABASE: Record<string, SupplierPriceEntry> = {
  // ─── Tiles ───
  tiles_floorTiles: {
    leroymerlin: { price: 150, productName: "Gemma Grey Ceramic Floor Tile 600x600mm", inStock: true, deliveryDays: 2 },
    builders:    { price: 139, productName: "House & Home Ceramic Floor Tile 600x600mm Matt", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 138, productName: "Omega Ceramic Floor Tile 600x600mm", inStock: true, deliveryDays: 3 },
  },
  tiles_wallTiles: {
    leroymerlin: { price: 159, productName: "Shiny White Ceramic Wall Tile 300x600mm", inStock: true, deliveryDays: 2 },
    builders:    { price: 149, productName: "Samca White Gloss Wall Tile 300x600mm", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 132, productName: "Astro Ceramic Wall Tile 300x600mm", inStock: true, deliveryDays: 3 },
  },
  tiles_tileAdhesive: {
    leroymerlin: { price: 99, productName: "TAL Professional Ceramic Fix 20kg", inStock: true, deliveryDays: 1 },
    builders:    { price: 120, productName: "TAL Porcelain Fix 20kg", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 48, productName: "Champion Tile Adhesive 20kg", inStock: true, deliveryDays: 2 },
  },
  tiles_tileGrout: {
    leroymerlin: { price: 74, productName: "TAL Tile Grout Light Grey 5kg", inStock: true, deliveryDays: 1 },
    builders:    { price: 80, productName: "TAL Wall & Floor Grout Grey 5kg", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 65, productName: "Ezee Tile Grout Grey 5kg", inStock: true, deliveryDays: 2 },
  },
  tiles_tileSpacer: {
    leroymerlin: { price: 29, productName: "Tile Spacers 3mm (200 pack)", inStock: true, deliveryDays: 1 },
    builders:    { price: 25, productName: "Tile Spacers 3mm (200 pack)", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 22, productName: "Tile Spacers 3mm (200 pack)", inStock: true, deliveryDays: 2 },
  },

  // ─── Paint ───
  paint_wallPaint: {
    leroymerlin: { price: 1039, productName: "Plascon Wall & All Interior Matt 5L", inStock: true, deliveryDays: 1 },
    builders:    { price: 989, productName: "Plascon Wall & All Interior 5L", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 999, productName: "Plascon Wall & All Interior 5L", inStock: false, deliveryDays: 4 },
  },
  paint_ceilingPaint: {
    leroymerlin: { price: 865, productName: "Dulux Luxurious Silk Brilliant White 5L", inStock: true, deliveryDays: 1 },
    builders:    { price: 449, productName: "Dulux Maxicover Wall & Ceiling White 5L", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 400, productName: "Dulux Rockgrip Wall & Ceiling White 5L", inStock: true, deliveryDays: 3 },
  },
  paint_primer: {
    leroymerlin: { price: 600, productName: "Plascon Universal Undercoat Primer 5L", inStock: true, deliveryDays: 2 },
    builders:    { price: 749, productName: "Plascon Universal Undercoat 5L", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 699, productName: "Plascon Universal Undercoat 5L", inStock: false, deliveryDays: 4 },
  },
  paint_exteriorPaint: {
    leroymerlin: { price: 799, productName: "Plascon Nuroof Exterior Paint 5L", inStock: true, deliveryDays: 2 },
    builders:    { price: 749, productName: "Dulux Weatherguard Exterior 5L", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 689, productName: "Dulux Rockgrip Exterior 5L", inStock: true, deliveryDays: 3 },
  },
  paint_paintRollerKit: {
    leroymerlin: { price: 109, productName: "Hamiltons Trayset 225mm Roller & Tray", inStock: true, deliveryDays: 1 },
    builders:    { price: 99, productName: "Eezy Peezy 225mm Tray Set", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 110, productName: "Academy Roller Tray Set 225mm", inStock: true, deliveryDays: 2 },
  },

  // ─── Plumbing ───
  plumbing_toilet: {
    leroymerlin: { price: 1999, productName: "Classico Front Flush Close Couple Suite", inStock: true, deliveryDays: 3 },
    builders:    { price: 1499, productName: "Builders Close Couple Suite White", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 1290, productName: "Astina Top Flush Close Couple Suite", inStock: true, deliveryDays: 3 },
  },
  plumbing_basin: {
    leroymerlin: { price: 699, productName: "Roca Debba Basin 500mm White", inStock: true, deliveryDays: 2 },
    builders:    { price: 599, productName: "Builders Round Basin 450mm White", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 450, productName: "Solo Basin 500mm White", inStock: true, deliveryDays: 3 },
  },
  plumbing_taps: {
    leroymerlin: { price: 699, productName: "Sensea Mia Basin Mixer Chrome", inStock: true, deliveryDays: 2 },
    builders:    { price: 899, productName: "Lusso Liro Basin Mixer Chrome", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 310, productName: "Ife Basin Mixer Chrome", inStock: true, deliveryDays: 3 },
  },
  plumbing_showerHead: {
    leroymerlin: { price: 999, productName: "Sensea Shower Head & Rail Set Chrome", inStock: true, deliveryDays: 2 },
    builders:    { price: 849, productName: "Builders Round Shower Head Set Chrome", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 599, productName: "Fontaine Shower Head Set", inStock: true, deliveryDays: 4 },
  },
  plumbing_geyser: {
    leroymerlin: { price: 7499, productName: "Kwikot 150L Electric Geyser", inStock: true, deliveryDays: 5 },
    builders:    { price: 6999, productName: "Kwikot Superline 150L Geyser", inStock: true, deliveryDays: 3 },
    cashbuild:   { price: 6499, productName: "Franke 150L Electric Geyser", inStock: true, deliveryDays: 5 },
  },

  // ─── Electrical ───
  electrical_lightSwitch: {
    leroymerlin: { price: 39, productName: "Legrand Light Switch 1 Lever White", inStock: true, deliveryDays: 1 },
    builders:    { price: 35, productName: "Crabtree Light Switch 1 Lever White", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 29, productName: "Light Switch 1 Lever White", inStock: true, deliveryDays: 2 },
  },
  electrical_plugSocket: {
    leroymerlin: { price: 59, productName: "Legrand Double Plug Socket White", inStock: true, deliveryDays: 1 },
    builders:    { price: 55, productName: "Crabtree Double Switched Socket White", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 45, productName: "Double Switched Socket White", inStock: true, deliveryDays: 2 },
  },
  electrical_downlight: {
    leroymerlin: { price: 79, productName: "Eurolux Tiltable LED Downlight 5W Warm White", inStock: true, deliveryDays: 1 },
    builders:    { price: 85, productName: "Eurolux LED Downlight 5W Warm White", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 65, productName: "Bright Star 5W LED Downlight Warm White", inStock: true, deliveryDays: 2 },
  },
  electrical_dbBoard: {
    leroymerlin: { price: 1899, productName: "Schneider 12-Way Distribution Board", inStock: true, deliveryDays: 3 },
    builders:    { price: 1799, productName: "CBI 12-Way Distribution Board", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 1650, productName: "Legrand 12-Way DB Board", inStock: true, deliveryDays: 4 },
  },
  electrical_cableRoll: {
    leroymerlin: { price: 1599, productName: "Surgefree 2.5mm Twin & Earth Cable 100m", inStock: true, deliveryDays: 2 },
    builders:    { price: 1499, productName: "Surfix 2.5mm Cable 100m Roll", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 1399, productName: "Surgefree 2.5mm Cable 100m", inStock: true, deliveryDays: 3 },
  },

  // ─── Flooring ───
  flooring_laminate: {
    leroymerlin: { price: 219, productName: "Vibrance 4V Oak Grey Laminate 8mm", inStock: true, deliveryDays: 3 },
    builders:    { price: 199, productName: "Kronotex Welsh Oak Laminate 8mm", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 229, productName: "Kronotex Trend Oak Laminate 8mm", inStock: false, deliveryDays: 5 },
  },
  flooring_underlay: {
    leroymerlin: { price: 45, productName: "Foam Laminate Underlay 2mm", inStock: true, deliveryDays: 1 },
    builders:    { price: 39, productName: "Foam Underlay 2mm", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 35, productName: "Foam Underlay 2mm", inStock: true, deliveryDays: 2 },
  },
  flooring_skirting: {
    leroymerlin: { price: 242, productName: "MDF Skirting Board White 18mm 2.7m", inStock: true, deliveryDays: 2 },
    builders:    { price: 189, productName: "Essential MDF Skirting 18mm 2.75m", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 155, productName: "MDF Skirting P2 18mm 2.7m", inStock: true, deliveryDays: 3 },
  },
  flooring_thresholdStrip: {
    leroymerlin: { price: 119, productName: "Aluminium Threshold Strip 900mm", inStock: true, deliveryDays: 1 },
    builders:    { price: 99, productName: "Aluminium Door Threshold 900mm", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 89, productName: "Door Threshold Strip Aluminium", inStock: true, deliveryDays: 2 },
  },

  // ─── Adhesives ───
  adhesives_constructionAdhesive: {
    leroymerlin: { price: 89, productName: "Alcolin Super Grip Construction Adhesive", inStock: true, deliveryDays: 1 },
    builders:    { price: 79, productName: "Alcolin Fix All Construction Adhesive", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 69, productName: "Alcolin Construction Adhesive", inStock: true, deliveryDays: 2 },
  },
  adhesives_silicone: {
    leroymerlin: { price: 93, productName: "Alcolin K86 Silicone Clear 280ml", inStock: true, deliveryDays: 1 },
    builders:    { price: 89, productName: "Alcolin Silicone Sealant Clear 280ml", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 115, productName: "Alcolin Silicone Sealant Clear 300ml", inStock: true, deliveryDays: 2 },
  },
  adhesives_floorAdhesive: {
    leroymerlin: { price: 109, productName: "TAL Floor Tile Adhesive 20kg", inStock: true, deliveryDays: 1 },
    builders:    { price: 120, productName: "TAL Professional Floor Fix 20kg", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 55, productName: "Champion Floor Tile Adhesive 20kg", inStock: true, deliveryDays: 2 },
  },
  adhesives_woodGlue: {
    leroymerlin: { price: 129, productName: "Alcolin Wood Glue 1L", inStock: true, deliveryDays: 1 },
    builders:    { price: 119, productName: "Alcolin Professional Wood Glue 1L", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 99, productName: "Alcolin Wood Glue 1L", inStock: true, deliveryDays: 2 },
  },

  // ─── Hardware ───
  hardware_screwPack: {
    leroymerlin: { price: 149, productName: "Mgb Screw Assortment Kit 200pc", inStock: true, deliveryDays: 1 },
    builders:    { price: 129, productName: "Brands Screw Assortment Pack 200pc", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 99, productName: "Mgb Screw Assortment 200pc", inStock: true, deliveryDays: 2 },
  },
  hardware_rawlPlugs: {
    leroymerlin: { price: 49, productName: "Nylon Rawl Plugs 8mm (100 pack)", inStock: true, deliveryDays: 1 },
    builders:    { price: 45, productName: "Nylon Wall Plugs 8mm (100 pack)", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 35, productName: "Wall Plugs 8mm 100 Pack", inStock: true, deliveryDays: 2 },
  },
  hardware_doorHandle: {
    leroymerlin: { price: 289, productName: "Door Handle Kit Satin Chrome", inStock: true, deliveryDays: 2 },
    builders:    { price: 249, productName: "Garnset Satin Chrome Handle Set", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 245, productName: "4 Lever Handle Set Chrome Plated", inStock: true, deliveryDays: 3 },
  },
  hardware_hinges: {
    leroymerlin: { price: 69, productName: "Butt Hinges 89mm Satin Chrome (pair)", inStock: true, deliveryDays: 1 },
    builders:    { price: 59, productName: "Butt Hinges 89mm Chrome (pair)", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 49, productName: "Butt Hinges 89mm (pair)", inStock: true, deliveryDays: 2 },
  },
  hardware_dustSheet: {
    leroymerlin: { price: 119, productName: "Polythene Dust Sheet 4x5m", inStock: true, deliveryDays: 1 },
    builders:    { price: 99, productName: "Dust Sheet Plastic 4x5m", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 79, productName: "Dust Sheet 4x5m", inStock: true, deliveryDays: 2 },
  },

  // ─── Finishes ───
  finishes_cornice: {
    leroymerlin: { price: 89, productName: "Rhinocornice Cove Polystyrene 90mm 2.7m", inStock: true, deliveryDays: 2 },
    builders:    { price: 89, productName: "Polystyrene Cornice Cove 90mm 2.7m", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 205, productName: "Polystyrene Cornice Cove 90mm 3m", inStock: true, deliveryDays: 4 },
  },
  finishes_ceilingRose: {
    leroymerlin: { price: 129, productName: "Polystyrene Ceiling Rose 400mm", inStock: true, deliveryDays: 2 },
    builders:    { price: 119, productName: "Polystyrene Ceiling Rose 350mm", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 99, productName: "Ceiling Rose Polystyrene", inStock: true, deliveryDays: 3 },
  },
  finishes_curtainRail: {
    leroymerlin: { price: 199, productName: "Steel Curtain Rail 2m White", inStock: true, deliveryDays: 2 },
    builders:    { price: 179, productName: "Curtain Track 2m White", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 159, productName: "Curtain Rail Steel 2m", inStock: true, deliveryDays: 3 },
  },

  // ─── Doors & Windows ───
  doors_windows_interiorDoor: {
    leroymerlin: { price: 449, productName: "Hollow Core Deep Moulded 4-Panel Door 813x2032mm", inStock: true, deliveryDays: 3 },
    builders:    { price: 399, productName: "Swartland Kayo Hollow Core Door 813x2032mm", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 290, productName: "SA Windows Hollow Core Door 813x2032mm", inStock: true, deliveryDays: 4 },
  },
  doors_windows_doorFrame: {
    leroymerlin: { price: 549, productName: "Pine Door Frame Set 813mm", inStock: true, deliveryDays: 3 },
    builders:    { price: 489, productName: "Pine Door Frame Set 813mm", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 399, productName: "Pine Door Frame Set", inStock: true, deliveryDays: 4 },
  },
  doors_windows_windowHandle: {
    leroymerlin: { price: 89, productName: "Aluminium Window Handle White", inStock: true, deliveryDays: 1 },
    builders:    { price: 79, productName: "Aluminium Window Handle", inStock: true, deliveryDays: 1 },
    cashbuild:   { price: 65, productName: "Window Handle Aluminium", inStock: true, deliveryDays: 2 },
  },

  // ─── Waterproofing ───
  waterproofing_waterproofMembrane: {
    leroymerlin: { price: 398, productName: "Duram Fibre-Tech Waterproofing 5L", inStock: true, deliveryDays: 2 },
    builders:    { price: 459, productName: "Duram Flexikote Grey 5L", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 185, productName: "Duram Acrylic Waterproofer Grey 5L", inStock: true, deliveryDays: 3 },
  },
  waterproofing_dampCourse: {
    leroymerlin: { price: 279, productName: "Damp Proof Course 375mm x 30m", inStock: true, deliveryDays: 2 },
    builders:    { price: 259, productName: "DPC Membrane 375mm x 30m", inStock: true, deliveryDays: 2 },
    cashbuild:   { price: 219, productName: "Damp Proof Course 375mm x 30m", inStock: true, deliveryDays: 3 },
  },
};
