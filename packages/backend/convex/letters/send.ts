/**
 * Sending a letter (spec §3): the gate, the check at send, and the store. The
 * client waits on "Reading it over…" for the whole call, 8 s at most for the
 * check.
 *
 * Fixable, at-risk and not-English letters are never stored (#750). The words
 * are never logged or sent to analytics.
 */
import { ConvexError, type Infer, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import {
	type ActionCtx,
	action,
	internalMutation,
	internalQuery,
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
import { LETTER_MAX_CHARS, LETTER_MIN_CHARS, textHashOf } from "./rules";
import { addStrike } from "./strikes";
import {
	letterAimValidator,
	type SendOutcome,
	sendOutcomeValidator,
} from "./validators";

const limitReasonValidator = v.union(v.literal("today"), v.literal("three"));

const gateResultValidator = v.union(
	v.object({ kind: v.literal("open"), profileId: v.id("emotional_profiles") }),
	v.object({ kind: v.literal("limit"), reason: limitReasonValidator }),
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
			? { kind: "limit", reason }
			: { kind: "open", profileId: profile._id };
	},
	returns: gateResultValidator,
});

/**
 * Stores a checked letter. Waiting and unchecked letters re-check the caps
 * (two devices can't both use the last slot: the loser answers `limit`) and
 * use the day. A held letter skips the caps: it isn't a sent letter, it's
 * kept for review and counts as a strike.
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
		if (args.status === "held") {
			const letterId = await ctx.db.insert("letters", {
				createdAt: now,
				language: args.language,
				senderProfileId: args.profileId,
				status: "held",
				text: args.text,
				textHash: args.textHash,
				...(args.aim && { aim: args.aim }),
			});
			const reviewId = await ctx.db.insert("letter_reviews", {
				createdAt: now,
				kind: "held",
				letterId,
				state: "open",
			});
			await addStrike(ctx, {
				at: now,
				cause: "held",
				reviewId,
				senderProfileId: args.profileId,
			});
			return null;
		}

		const profile = await ctx.db.get("emotional_profiles", args.profileId);
		if (!profile) {
			throw new ConvexError({ code: "profile_not_found" });
		}
		const sender = await ensureLetterProfile(ctx, args.profileId);
		const reason = await writeLimitOf(ctx, profile, sender);
		if (reason) {
			return reason;
		}
		await ctx.db.insert("letters", {
			createdAt: now,
			language: args.language,
			senderProfileId: args.profileId,
			status: args.status,
			text: args.text,
			...(args.status === "waiting" && { checkedAt: now }),
			...(args.aim && { aim: args.aim }),
		});
		await ctx.db.patch("letter_profiles", sender._id, {
			lastSentDay: await senderToday(ctx, profile),
		});
		return null;
	},
	returns: v.union(v.null(), limitReasonValidator),
});

/**
 * The check found the writer may be at risk: one escalation event, with the
 * safeguard's trigger as evidence and never the letter (#750). Nothing else
 * is written; the client shows intake's care.
 */
export const raiseRisk = internalMutation({
	args: {
		level: v.union(v.literal("elevated"), v.literal("crisis")),
		peak: v.optional(talkPeakValidator),
		profileId: v.id("emotional_profiles"),
	},
	handler: async (ctx, args) => {
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
		return null;
	},
	returns: v.null(),
});

async function captureSent(
	ctx: ActionCtx,
	profileId: Id<"emotional_profiles">,
	outcome: SendOutcome["kind"]
): Promise<void> {
	// Swallowed: a lost event must never fail a send. No text, no letter id.
	try {
		await posthog.capture(ctx, {
			distinctId: profileId,
			event: "letter_sent",
			properties: { outcome },
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
		if (gated.kind === "limit") {
			return { kind: "limit", reason: gated.reason };
		}
		const { profileId } = gated;
		if (gated.kind === "held") {
			await captureSent(ctx, profileId, "held");
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
		await captureSent(ctx, profileId, outcome.kind);
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
