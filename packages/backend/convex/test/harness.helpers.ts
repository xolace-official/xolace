/**
 * Shared `convex-test` harness: one backend per test, plus the identity
 * fixtures every auth-guarded test builds on (design: issue #243).
 *
 * Two rules this file exists to enforce:
 *
 * 1. **Never hand-set `tokenIdentifier`.** `withIdentity` derives it as
 *    `"{issuer}|{subject}"` — exactly what real Convex/Clerk produces and what
 *    `schema.ts` documents. A hand-written one is the single way a fixture can
 *    silently stop matching production.
 * 2. **Seed through the real `users.getOrCreate`.** Raw `t.run` inserts drift
 *    from the schema the moment onboarding changes, and skip the
 *    `authProviderAccountId = identity.subject` write that is the point of the
 *    fixture.
 *
 * **The `.helpers.ts` suffix is load-bearing.** Convex's bundler skips any file
 * in `convex/` whose basename holds more than one dot — the same rule that
 * keeps `*.test.ts` out of a deploy. A single-dot `harness.ts` gets pushed as a
 * function module and breaks `convex codegen`/`deploy` on the Vite-only
 * `import.meta.glob` below. Any new test-support file in here needs a second
 * dot too.
 *
 * Files importing this must carry `// @vitest-environment edge-runtime` as
 * line 1, and must `vi.mock("../lib/aggregates")` — `getOrCreate` calls
 * `rankInsert`, and the `@convex-dev/aggregate` component is not registered in
 * the test backend.
 */

import { register as registerCredits } from "@clipin/convex-credits/test";
import { convexTest, type TestConvex } from "convex-test";
import { api } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import schema from "../schema";

// `import.meta.glob` is typed by `vite/client`, which the credits test entry
// references.

const modules = import.meta.glob("../**/*.ts");

/** Clerk-shaped issuer. Deliberately a constant — reading
 * `CLERK_JWT_ISSUER_DOMAIN` would couple the suite to env. */
export const TEST_ISSUER = "https://test.clerk.accounts.dev";

/** Distinct, recognisable Clerk-shaped identity. `tokenIdentifier` is left for
 * `withIdentity` to derive. */
export const makeIdentity = (n = 1) => ({
	issuer: TEST_ISSUER,
	subject: `user_test_${n}`,
});

/** A bare test backend with no identity attached. */
export function asUnauthed(): TestConvex<typeof schema> {
	const t = convexTest(schema, modules);
	// Talk time's ledger (#596): mounted app-wide, cheap to register everywhere.
	registerCredits(t);
	return t;
}

/** Backend scoped to signed-in user `n` without the admin role. Unlike
 * `asNewUser`, no `users` row is created. */
export function asUser(n = 1, root = asUnauthed()) {
	return root.withIdentity(makeIdentity(n));
}

/** Backend scoped to user `n` whose token carries `role: "admin"`, as the
 * Clerk `convex` JWT template emits it. */
export function asAdmin(n = 1, root = asUnauthed()) {
	return root.withIdentity({ ...makeIdentity(n), role: "admin" });
}

export type SeededUser = {
	/** Backend scoped to this user's identity. */
	t: ReturnType<TestConvex<typeof schema>["withIdentity"]>;
	/** Unscoped backend — pass it to `asNewUser` again for a second user on the
	 * same data, or use `root.run` for states `getOrCreate` cannot produce. */
	root: TestConvex<typeof schema>;
	userId: Id<"users">;
	profileId: Id<"emotional_profiles">;
};

/**
 * Onboard user `n` through the real `users.getOrCreate` mutation.
 *
 * @param n - Distinguishes identities; pass 2 (and `root`) for a second user.
 * @param root - Existing backend to seed into. Omit for a fresh one.
 */
export async function asNewUser(
	n = 1,
	root = asUnauthed()
): Promise<SeededUser> {
	const t = root.withIdentity(makeIdentity(n));
	const userId = await t.mutation(api.users.getOrCreate, {
		authProvider: "google",
	});
	const profileId = await root.run(async (ctx) => {
		const user = await ctx.db.get("users", userId);
		if (!user) {
			throw new Error("getOrCreate returned an id with no user row");
		}
		return user.emotionalProfileId;
	});
	return { profileId, root, t, userId };
}

/** `asNewUser`, then force the account into a non-active status — the states
 * `getOrCreate` will not produce on its own. */
export async function asUserWithStatus(
	status: Doc<"users">["accountStatus"],
	n = 1,
	root = asUnauthed()
): Promise<SeededUser> {
	const seeded = await asNewUser(n, root);
	await seeded.root.run((ctx) =>
		ctx.db.patch("users", seeded.userId, { accountStatus: status })
	);
	return seeded;
}
