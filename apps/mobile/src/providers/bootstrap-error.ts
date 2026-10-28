/** Codes requireAuth throws while the Convex user row and Clerk disagree. */
const TRANSIENT_CODES = ["user_not_found", "account_inactive"];

/** True for requireAuth's settling codes (row missing or inactive). Typed code only: bare
 * errors reach prod redacted. Excludes `not_authenticated`. */
export function isBootstrapError(error: unknown): boolean {
	const code = (error as { data?: { code?: string } } | null)?.data?.code;
	return !!code && TRANSIENT_CODES.includes(code);
}
