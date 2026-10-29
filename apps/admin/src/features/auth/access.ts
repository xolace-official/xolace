/** Public routes: the only pages a signed-out visitor can reach. */
export const SIGN_IN_PATH = "/sign-in";
/** Where a signed-in user without the admin role lands. */
export const NO_ACCESS_PATH = "/no-access";

// Same value as ADMIN_ROLE in packages/backend/convex/lib/adminAuth.ts, which is
// the real check. Clients can't import convex/lib, so it's repeated here.
const ADMIN_ROLE = "admin";

/**
 * True when the session token carries `role: "admin"`. The claim comes from
 * `{{user.public_metadata.role}}` in Clerk's "Customize session token".
 * This only decides which pages to show; Convex rejects non-admins on its own.
 */
export function hasAdminRole(
	claims: Record<string, unknown> | null | undefined
) {
	return claims?.role === ADMIN_ROLE;
}
