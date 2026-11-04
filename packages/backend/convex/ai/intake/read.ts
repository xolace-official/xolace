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
import { MODERATION_UNAVAILABLE, moderateInput } from "../providers/moderation";
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
 * Each try's limit, not the call's: the retry's delay comes on top and follows the
 * provider's `retry-after`, so two tries can outlast the client's 12s wait
 * (`use-read-first-answer`). The reader may, at the cost of the chips;
 * {@link SAFETY_DEADLINE_MS} holds the safeguard to its own limit.
 */
const REQUEST_OPTIONS = { maxRetries: 1, timeout: 5000 };

/**
 * How long the safeguard waits on each provider. A verdict the client has stopped
 * waiting for is lost, and the person carries on as if nothing was said, so this
 * leaves the client's 12s wait room for auth, the rate limit and a slow network.
 */
export const SAFETY_DEADLINE_MS = 8000;

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
 * How long a loose distress phrase waits for moderation to raise it to crisis
 * before it stands as elevated. Well inside the client's 12s wait.
 */
const PHRASE_WAIT_MS = 3000;

/**
 * What `work` settles to, or `fallback()` if that takes longer than `ms`. `abort`
 * stops the work then, so a provider past its deadline doesn't keep running (or
 * retry) for an answer nobody will read.
 */
async function within<T>(
	work: Promise<T>,
	ms: number,
	fallback: () => T,
	abort?: AbortController
): Promise<T> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const expired = new Promise<T>((resolve) => {
		timer = setTimeout(() => {
			abort?.abort();
			resolve(fallback());
		}, ms);
	});
	try {
		return await Promise.race([work, expired]);
	} finally {
		clearTimeout(timer);
	}
}

/**
 * Moderation and the classifier through the safeguard engine. Never rejects, and
 * ends by {@link SAFETY_DEADLINE_MS}. Each has its own deadline, so one hanging
 * can't lose what the other said in time.
 */
async function engineVerdict(words: string): Promise<SafetyVerdict> {
	const moderating = new AbortController();
	const classifying = new AbortController();
	const [moderation, classification] = await Promise.all([
		within(
			moderateInput(words, moderating.signal),
			SAFETY_DEADLINE_MS,
			() => {
				console.error("[intake] moderation past the safety deadline");
				return MODERATION_UNAVAILABLE;
			},
			moderating
		),
		within(
			classify(words, classifying.signal).catch((err) => {
				// The deadline's own abort: it has already logged.
				if (!classifying.signal.aborted) {
					console.error("[intake] classifier failed", err);
				}
				return UNCLASSIFIED;
			}),
			SAFETY_DEADLINE_MS,
			() => {
				console.error("[intake] classifier past the safety deadline");
				return UNCLASSIFIED;
			},
			classifying
		),
	]);
	const verdict = evaluateSafeguard(classification, moderation, []);
	// A content-policy rejection turns a mirror away; here it just means no escalation.
	return verdict.shouldReject
		? { level: "none", resources: [] }
		: { level: verdict.level, resources: verdict.resourcesPresented };
}

/**
 * The safeguard over a first answer: talk's phrase floor first, then the engine
 * over moderation and the classifier. A new user has no history to escalate on.
 * Support never waits on a provider: a clear crisis phrase answers at once, and
 * a loose one gives moderation {@link PHRASE_WAIT_MS} to raise it before it
 * stands. A provider that fails or passes the deadline leaves the other and the
 * phrase floor standing.
 */
export async function checkAnswerSafety(words: string): Promise<SafetyVerdict> {
	const floor = await phraseFloor(words);
	if (floor.level === "crisis") {
		return floor;
	}
	const engine = engineVerdict(words).then((verdict) =>
		levelAbove(floor.level, verdict.level) ? floor : verdict
	);
	if (floor.level === "none") {
		return await engine;
	}
	return await within(engine, PHRASE_WAIT_MS, () => floor);
}

async function classify(words: string, signal: AbortSignal) {
	const prompt = buildClassifierPrompt(words, "", true, "open_prompt");
	const response = await getAnthropicClient().messages.create(
		{
			max_tokens: 512,
			messages: [{ content: prompt.user, role: "user" }],
			model: CLASSIFIER_MODEL,
			system: prompt.system,
			thinking: thinkingOff(CLASSIFIER_MODEL),
		},
		{ ...REQUEST_OPTIONS, signal }
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
		// The question is the client's echo of ours: counted, so it can't carry a payload.
		const length =
			args.answer.length +
			(args.followUp?.question.length ?? 0) +
			(args.followUp?.reply.length ?? 0);
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
