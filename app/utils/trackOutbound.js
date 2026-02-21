// ─── Outbound Click Tracking ───
// Structured for future analytics integration (GA, PostHog, etc.)

const STORAGE_KEY = "justhousesErp_clicks";

/**
 * Track an outbound click to a supplier.
 * Currently logs to console and persists to localStorage.
 * Replace the body with your analytics provider call when ready.
 *
 * @param {string} supplier - e.g. "Leroy Merlin", "Builders Warehouse"
 * @param {string} item - The material item name
 * @param {string} category - The material category
 */
export function trackOutboundClick(supplier, item, category = "") {
  const event = {
    type: "outbound_click",
    supplier,
    item,
    category,
    timestamp: new Date().toISOString(),
  };

  // Console log for dev
  console.log("[JustHouses] Outbound click:", event);

  // Persist to localStorage for basic analytics
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const clicks = raw ? JSON.parse(raw) : [];
    clicks.push(event);
    // Keep last 500 clicks
    if (clicks.length > 500) clicks.splice(0, clicks.length - 500);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks));
  } catch { /* ignore storage errors */ }

  // ── Future analytics hooks ──
  // Google Analytics 4:
  // gtag('event', 'outbound_click', { supplier, item, category });
  //
  // PostHog:
  // posthog.capture('outbound_click', { supplier, item, category });
}

/**
 * Get click history (for analytics dashboard).
 * @returns {Array} Array of click events
 */
export function getClickHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Generate a supplier search URL.
 * @param {"leroymerlin"|"builders"} supplier
 * @param {string} itemName
 * @returns {string} The search URL
 */
export function getSupplierUrl(supplier, itemName) {
  const encoded = encodeURIComponent(itemName);
  switch (supplier) {
    case "leroymerlin":
      return `https://www.leroymerlin.co.za/search?q=${encoded}`;
    case "builders":
      return `https://www.builders.co.za/search?text=${encoded}`;
    default:
      return "#";
  }
}
