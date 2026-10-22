/** Codes requireAuth throws while the Convex user row and Clerk disagree. */
const TRANSIENT_CODES = ["user_not_found", "account_inactive"];

/**
 * True when the error is requireAuth rejecting because the Convex user row is
 * missing or not active — a state that resolves on its own once `getOrCreate`
 * lands or the session is torn down. Matches only the typed ConvexError code:
 * a bare `Error` reaches production clients redacted to "Server Error", so
 * message matching is unclassifiable there by construction.
 *
 * Deliberately excludes `not_authenticated`: that is a broken session, not a
 * settling row, and retrying it would hide the failure behind a loader.
 *
 * See src/providers/account-bootstrap-boundary.tsx for how it is used.
 */
export function isBootstrapError(error: unknown): boolean {
  const code = (error as { data?: { code?: string } } | null)?.data?.code;
  return !!code && TRANSIENT_CODES.includes(code);
}
