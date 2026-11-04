/**
 * Intake v2's first answer, read (#704, #708): the client's `interpret` step
 * calls this with the answer (and, once, a follow-up reply) and gets back
 * either the safety route or the fields to show as chips. The words are read
 * and dropped: nothing here is stored or cached.
 *
 * A timeout or error is the client's to absorb: it falls back to the
 * pick-list, so this throws rather than inventing a reading.
 */
import { ConvexError, v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { action, internalQuery } from "../../_generated/server";
import { requireAuth } from "../../lib/auth";
import { rateLimiter } from "../../lib/rateLimits";
import { phrasePeak } from "../../talk/safety";
import { buildClassifierPrompt } from "../prompts/classifier";
import {
	CLASSIFIER_MODEL,
	extractTextFromResponse,
	getAnthropicClient,
	INTAKE_READER_MODEL,
	parseClassificationResponse,
	thinkingOff,
} from "../providers/anthropic";
import { moderateInput } from "../providers/moderation";
import {
	CRISIS_RESOURCES,
	evaluateSafeguard,
	levelAbove,
	SUPPORT_RESOURCES,
	UNCLASSIFIED,
} from "../safeguard";
import type { ReaderPrompt } from "./prompt";
import {
	type FirstAnswerReading,
	type ReadingDeps,
	readFirstAnswer,
	readingValidator,
	type SafetyVerdict,
} from "./reading";

/**
 * Two tries of 5s fit inside the client's 12s wait (`use-read-first-answer`), so a
 * retry never outlives the person's screen.
 */
const REQUEST_OPTIONS = { maxRetries: 1, timeout: 5000 };

/** Twice the type step's cap: room for the answer and the follow-up reply. */
const MAX_WORDS_CHARS = 2000;

/** Who is asking, for the rate limit. The action can't read the db itself. */
export const readerProfileId = internalQuery({
	args: {},
	handler: async (ctx) => (await requireAuth(ctx)).profile._id,
	returns: v.id("emotional_profiles"),
});

/** Talk's deterministic phrase floor (#599) as a verdict: no model, no budget. */
async function phraseFloor(words: string): Promise<SafetyVerdict> {
	const phrase = phrasePeak(words);
	if (!phrase) {
		return { level: "none", resources: [] };
	}
	return {
		level: phrase.level,
		resources: phrase.level === "crisis" ? CRISIS_RESOURCES : SUPPORT_RESOURCES,
	};
}

/**
 * The safeguard over a first answer: talk's phrase floor, then the engine over
 * moderation and the classifier. A new user has no history to escalate on. A
 * classifier failure leaves moderation and the phrase floor standing, so the
 * safety route never waits on a model answering.
 */
export async function checkAnswerSafety(words: string): Promise<SafetyVerdict> {
	const [moderation, classification] = await Promise.all([
		moderateInput(words),
		classify(words).catch((err) => {
			console.error("[intake] classifier failed", err);
			return UNCLASSIFIED;
		}),
	]);
	const verdict = evaluateSafeguard(classification, moderation, []);
	// A content-policy rejection turns a mirror away; here it just means no escalation.
	const level = verdict.shouldReject ? "none" : verdict.level;
	const floor = await phraseFloor(words);
	if (levelAbove(floor.level, level)) {
		return floor;
	}
	return {
		level,
		resources: verdict.shouldReject ? [] : verdict.resourcesPresented,
	};
}

async function classify(words: string) {
	const prompt = buildClassifierPrompt(words, "", true, "open_prompt");
	const response = await getAnthropicClient().messages.create(
		{
			max_tokens: 512,
			messages: [{ content: prompt.user, role: "user" }],
			model: CLASSIFIER_MODEL,
			system: prompt.system,
			thinking: thinkingOff(CLASSIFIER_MODEL),
		},
		REQUEST_OPTIONS
	);
	return parseClassificationResponse(extractTextFromResponse(response));
}

/** The reader model call. Exported, with the safeguard, for the live eval. */
export async function readFields(prompt: ReaderPrompt) {
	const response = await getAnthropicClient().messages.create(
		{
			max_tokens: 400,
			messages: [{ content: prompt.user, role: "user" }],
			model: INTAKE_READER_MODEL,
			system: prompt.system,
			thinking: thinkingOff(INTAKE_READER_MODEL),
		},
		REQUEST_OPTIONS
	);
	return extractTextFromResponse(response);
}

const LIVE: ReadingDeps = { checkSafety: checkAnswerSafety, readFields };

/**
 * Past the budget no model runs, but the phrase floor still does: safety never
 * waits on a rate limit. Anything it clears is turned away for the pick-list.
 */
const OVER_BUDGET: ReadingDeps = {
	checkSafety: phraseFloor,
	readFields: () =>
		Promise.reject(
			new ConvexError({
				code: "rate_limited",
				message: "Too many reads; pick from the list instead",
			})
		),
};

export const firstAnswer = action({
	args: {
		answer: v.string(),
		/** The one follow-up and the reply to it. Sent, no second is asked. */
		followUp: v.optional(v.object({ question: v.string(), reply: v.string() })),
	},
	handler: async (ctx, args): Promise<FirstAnswerReading> => {
		const profileId: Id<"emotional_profiles"> = await ctx.runQuery(
			internal.ai.intake.read.readerProfileId,
			{}
		);
		const length = args.answer.length + (args.followUp?.reply.length ?? 0);
		if (args.answer.trim().length === 0 || length > MAX_WORDS_CHARS) {
			throw new ConvexError({
				code: "invalid_answer",
				message: `An answer is 1 to ${MAX_WORDS_CHARS} characters`,
			});
		}
		const { ok } = await rateLimiter.limit(ctx, "intakeAnswerRead", {
			key: profileId,
		});
		return await readFirstAnswer(args, ok ? LIVE : OVER_BUDGET);
	},
	returns: readingValidator,
});
