// ── Cross-cutting content & admin limits ────────────────────────────────────
// Policy numbers that were previously inlined inside route handlers (and so
// hard to discover or tune). Feature-local timings that only one file uses
// (e.g. invite/telegram TTLs) stay next to that feature; this module is for
// the limits that govern content moderation, uploads, and admin listings.

/** Custom-plan upload: max size of a single uploaded document. */
export const MAX_UPLOAD_FILE_SIZE = 10 * 1024 * 1024 // 10MB

/** Custom-plan upload: max cumulative document storage per plan. */
export const MAX_PLAN_DOCS_SIZE = 50 * 1024 * 1024 // 50MB

/** Report count at or above which a question surfaces in the admin flagged view. */
export const FLAGGED_QUESTION_THRESHOLD = 5

/** Hard cap on rows returned by admin list endpoints (defensive, pre-pagination). */
export const ADMIN_LIST_HARD_CAP = 500

/** Default look-back window (days) for the purchases "known items" ledger. */
export const KNOWN_ITEMS_DEFAULT_DAYS = 60
