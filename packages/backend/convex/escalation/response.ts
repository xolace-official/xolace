import { type ObjectType, v } from "convex/values";
import { type MutationCtx, mutation } from "../_generated/server";
import { requireSessionOwnership } from "../lib/auth";

/** How the user responded to an escalation's resources. */
export const userResponseArgs = {
	sessionId: v.id("sessions"),
	userResponse: v.union(
		v.literal("engaged"),
		v.literal("dismissed"),
		v.literal("no_response")
	),
};

/** Record the response on the session's latest escalation event. */
export async function recordUserResponseCore(
	ctx: MutationCtx,
	args: ObjectType<typeof userResponseArgs>
): Promise<null> {
	await requireSessionOwnership(ctx, args.sessionId);

	const event = await ctx.db
		.query("escalation_events")
		.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
		.order("desc")
		.first();

	if (!event) {
		throw new Error("No escalation event found for this session");
	}

	await ctx.db.patch("escalation_events", event._id, {
		userResponse: args.userResponse,
	});

	return null;
}

/** Record how the user responded to an escalation. */
export const recordUserResponse = mutation({
	args: userResponseArgs,
	handler: recordUserResponseCore,
	returns: v.null(),
});
