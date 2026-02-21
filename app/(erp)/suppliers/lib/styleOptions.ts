/**
 * Style preference definitions for customizable materials.
 * Each option group defines pill-button choices shown in the StylePicker.
 */

export interface StyleOption {
  key: string;
  label: string;
  values: { value: string; label: string }[];
}

export interface StyleCategory {
  /** Material categories this applies to (matches item.category) */
  categories: string[];
  /** Item key patterns this applies to (substring match on item.key) */
  itemKeys: string[];
  options: StyleOption[];
}

export const STYLE_OPTIONS: StyleCategory[] = [
  {
    categories: ["tiles"],
    itemKeys: ["floorTiles", "wallTiles"],
    options: [
      {
        key: "finish",
        label: "Finish",
        values: [
          { value: "matt", label: "Matt" },
          { value: "gloss", label: "Gloss" },
          { value: "textured", label: "Textured" },
        ],
      },
      {
        key: "color",
        label: "Color",
        values: [
          { value: "white", label: "White" },
          { value: "grey", label: "Grey" },
          { value: "beige", label: "Beige" },
          { value: "dark", label: "Dark" },
        ],
      },
      {
        key: "size",
        label: "Size",
        values: [
          { value: "300x300", label: "300x300" },
          { value: "600x600", label: "600x600" },
          { value: "300x600", label: "300x600" },
        ],
      },
    ],
  },
  {
    categories: ["paint"],
    itemKeys: ["wallPaint", "ceilingPaint", "exteriorPaint"],
    options: [
      {
        key: "finish",
        label: "Finish",
        values: [
          { value: "matt", label: "Matt" },
          { value: "silk", label: "Silk" },
          { value: "semi-gloss", label: "Semi-Gloss" },
        ],
      },
      {
        key: "color",
        label: "Color",
        values: [
          { value: "white", label: "White" },
          { value: "cream", label: "Cream" },
          { value: "grey", label: "Grey" },
          { value: "charcoal", label: "Charcoal" },
        ],
      },
      {
        key: "brand",
        label: "Brand",
        values: [
          { value: "plascon", label: "Plascon" },
          { value: "dulux", label: "Dulux" },
          { value: "any", label: "Any" },
        ],
      },
    ],
  },
  {
    categories: ["flooring"],
    itemKeys: ["laminate"],
    options: [
      {
        key: "type",
        label: "Type",
        values: [
          { value: "oak", label: "Oak" },
          { value: "grey", label: "Grey" },
          { value: "walnut", label: "Walnut" },
          { value: "vinyl", label: "Vinyl" },
        ],
      },
      {
        key: "thickness",
        label: "Thickness",
        values: [
          { value: "7mm", label: "7mm" },
          { value: "8mm", label: "8mm" },
          { value: "12mm", label: "12mm" },
        ],
      },
    ],
  },
];

/**
 * Get style options for a given item, if any apply.
 */
export function getStyleOptionsForItem(category: string, itemKey: string): StyleOption[] | null {
  for (const sc of STYLE_OPTIONS) {
    if (sc.categories.includes(category) && sc.itemKeys.some((k) => itemKey.includes(k))) {
      return sc.options;
    }
  }
  return null;
}
