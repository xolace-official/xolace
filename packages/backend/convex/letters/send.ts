/**
 * Sending a letter (spec §3): the gate, the check at send, and the store. The
 * client waits on "Reading it over…" for the whole call, 8 s at most for the
 * check.
 *
 * Fixable, at-risk and not-English letters are never stored (#750). The words
 * are never logged or sent to analytics.
 */
import { ConvexError, type Infer, type ObjectType, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	type ActionCtx,
	action,
	internalMutation,
	internalQuery,
	type MutationCtx,
} from "../_generated/server";
import { requireAdult } from "../age/gate";
import { letterCheckDeps } from "../ai/letters/run";
import { CRISIS_RESOURCES, SUPPORT_RESOURCES } from "../ai/safeguard";
import { raiseEscalation } from "../escalation/events";
import { requireAuth } from "../lib/auth";
import { rateLimiter } from "../lib/rateLimits";
import { talkPeakValidator } from "../lib/validators";
import { posthog } from "../posthog";
import { checkLetterText, LETTER_LANGUAGES } from "./decide";
import { FIXABLE_LINES } from "./lines";
import {
	ensureLetterProfile,
	letterProfileOf,
	senderToday,
	writeLimitOf,
} from "./profiles";
import {
	LETTER_MAX_CHARS,
	LETTER_MIN_CHARS,
	RECHECK_DELAYS_MS,
	textHashOf,
} from "./rules";
import { addStrike } from "./strikes";
import {
	letterAimValidator,
	type SendOutcome,
	sendOutcomeValidator,
} from "./validators";

const limitReasonValidator = v.union(v.literal("today"), v.literal("three"));

const gateResultValidator = v.union(
	v.object({ kind: v.literal("open"), profileId: v.id("emotional_profiles") }),
	v.object({
		kind: v.literal("limit"),
		profileId: v.id("emotional_profiles"),
		reason: limitReasonValidator,
	}),
	v.object({ kind: v.literal("held"), profileId: v.id("emotional_profiles") })
);

/**
 * Who may send, before any model is paid for: an adult (`age_required` /
 * `age_restricted`), after a finished session (`no_session`), under the caps.
 * Words this sender already had held answer `held` again.
 */
export const gate = internalQuery({
	args: { textHash: v.string() },
	handler: async (ctx, args): Promise<Infer<typeof gateResultValidator>> => {
		const { profile, user } = await requireAuth(ctx);
		await requireAdult(ctx, { profile, user }, "ask");
		if (profile.sessionCount < 1) {
			throw new ConvexError({
				code: "no_session",
				message: "Letters open after a first session",
			});
		}
		const heldBefore = await ctx.db
			.query("letters")
			.withIndex("by_sender_hash", (q) =>
				q.eq("senderProfileId", profile._id).eq("textHash", args.textHash)
			)
			.first();
		if (heldBefore?.status === "held") {
			return { kind: "held", profileId: profile._id };
		}
		const reason = await writeLimitOf(
			ctx,
			profile,
			await letterProfileOf(ctx, profile._id)
		);
		return reason
			? { kind: "limit", profileId: profile._id, reason }
			: { kind: "open", profileId: profile._id };
	},
	returns: gateResultValidator,
});

/**
 * Stores a checked letter, and uses the sender's day. Waiting and unchecked
 * letters re-check the caps first (two devices can't both use the last slot:
 * the loser answers `limit`). A held letter skips the caps, since it's kept
 * for review whatever else was sent, but still uses the day, so a sender
 * (paused or not) adds at most one held letter a day to the review queue and
 * then meets the same `limit: today` as anyone. The same held words twice,
 * even from two devices at once, are one row and one strike (spec §3 step 2).
 */
export const store = internalMutation({
	args: {
		aim: v.optional(letterAimValidator),
		language: v.string(),
		profileId: v.id("emotional_profiles"),
		status: v.union(
			v.literal("waiting"),
			v.literal("unchecked"),
			v.literal("held")
		),
		text: v.string(),
		textHash: v.string(),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const profile = await ctx.db.get("emotional_profiles", args.profileId);
		if (!profile) {
			throw new ConvexError({ code: "profile_not_found" });
		}
		const sender = await ensureLetterProfile(ctx, args.profileId);
		const spendTheDay = async () =>
			await ctx.db.patch("letter_profiles", sender._id, {
				lastSentDay: await senderToday(ctx, profile),
			});

		if (args.status === "held") {
			const heldBefore = await ctx.db
				.query("letters")
				.withIndex("by_sender_hash", (q) =>
					q.eq("senderProfileId", args.profileId).eq("textHash", args.textHash)
				)
				.first();
			if (heldBefore?.status === "held") {
				return null;
			}
			const letterId = await ctx.db.insert("letters", {
				createdAt: now,
				language: args.language,
				senderProfileId: args.profileId,
				status: "held",
				text: args.text,
				textHash: args.textHash,
				...(args.aim && { aim: args.aim }),
			});
			await holdForReview(ctx, letterId, args.profileId, now);
			await spendTheDay();
			return null;
		}

		const reason = await writeLimitOf(ctx, profile, sender);
		if (reason) {
			return reason;
		}
		const letterId = await ctx.db.insert("letters", {
			createdAt: now,
			language: args.language,
			senderProfileId: args.profileId,
			status: args.status,
			text: args.text,
			...(args.status === "waiting"
				? { checkedAt: now }
				: { recheckDueAt: now + RECHECK_DELAYS_MS[0] }),
			...(args.aim && { aim: args.aim }),
		});
		await spendTheDay();
		// A passed letter tries the pool at once; an unchecked one is checked
		// again in the background, and never placed until it passes.
		await (args.status === "waiting"
			? ctx.scheduler.runAfter(0, internal.letters.match.place, { letterId })
			: ctx.scheduler.runAfter(
					RECHECK_DELAYS_MS[0],
					internal.letters.check.recheck,
					{ letterId }
				));
		return null;
	},
	returns: v.union(v.null(), limitReasonValidator),
});

export const riskArgs = {
	level: v.union(v.literal("elevated"), v.literal("crisis")),
	peak: v.optional(talkPeakValidator),
	profileId: v.id("emotional_profiles"),
};

/**
 * One escalation event for a writer who may be at risk, with the safeguard's
 * trigger as evidence and never the letter (#750).
 */
export async function raiseLetterRisk(
	ctx: MutationCtx,
	args: ObjectType<typeof riskArgs>
): Promise<void> {
	const crisis = args.level === "crisis";
	await raiseEscalation(ctx, {
		actionTaken: crisis ? "crisis_line_presented" : "resources_shown",
		emotionalProfileId: args.profileId,
		resourcesPresented: crisis ? CRISIS_RESOURCES : SUPPORT_RESOURCES,
		source: "letter",
		triggerConfidence: args.peak?.triggerConfidence ?? 0,
		triggerEvidence:
			args.peak?.triggerEvidence ?? `letter check: ${args.level}`,
		triggerType: args.peak?.triggerType ?? "implicit_risk_language",
	});
}

/** A held letter: an open review for a person, and a strike on its sender. */
export async function holdForReview(
	ctx: MutationCtx,
	letterId: Id<"letters">,
	senderProfileId: Id<"emotional_profiles">,
	now: number
): Promise<void> {
	const reviewId = await ctx.db.insert("letter_reviews", {
		createdAt: now,
		kind: "held",
		letterId,
		state: "open",
	});
	await addStrike(ctx, { at: now, cause: "held", reviewId, senderProfileId });
}

/**
 * The check found the writer may be at risk: one escalation event, with the
 * safeguard's trigger as evidence and never the letter (#750). Nothing else
 * is written; the client shows intake's care.
 */
export const raiseRisk = internalMutation({
	args: riskArgs,
	handler: async (ctx, args) => {
		await raiseLetterRisk(ctx, args);
		return null;
	},
	returns: v.null(),
});

async function captureSent(
	ctx: ActionCtx,
	profileId: Id<"emotional_profiles">,
	outcome: SendOutcome
): Promise<void> {
	// Swallowed: a lost event must never fail a send. No text, no letter id.
	try {
		await posthog.capture(ctx, {
			distinctId: profileId,
			event: "letter_sent",
			properties: {
				outcome: outcome.kind,
				...(outcome.kind === "limit" && { reason: outcome.reason }),
			},
		});
	} catch (error) {
		console.error("letter_sent capture failed", error);
	}
}

/**
 * Send a letter. Answers what the check decided (S20's `SendOutcome`).
 *
 * Throws `invalid_letter` (length), `age_required` / `age_restricted`,
 * `no_session`, and `rate_limited` past the day's checks (the client keeps the
 * words: Try again).
 */
export const send = action({
	args: {
		aim: v.optional(letterAimValidator),
		text: v.string(),
	},
	handler: async (ctx, args): Promise<SendOutcome> => {
		const text = args.text.trim();
		if (text.length < LETTER_MIN_CHARS || text.length > LETTER_MAX_CHARS) {
			throw new ConvexError({
				code: "invalid_letter",
				message: `A letter is ${LETTER_MIN_CHARS} to ${LETTER_MAX_CHARS} characters`,
			});
		}
		const textHash = await textHashOf(text);
		const gated: Infer<typeof gateResultValidator> = await ctx.runQuery(
			internal.letters.send.gate,
			{ textHash }
		);
		const { profileId } = gated;
		if (gated.kind === "limit") {
			const outcome = { kind: "limit", reason: gated.reason } as const;
			await captureSent(ctx, profileId, outcome);
			return outcome;
		}
		if (gated.kind === "held") {
			// The same held words again: answered, not counted as a new held.
			return { kind: "held" };
		}

		const { ok } = await rateLimiter.limit(ctx, "letterCheck", {
			key: profileId,
		});
		if (!ok) {
			throw new ConvexError({
				code: "rate_limited",
				message: "Too many letters checked today",
			});
		}

		const outcome = await outcomeOf(ctx, {
			aim: args.aim,
			profileId,
			text,
			textHash,
		});
		await captureSent(ctx, profileId, outcome);
		return outcome;
	},
	returns: sendOutcomeValidator,
});

/** Runs the check and does what it decided. */
async function outcomeOf(
	ctx: ActionCtx,
	letter: {
		aim: Infer<typeof letterAimValidator> | undefined;
		profileId: Id<"emotional_profiles">;
		text: string;
		textHash: string;
	}
): Promise<SendOutcome> {
	const check = await checkLetterText(letter.text, letterCheckDeps);
	// A stored letter passed the language check, or (unchecked, held) was
	// never returned for its language: the launch language.
	const store = async (status: "waiting" | "unchecked" | "held") =>
		await ctx.runMutation(internal.letters.send.store, {
			...letter,
			language: LETTER_LANGUAGES[0] ?? "en",
			status,
		});

	switch (check.kind) {
		case "risk":
			await ctx.runMutation(internal.letters.send.raiseRisk, {
				level: check.level,
				profileId: letter.profileId,
				...(check.peak && { peak: check.peak }),
			});
			return { kind: "risk" };
		case "held":
			await store("held");
			return { kind: "held" };
		case "lang":
			return { kind: "lang" };
		case "fixable":
			return { kind: "fixable", line: FIXABLE_LINES[check.category] };
		case "unavailable": {
			const limit = await store("unchecked");
			return limit ? { kind: "limit", reason: limit } : { kind: "unavailable" };
		}
		case "pass": {
			const limit = await store("waiting");
			return limit ? { kind: "limit", reason: limit } : { kind: "pass" };
		}
		default:
			throw new Error("unreachable letter check outcome");
	}
}
