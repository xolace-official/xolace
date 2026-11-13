import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { isFollowUpPoolable } from "../lib/poolability";
import { collapseCard } from "../outreach/telegram/checkIn";

// Same order of magnitude as a product-feedback note — a sentence or a few,
// never a session transcript.
export const REFLECTION_MAX_LENGTH = 2000;

// Card responses a client may send (chip tap or backdrop dismiss).
export const userResponseValidator = v.union(
	v.literal("lighter"),
	v.literal("still_here"),
	v.literal("heavier"),
	v.literal("processed"),
	v.literal("vent"),
	v.literal("dismissed")
);

// The heavier menu's choices (the app's heavier step).
export const heavierChoiceValidator = v.union(
	v.literal("crisis_resources"),
	v.literal("music"),
	v.literal("support_audio"),
	v.literal("library")
);

/**
 * The structured half of a response, kept in `follow_up_responses` beside the
 * card: the "what helped?" text, the share flag and the heavier-menu choice.
 */
export type ResponseDetails = {
	heavierChoice?: Infer<typeof heavierChoiceValidator>;
	reflectionText?: string;
	shareRequested: boolean;
};

/** Where an answer came from. */
export type ResolveSource = "app" | "telegram";

/** Open = still waiting for an answer. Expired and superseded cards are closed. */
const OPEN_STATUSES = new Set<Doc<"follow_up_cards">["status"]>([
	"pending",
	"ready",
	"shown",
]);

/**
 * What happened to a response. `already_resolved`: the card already has its
 * response (an answer or a dismiss). `closed`: it expired or was superseded.
 * `not_found`: no such card, or not the caller's.
 */
export type ResolveOutcome =
	| "accepted"
	| "already_resolved"
	| "closed"
	| "not_found";

/**
 * The one way a follow-up card gets resolved, from any surface. Takes a
 * `response` (the chip, or a dismiss), `details` (what helped, the share flag,
 * the heavier choice), or both.
 *
 * The first response wins: a later one reports `already_resolved` and changes
 * nothing. `onlyOpen` refuses expired and superseded cards (`closed`). It
 * defaults to on for every source but the app, where a superseded card stays
 * answerable until dismissed. None of these outcomes throws, so a stale or
 * duplicate tap is ordinary. Details alone are accepted on any card the user
 * owns, resolved or not, and replace the previous ones; details sent with a
 * refused response are dropped with it. Text over `REFLECTION_MAX_LENGTH`
 * throws `reflection_too_long`.
 */
export async function resolveCardCore(
	ctx: MutationCtx,
	args: {
		cardId: Id<"follow_up_cards">;
		details?: ResponseDetails;
		onlyOpen?: boolean;
		profileId: Id<"emotional_profiles">;
		response?: Infer<typeof userResponseValidator>;
		source: ResolveSource;
	}
): Promise<ResolveOutcome> {
	const card = await ctx.db.get("follow_up_cards", args.cardId);
	if (!card || card.emotionalProfileId !== args.profileId) {
		return "not_found";
	}

	if (args.response) {
		if (card.status === "resolved") {
			return "already_resolved";
		}
		const onlyOpen = args.onlyOpen ?? args.source !== "app";
		if (onlyOpen && !OPEN_STATUSES.has(card.status)) {
			return "closed";
		}
	}

	if (args.details) {
		await writeDetails(ctx, card, args.details);
	}

	if (args.response) {
		await ctx.db.patch("follow_up_cards", card._id, {
			resolvedAt: Date.now(),
			status: "resolved",
			userResponse: args.response,
		});
		// Answered anywhere: its Telegram check-ins say so and lose their buttons.
		await collapseCard(ctx, card._id);
		// An answer is a reading: it can close a stretch, never open one (#519).
		// Its own transaction, so it can't fail the answer (#529).
		await ctx.scheduler.runAfter(0, internal.compounding.stretches.evaluate, {
			profileId: args.profileId,
		});
	}
	return "accepted";
}

/** Upsert the card's one response row, then share it if it qualifies. */
async function writeDetails(
	ctx: MutationCtx,
	card: Doc<"follow_up_cards">,
	details: ResponseDetails
): Promise<void> {
	const text = details.reflectionText?.trim() || undefined;
	if (text && text.length > REFLECTION_MAX_LENGTH) {
		throw new ConvexError({
			code: "reflection_too_long",
			message: `Reflection exceeds ${REFLECTION_MAX_LENGTH} characters`,
		});
	}

	const fields = {
		heavierChoice: details.heavierChoice,
		reflectionText: text,
		shareRequested: details.shareRequested,
		updatedAt: Date.now(),
	};
	const existing = await ctx.db
		.query("follow_up_responses")
		.withIndex("by_card", (q) => q.eq("cardId", card._id))
		.first();
	let responseId = existing?._id;
	if (responseId) {
		await ctx.db.patch("follow_up_responses", responseId, fields);
	} else {
		responseId = await ctx.db.insert("follow_up_responses", {
			...fields,
			cardId: card._id,
			createdAt: fields.updatedAt,
			emotionalProfileId: card.emotionalProfileId,
		});
	}

	// Share at most once per card, so no re-submit double-contributes. The
	// job re-checks every gate at run time (a later revoke wins).
	const session = await ctx.db.get("sessions", card.sessionId);
	if (
		!existing?.shareScheduledAt &&
		isFollowUpPoolable({
			escalationDerived: card.escalationDerived,
			reflectionText: text,
			safeguardLevel: session?.safeguardLevel,
			shareRequested: details.shareRequested,
			tier: card.tier,
		})
	) {
		await ctx.db.patch("follow_up_responses", responseId, {
			shareScheduledAt: Date.now(),
		});
		await ctx.scheduler.runAfter(0, internal.jobs.followUpShare.share, {
			responseId,
		});
	}
}
