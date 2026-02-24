// ─── Outbound Click Tracking ───
// Structured for future analytics integration (GA, PostHog, etc.)

const STORAGE_KEY = "justhousesErp_clicks";

interface ClickEvent {
  type: string;
  supplier: string;
  item: string;
  category: string;
  timestamp: string;
}

/**
 * Track an outbound click to a supplier.
 * Currently logs to console and persists to localStorage.
 * Replace the body with your analytics provider call when ready.
 */
export function trackOutboundClick(supplier: string, item: string, category: string = ""): void {
  const event: ClickEvent = {
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
    const clicks: ClickEvent[] = raw ? JSON.parse(raw) : [];
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
 */
export function getClickHistory(): ClickEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Generate a supplier search URL.
 */
export function getSupplierUrl(supplier: "leroymerlin" | "builders" | "cashbuild" | string, itemName: string): string {
  switch (supplier) {
    case "leroymerlin":
      return `https://leroymerlin.co.za/search/?q=${itemName.replace(/ /g, "+")}`;
    case "builders":
      return `https://www.builders.co.za/search?text=${encodeURIComponent(itemName)}`;
    case "cashbuild":
      return `https://www.cashbuild.co.za/search?order=product.position.desc&c=0&s=${itemName.replace(/ /g, "+")}`;
    default:
      return "#";
  }
}
