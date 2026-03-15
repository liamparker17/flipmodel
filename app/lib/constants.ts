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
/** Maximum login attempts per email before lockout (15-minute window) */
export const LOGIN_MAX_ATTEMPTS = 5;

/** Login rate limit window in milliseconds (15 minutes) */
export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

/** Maximum login attempts per IP before lockout (15-minute window) */
export const LOGIN_IP_MAX_ATTEMPTS = 5;

/** Maximum signup attempts per IP within the rate limit window */
export const SIGNUP_RATE_LIMIT_MAX = 3;

/** Signup rate limit window in milliseconds (60 minutes) */
export const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/** Maximum sync requests per org within the rate limit window */
export const SYNC_RATE_LIMIT_MAX = 1;

/** Sync rate limit window in milliseconds (2 minutes) */
export const SYNC_RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;

/** Length of auto-generated passwords for new team members */
export const GENERATED_PASSWORD_LENGTH = 16;

// ─── Pagination ───
/** Default number of items per page */
export const DEFAULT_PAGE_SIZE = 20;

/** Maximum allowed page size */
export const MAX_PAGE_SIZE = 100;
