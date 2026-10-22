import { ConvexError } from "convex/values";
import { Id } from "../_generated/dataModel";
import { QueryCtx, MutationCtx } from "../_generated/server";

/**
 * Ensure the request is authenticated and return the authenticated user, their emotional profile, and the identity.
 *
 * @returns An object containing `user` (the user document), `profile` (the user's emotional profile document), and `identity` (the authentication identity)
 * @throws ConvexError `not_authenticated` when the request has no authenticated identity
 * @throws ConvexError `user_not_found` when no user matches the identity
 * @throws ConvexError `account_inactive` when the user's account status is not `"active"`
 * @throws ConvexError `profile_not_found` when the user's emotional profile cannot be found
 */
export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({
      code: "not_authenticated",
      message: "Not authenticated",
    });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  // user_not_found and account_inactive are both reachable transiently on a
  // healthy client: every requireAuth-gated subscription re-runs the instant
  // getOrCreate/requestDeletion patches the users row, and on sign-in they
  // mount before getOrCreate lands. The client treats both as "auth is still
  // settling" and only gives up after a grace window — see
  // src/providers/account-bootstrap-boundary.tsx.
  if (!user) {
    throw new ConvexError({
      code: "user_not_found",
      message: "User not found. Call getOrCreate first.",
    });
  }

  if (user.accountStatus !== "active") {
    throw new ConvexError({
      code: "account_inactive",
      message: "Account is not active",
    });
  }

  const profile = await ctx.db.get("emotional_profiles", user.emotionalProfileId);
  if (!profile) {
    throw new ConvexError({
      code: "profile_not_found",
      message: "Emotional profile not found",
    });
  }

  return { user, profile, identity };
}

/**
 * Assert that the specified session belongs to the authenticated user's emotional profile.
 *
 * @param sessionId - The id of the session in the `sessions` collection to verify ownership for
 * @returns An object containing `user`, `profile`, `session`, and `identity`
 * @throws ConvexError `session_not_found` if no session exists for `sessionId`
 * @throws ConvexError `session_forbidden` if the session's emotionalProfileId does not match the authenticated profile
 */
export async function requireSessionOwnership(
  ctx: QueryCtx | MutationCtx,
  sessionId: Id<"sessions">
) {
  const { user, profile, identity } = await requireAuth(ctx);

  const session = await ctx.db.get("sessions", sessionId);
  if (!session) {
    throw new ConvexError({
      code: "session_not_found",
      message: "Session not found",
    });
  }

  if (session.emotionalProfileId !== profile._id) {
    throw new ConvexError({
      code: "session_forbidden",
      message: "Session does not belong to this user",
    });
  }

  return { user, profile, session, identity };
}
