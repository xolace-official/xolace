import type { UserIdentity } from "convex/server";
import { ConvexError } from "convex/values";

/**
 * Shared by the `convex/admin/*` mutations. Not a function module: nothing
 * here is registered, so it needs no admin guard of its own.
 */

/** Hard cap on a whole-table admin read; past it the list moves to `.paginate()`. */
export const ADMIN_LIST_LIMIT = 2000;

/**
 * Fields every admin write sets. Dropping `sha256` makes the next import of
 * an old file see the row as Changed rather than Unchanged, and `editedBy`
 * is how the import compare knows to warn that the admin edited it last.
 */
export const adminStamp = (identity: UserIdentity) => ({
	editedBy: identity.subject,
	sha256: undefined,
	updatedAt: Date.now(),
});

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Slugs are ids in links and files: lowercase words joined by hyphens. */
export function assertSlug(slug: string) {
	if (!SLUG.test(slug)) {
		throw new ConvexError(
			`"${slug}" is not a valid slug: use lowercase letters, digits and hyphens`
		);
	}
}

export const notFound = (what: string, slug: string) =>
	new ConvexError(`${what} "${slug}" not found`);
