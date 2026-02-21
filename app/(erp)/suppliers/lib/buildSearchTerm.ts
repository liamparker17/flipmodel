import type { StylePreferences } from "../../../types/deal";

/**
 * Refine a generic search term with the user's style preferences.
 * e.g. "ceramic floor tile" + {finish: "gloss", color: "grey", size: "600x600"}
 *      → "ceramic floor tile 600x600 gloss grey"
 */
export function buildSearchTerm(baseSearchTerm: string, prefs?: StylePreferences): string {
  if (!prefs || Object.keys(prefs).length === 0) return baseSearchTerm;

  const parts: string[] = [baseSearchTerm];

  // Add size/thickness first (most specific)
  if (prefs.size) parts.push(prefs.size);
  if (prefs.thickness) parts.push(prefs.thickness);

  // Then finish
  if (prefs.finish) parts.push(prefs.finish);

  // Then color
  if (prefs.color) parts.push(prefs.color);

  // Type (for flooring)
  if (prefs.type) parts.push(prefs.type);

  // Brand (only if not "any")
  if (prefs.brand && prefs.brand !== "any") parts.push(prefs.brand);

  return parts.join(" ");
}
