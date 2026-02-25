// ─── Budget Thresholds ───
/** Alert when expenses exceed this fraction of budget (80%) */
export const BUDGET_ALERT_THRESHOLD = 0.8;

/** Warning multiplier — at 100% of budget */
export const BUDGET_WARNING_MULTIPLIER = 1.0;

/** Hard limit — reject expenses beyond this multiplier of budget */
export const BUDGET_HARD_LIMIT_MULTIPLIER = 1.2;

// ─── Tax & Currency ───
/** South African VAT rate */
export const SA_VAT_RATE = 0.15;

/** Default currency code */
export const DEFAULT_CURRENCY = "ZAR";

// ─── Auth / Rate Limiting ───
/** Maximum login attempts before lockout */
export const LOGIN_MAX_ATTEMPTS = 5;

// ─── Pagination ───
/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size */
export const MAX_PAGE_SIZE = 100;
