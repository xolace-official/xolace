/**
 * Identity guards and the admin custom function builders (plan §3a).
 *
 * Authorization lives here, in Convex, not in the admin UI. Every function in
 * `convex/admin/*` must be built with `adminQuery`, `adminMutation` or
 * `adminAction`; each throws before the handler runs unless the caller's
 * token carries `role: "admin"`.
 *
 * Required Clerk setup: the `convex` JWT template must copy the role out of
 * the user's public metadata into a top-level claim:
 *
 * ```json
 * { "aud": "convex", "role": "{{user.public_metadata.role}}" }
 * ```
 *
 * Grant access by setting `publicMetadata.role = "admin"` on the Clerk user.
 * Users without it get `role: null` (or no claim) and are rejected.
 *
 * Kept apart from `lib/auth.ts` on purpose: Phase 2 brings in the real app's
 * `lib/auth.ts` (`requireAuth`, `requireSessionOwnership`), and this file must
 * survive that drop-in unchanged.
 */

import type { Auth, UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";
import {
	customAction,
	customCtx,
	customMutation,
	customQuery,
} from "convex-helpers/server/customFunctions";

import { action, mutation, query } from "../_generated/server";

/** Value of the `role` claim that grants admin access. */
export const ADMIN_ROLE = "admin";

/** Anything with `ctx.auth`: query, mutation and action contexts all qualify. */
interface AuthCtx {
	auth: Auth;
}

/**
 * Return the caller's identity, or throw `not_authenticated`.
 *
 * @throws ConvexError `{ code: "not_authenticated" }` for anonymous callers
 */
export async function requireUserIdentity(ctx: AuthCtx): Promise<UserIdentity> {
	const identity = await ctx.auth.getUserIdentity();
	if (identity === null) {
		throw new ConvexError({
			code: "not_authenticated",
			message: "Not authenticated",
		});
	}
	return identity;
}

/** True when the identity's token carries the admin `role` claim. */
export function isAdminIdentity(identity: UserIdentity): boolean {
	return identity.role === ADMIN_ROLE;
}

/**
 * Return the caller's identity if they are an admin.
 *
 * @throws ConvexError `{ code: "not_authenticated" }` for anonymous callers
 * @throws ConvexError `{ code: "forbidden" }` for signed-in non-admins
 */
export async function requireAdminIdentity(
	ctx: AuthCtx
): Promise<UserIdentity> {
	const identity = await requireUserIdentity(ctx);
	if (!isAdminIdentity(identity)) {
		throw new ConvexError({
			code: "forbidden",
			message: "Admin role required",
		});
	}
	return identity;
}

const withAdminIdentity = async (ctx: AuthCtx) => ({
	identity: await requireAdminIdentity(ctx),
});

/** Public query that only admins can call. Adds `ctx.identity`. */
export const adminQuery = customQuery(query, customCtx(withAdminIdentity));

/** Public mutation that only admins can call. Adds `ctx.identity`. */
export const adminMutation = customMutation(
	mutation,
	customCtx(withAdminIdentity)
);

/** Public action that only admins can call. Adds `ctx.identity`. */
export const adminAction = customAction(action, customCtx(withAdminIdentity));
