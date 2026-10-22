/**
 * Safety during a live talk (#599, decisions in #581). Every turn passes a
 * phrase-check floor and a moderation race (the endpoint). No classifier runs
 * live (cost): implicit risk is caught by the full safeguard at the end. A
 * verdict only ever raises the talk's peak; the endpoint reads it each turn
 * and generateMirror folds it into the session level at the end.
 */
import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	query,
} from "../_generated/server";
import type { ClassificationResult } from "../ai/providers/anthropic";
import type { ModerationResult } from "../ai/providers/moderation";
import {
	CRISIS_RESOURCES,
	evaluateSafeguard,
	levelAbove,
	type SafeguardResult,
	SUPPORT_RESOURCES,
	type TalkPeak,
} from "../ai/safeguard";
import { requireSessionOwnership } from "../lib/auth";
import { resourceValidator, talkPeakValidator } from "../lib/validators";
import type { TalkLine } from "./transcript";

// ponytail: short English lists, matched on the turn's own words. The floor
// under moderation, not a classifier; tune them with the prototype (#581).
// Crisis is irreversible for the talk, so only unambiguous first-person forms
// reach it alone.
const CRISIS_PHRASES = [
	/\bkill(ing)? my ?self\b/,
	/\b(end|take|ending|taking) (my|my own) life\b/,
	/\bbetter off dead\b/,
	/\bno reason to (live|go on|be here)\b/,
];

// Idiom-prone ("want to die laughing", "don't want to live like this"): help
// on screen, and moderation still runs to raise it to crisis.
const DISTRESS_PHRASES = [
	/\bsuicid(e|al)\b/,
	/\b(want|wanna|going) (to )?die\b/,
	/\b(don'?t|do not) want to (be alive|live|wake up)\b/,
	/\b(hurt(ing)?|harm(ing)?|cut(ting)?) my ?self\b/,
	/\bend it all\b/,
];

/** What the person said this turn: their lines since the companion last spoke. */
export function turnWords(lines: TalkLine[]): string {
	const from = lines.map((l) => l.role).lastIndexOf("companion") + 1;
	return lines
		.slice(from)
		.map((l) => l.text)
		.join("\n");
}

/** The deterministic floor: crisis on a clear phrase, elevated on a loose one. */
export function phrasePeak(words: string): TalkPeak | null {
	const text = words.toLowerCase().replace(/[’‘]/g, "'");
	const crisis = CRISIS_PHRASES.some((p) => p.test(text));
	if (!(crisis || DISTRESS_PHRASES.some((p) => p.test(text)))) {
		return null;
	}
	return {
		level: crisis ? "crisis" : "elevated",
		triggerConfidence: 1,
		// A clinical summary, not their words.
		triggerEvidence: crisis
			? "Crisis phrase matched."
			: "Distress phrase matched.",
		triggerType: "crisis_keywords",
	};
}

/** An escalating safeguard verdict as a peak; anything below elevated is none. */
export function peakOf(result: SafeguardResult): TalkPeak | null {
	if (!(result.isEscalation && result.triggerType)) {
		return null;
	}
	if (result.level !== "elevated" && result.level !== "crisis") {
		return null;
	}
	return {
		level: result.level,
		triggerConfidence: result.triggerConfidence,
		triggerEvidence: result.triggerEvidence,
		triggerType: result.triggerType,
	};
}

// Moderation alone, live: the engine's own thresholds with nothing classified,
// so only moderation's explicit signals can escalate.
const UNCLASSIFIED: ClassificationResult = {
	intensity: 0,
	primaryEmotion: "unclassified",
	primaryEmotionConfidence: 0,
	requiresFollowUp: false,
	specificity: 0,
	supportNeed: "none",
	thematicTags: [],
	userLanguageTags: [],
};

export const moderationPeak = (m: ModerationResult) =>
	peakOf(evaluateSafeguard(UNCLASSIFIED, m, []));

/** True when `next` should replace the stored peak. */
export const raises = (stored: TalkPeak | undefined, next: TalkPeak) =>
	!stored ||
	levelAbove(next.level, stored.level) ||
	(!!stored.fromHistory && next.level === stored.level);

/** Raises the talk's peak when `peak` is higher. Closed talks keep theirs. */
export async function raiseTalkSafety(
	ctx: MutationCtx,
	session: Doc<"sessions">,
	peak: TalkPeak
) {
	if (session.state !== "initiated" || !raises(session.talkSafety, peak)) {
		return;
	}
	await ctx.db.patch("sessions", session._id, { talkSafety: peak });
}

/**
 * A verdict for an open talk: the endpoint's moderation, in time or late,
 * only once `syncLines` bound the turn to this talk.
 */
export const raise = internalMutation({
	args: {
		crisisLineSpoken: v.optional(v.boolean()),
		peak: v.optional(talkPeakValidator),
		sessionId: v.string(),
	},
	handler: async (ctx, args) => {
		const id = ctx.db.normalizeId("sessions", args.sessionId);
		const session = id ? await ctx.db.get("sessions", id) : null;
		if (session?.entryType !== "talk" || session.state !== "initiated") {
			return null;
		}
		if (args.peak) {
			await raiseTalkSafety(ctx, session, args.peak);
		}
		if (args.crisisLineSpoken) {
			await ctx.db.patch("sessions", session._id, {
				talkCrisisLineSpoken: true,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * What the talk screen shows for safety: a help button at elevated, the
 * resources pinned at crisis. Stays readable after the talk closes.
 */
export const help = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		const { session } = await requireSessionOwnership(ctx, sessionId);
		const level = session.talkSafety?.level;
		if (!level) {
			return null;
		}
		return {
			level,
			resources: level === "crisis" ? CRISIS_RESOURCES : SUPPORT_RESOURCES,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			level: v.union(v.literal("elevated"), v.literal("crisis")),
			resources: v.array(resourceValidator),
		})
	),
});
