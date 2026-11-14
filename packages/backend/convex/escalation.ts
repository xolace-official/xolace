import { type Infer, type ObjectType, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
} from "./_generated/server";
import { requireSessionOwnership } from "./lib/auth";
import {
	actionTakenValidator,
	escalationSourceValidator,
	resourceValidator,
	triggerTypeValidator,
} from "./lib/validators";

/** A channel crisis with no open card writes one event per day at most. */
export const CHANNEL_DEDUPE_MS = 24 * 60 * 60 * 1000;

const escalationArgs = {
	actionTaken: actionTakenValidator,
	emotionalProfileId: v.id("emotional_profiles"),
	/** The follow-up open when a channel crisis came in: one event per card. */
	followUpCardId: v.optional(v.id("follow_up_cards")),
	/** The inbound update a channel crisis came in on. */
	inboundEventId: v.optional(v.id("inbound_events")),
	resourcesPresented: v.array(v.union(v.string(), resourceValidator)),
	/** Required for a session escalation; absent for a channel one. */
	sessionId: v.optional(v.id("sessions")),
	/** Absent means "session", as every caller before #772 sent. */
	source: v.optional(escalationSourceValidator),
	triggerConfidence: v.number(),
	triggerEvidence: v.string(),
	triggerType: triggerTypeValidator,
};
type EscalationArgs = ObjectType<typeof escalationArgs>;

/** The event this escalation repeats, if any: the dedupe rules. */
async function existingEvent(
	ctx: MutationCtx,
	args: EscalationArgs,
	now: number
): Promise<Id<"escalation_events"> | null> {
	if (args.sessionId) {
		// One event per session: a remade mirror (a talk's "Say more" reopening,
		// a clarify turn) re-runs the pipeline on a session that already escalated.
		const bySession = await ctx.db
			.query("escalation_events")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.first();
		return bySession?._id ?? null;
	}
	// A channel crisis: one event per open card, else one per day.
	if (args.followUpCardId) {
		const byCard = await ctx.db
			.query("escalation_events")
			.withIndex("by_card", (q) => q.eq("followUpCardId", args.followUpCardId))
			.first();
		return byCard?._id ?? null;
	}
	return await sourceEventSince(
		ctx,
		args.emotionalProfileId,
		args.source ?? "session",
		now - CHANNEL_DEDUPE_MS
	);
}

/**
 * An event the profile raised from `source` since `since`, if any.
 * Rows before #772 carry no `source`, so it's matched here, not indexed.
 */
export async function sourceEventSince(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	source: Infer<typeof escalationSourceValidator>,
	since: number
): Promise<Id<"escalation_events"> | null> {
	const recent = await ctx.db
		.query("escalation_events")
		.withIndex("by_profile", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).gte("createdAt", since)
		)
		.collect();
	return recent.find((e) => e.source === source)?._id ?? null;
}

/**
 * Write an escalation event, or return the one it repeats. Enforces
 * triggerEvidence policy: ONLY model confidence categories and trigger type
 * descriptions. NEVER paraphrased user language.
 */
export async function raiseEscalation(
	ctx: MutationCtx,
	args: EscalationArgs
): Promise<Id<"escalation_events">> {
	const source = args.source ?? "session";
	if (source === "session" && !args.sessionId) {
		throw new Error("A session escalation needs its sessionId.");
	}
	const now = Date.now();
	const existing = await existingEvent(ctx, { ...args, source }, now);
	if (existing) {
		return existing;
	}

	const eventId = await ctx.db.insert("escalation_events", {
		actionTaken: args.actionTaken,
		createdAt: now,
		emotionalProfileId: args.emotionalProfileId,
		resourcesPresented: args.resourcesPresented,
		reviewedByHuman: false,
		source,
		triggerConfidence: args.triggerConfidence,
		triggerEvidence: args.triggerEvidence,
		triggerType: args.triggerType,
		...(args.sessionId && { sessionId: args.sessionId }),
		...(args.inboundEventId && { inboundEventId: args.inboundEventId }),
		...(args.followUpCardId && { followUpCardId: args.followUpCardId }),
	});

	// Mark the session as having triggered escalation
	if (args.sessionId) {
		await ctx.db.patch("sessions", args.sessionId, {
			escalationTriggered: true,
			updatedAt: now,
		});
	}

	return eventId;
}

/**
 * AI creates an escalation event when safety signals are detected: from a
 * session's pipeline, or from a channel message (#772).
 */
export const create = internalMutation({
	args: escalationArgs,
	handler: raiseEscalation,
	returns: v.id("escalation_events"),
});

/**
 * Record how the user responded to an escalation.
 */
export const recordUserResponse = mutation({
	args: {
		sessionId: v.id("sessions"),
		userResponse: v.union(
			v.literal("engaged"),
			v.literal("dismissed"),
			v.literal("no_response")
		),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		// Find the escalation event for this session
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
	},
});
