/**
 * Operator tools. Unlike `devTools`, these are meant to run on production —
 * so there is no DEV_TOOLS_ENABLED gate. What keeps them safe is that they
 * are `internalMutation`s: unreachable from any client, callable only with a
 * deploy key (`bunx convex run --prod`) or from the dashboard.
 */
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Grant xolacer eligibility. Sets the flag and nothing else — the person
 * fills in their own profile through the setup wizard, which appears on the
 * Connect tab the next time they open the app.
 *
 * The id is Clerk's (`user_...`), found by searching the xolacer's email in
 * the Clerk dashboard. We deliberately never store emails, so Clerk is the
 * only place that mapping exists.
 *
 *   bunx convex run --prod admin:promoteXolacer '{"clerkUserId":"user_..."}'
 */
export const promoteXolacer = internalMutation({
  args: { clerkUserId: v.string(), isXolacer: v.optional(v.boolean()) },
  returns: v.object({ displayName: v.string(), isXolacer: v.boolean() }),
  handler: async (ctx, args) => {
    // The index is (authProvider, authProviderAccountId) and there are only
    // two providers, so checking both is cheaper than a new index.
    const user =
      (await ctx.db
        .query("users")
        .withIndex("by_auth_provider", (q) =>
          q.eq("authProvider", "google").eq("authProviderAccountId", args.clerkUserId),
        )
        .unique()) ??
      (await ctx.db
        .query("users")
        .withIndex("by_auth_provider", (q) =>
          q.eq("authProvider", "apple").eq("authProviderAccountId", args.clerkUserId),
        )
        .unique());

    if (!user) {
      throw new Error(
        `No user for Clerk id ${args.clerkUserId}. They have to sign in to the app at least once before they can be promoted.`,
      );
    }
    if (user.accountStatus !== "active") {
      throw new Error(`Account is ${user.accountStatus}, not active`);
    }

    const isXolacer = args.isXolacer ?? true;
    await ctx.db.patch("users", user._id, { isXolacer, updatedAt: Date.now() });

    // Echoing the profile name back is the confirmation that you promoted the
    // account you meant to — a Clerk id is not something you can eyeball.
    const profile = await ctx.db.get("emotional_profiles", user.emotionalProfileId);
    const xolacerProfile = profile
      ? await ctx.db
          .query("xolacer_profiles")
          .withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
          .unique()
      : null;

    return { displayName: xolacerProfile?.displayName ?? "(profile not set up yet)", isXolacer };
  },
});
