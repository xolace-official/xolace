/**
 * Reading intake v2's first answer (#704, #708): the safeguard's verdict, then
 * whichever intake fields the words say clearly. Pure but for the two calls it
 * is handed, so it is tested with both stubbed (reading.test.ts); `read.ts`
 * wires the real ones.
 */
import { type GenericValidator, type Infer, v } from "convex/values";
import {
	intakeAnswerValidators,
	resourceValidator,
} from "../../lib/validators";
import type { Resource, SafeguardLevel } from "../safeguard";
import { buildReaderPrompt, type ReaderPrompt } from "./prompt";

export type SafetyVerdict = { level: SafeguardLevel; resources: Resource[] };

export type FirstAnswerInput = {
	answer: string;
	/** The one follow-up, once answered. Its presence means no second is asked. */
	followUp?: { question: string; reply: string };
};

export type ReadingDeps = {
	/** The safeguard over everything the person said. Never rejects. */
	checkSafety: (text: string) => Promise<SafetyVerdict>;
	/** The reader model's raw text for this prompt. May reject. */
	readFields: (prompt: ReaderPrompt) => Promise<string>;
};

/** The fields worth one follow-up when the answer left them unclear, most worth asking first. */
const KEY_FIELDS = ["weighingOn", "intent"] as const;

/** A field the reader is confident of, and how confident. */
const confidentValidator = <T extends GenericValidator>(value: T) =>
	v.object({ confidence: v.number(), value });

const fieldsValidator = v.object({
	disclosureStyle: v.optional(
		confidentValidator(intakeAnswerValidators.disclosureStyle)
	),
	emotionAwareness: v.optional(
		confidentValidator(intakeAnswerValidators.emotionAwareness)
	),
	intent: v.optional(confidentValidator(intakeAnswerValidators.intent)),
	weighingOn: v.optional(confidentValidator(intakeAnswerValidators.weighingOn)),
});

/**
 * The action's return: the safety route, or the fields to show as chips and at most one
 * follow-up. `fields` go on as chips; `suggested` are shown but left off.
 */
export const readingValidator = v.union(
	v.object({
		resources: v.array(resourceValidator),
		route: v.literal("safety"),
		safeguardLevel: v.union(v.literal("elevated"), v.literal("crisis")),
	}),
	v.object({
		fields: fieldsValidator,
		followUp: v.optional(
			v.object({
				field: v.union(...KEY_FIELDS.map((field) => v.literal(field))),
				question: v.string(),
			})
		),
		route: v.literal("heard"),
		safeguardLevel: v.union(v.literal("none"), v.literal("gentle")),
		/** Read, but not plainly enough to put on: the person taps them on if they fit. */
		suggested: v.optional(fieldsValidator),
	})
);

export type FirstAnswerReading = Infer<typeof readingValidator>;
type HeardReading = Extract<FirstAnswerReading, { route: "heard" }>;
type ReadFields = HeardReading["fields"];
type FollowUp = NonNullable<HeardReading["followUp"]>;
type KeyField = FollowUp["field"];

/** Asked when the reader's own question is missing, off-target or too long. */
const FALLBACK_QUESTIONS: Record<KeyField, string> = {
	intent:
		"What would help most right now: getting through it, or making sense of it?",
	weighingOn:
		"What's it mostly about: work, people, your health, or something else?",
};

/** One short question, not a paragraph. */
const MAX_QUESTION_CHARS = 140;

/** Below this the field is never put on: the person taps it on if it fits, we never guess. */
const CONFIDENCE_FLOOR = 0.7;

/**
 * From here up to {@link CONFIDENCE_FLOOR} a field is only suggested. An answer about how
 * something feels rarely reads above 0.6, and a pick-list with nothing marked after a
 * follow-up reads as not having been heard at all.
 */
const SUGGEST_FLOOR = 0.5;

/** Which reads a pass keeps: the ones to put on, or the ones only to suggest. */
type Band = "confident" | "suggested";

/** The same cap `intake.v2.complete` enforces. */
const MAX_TOPICS = 3;

/** An opt-out is the person's to give, never something read into their words. */
const DECLINED = "prefer_not_to_say";

const valuesOf = <T extends string>(members: readonly { value: T }[]) =>
	members
		.map((m) => m.value)
		.filter(
			(value): value is Exclude<T, typeof DECLINED> => value !== DECLINED
		);

/** Each field's answers, from the validators the save path checks against. */
const ALLOWED = {
	disclosureStyle: valuesOf(intakeAnswerValidators.disclosureStyle.members),
	emotionAwareness: valuesOf(intakeAnswerValidators.emotionAwareness.members),
	intent: valuesOf(intakeAnswerValidators.intent.members),
	weighingOn: valuesOf(intakeAnswerValidators.weighingOn.element.members),
};

const isRecord = (x: unknown): x is Record<string, unknown> =>
	typeof x === "object" && x !== null && !Array.isArray(x);

const isOneOf = <T extends string>(allowed: readonly T[], x: unknown): x is T =>
	allowed.some((value) => value === x);

/** A confidence in [0, 1] inside the band, or null. */
function confidenceIn(raw: Record<string, unknown>, band: Band): number | null {
	const c = raw.confidence;
	if (typeof c !== "number" || !Number.isFinite(c)) {
		return null;
	}
	const confidence = Math.min(Math.max(c, 0), 1);
	const inBand =
		band === "confident"
			? confidence >= CONFIDENCE_FLOOR
			: confidence >= SUGGEST_FLOOR && confidence < CONFIDENCE_FLOOR;
	return inBand ? confidence : null;
}

/** The model's JSON object, out of whatever it wrapped it in. Throws when there is none. */
function parseObject(raw: string): Record<string, unknown> {
	const start = raw.indexOf("{");
	const end = raw.lastIndexOf("}");
	if (start < 0 || end <= start) {
		throw new Error("Reader returned no JSON object");
	}
	const parsed: unknown = JSON.parse(raw.slice(start, end + 1));
	if (!isRecord(parsed)) {
		throw new Error("Reader returned no JSON object");
	}
	return parsed;
}

/** One single-answer field, when read within the band as a value the intake allows. */
function readOne<T extends string>(
	raw: unknown,
	allowed: readonly T[],
	band: Band
) {
	if (!isRecord(raw)) {
		return;
	}
	const confidence = confidenceIn(raw, band);
	const { value } = raw;
	return confidence !== null && isOneOf(allowed, value)
		? { confidence, value }
		: undefined;
}

/** The topics, when read within the band: the allowed ones, deduplicated, at most three. */
function readTopics<T extends string>(
	raw: unknown,
	allowed: readonly T[],
	band: Band
) {
	if (!(isRecord(raw) && Array.isArray(raw.value))) {
		return;
	}
	const confidence = confidenceIn(raw, band);
	const value = [
		...new Set(raw.value.filter((t): t is T => isOneOf(allowed, t))),
	].slice(0, MAX_TOPICS);
	return confidence !== null && value.length > 0
		? { confidence, value }
		: undefined;
}

/** The fields read within the band; the rest are left out, never guessed. */
function fieldsFrom(raw: Record<string, unknown>, band: Band): ReadFields {
	const given = isRecord(raw.fields) ? raw.fields : {};
	const intent = readOne(given.intent, ALLOWED.intent, band);
	const disclosureStyle = readOne(
		given.disclosureStyle,
		ALLOWED.disclosureStyle,
		band
	);
	const emotionAwareness = readOne(
		given.emotionAwareness,
		ALLOWED.emotionAwareness,
		band
	);
	const weighingOn = readTopics(given.weighingOn, ALLOWED.weighingOn, band);
	return {
		...(intent ? { intent } : {}),
		...(weighingOn ? { weighingOn } : {}),
		...(disclosureStyle ? { disclosureStyle } : {}),
		...(emotionAwareness ? { emotionAwareness } : {}),
	};
}

/**
 * At most one follow-up, and only for a key field the reading left out: the
 * reader's question when it targets that field, else a plain one. None for
 * someone just looking around, and none on a read that already had one.
 */
function followUpFor(
	raw: Record<string, unknown>,
	fields: ReadFields,
	alreadyAsked: boolean
): FollowUp | undefined {
	if (alreadyAsked || fields.intent?.value === "just_looking") {
		return undefined;
	}
	const missing = KEY_FIELDS.filter((field) => !fields[field]);
	const [first] = missing;
	if (!first) {
		return undefined;
	}
	const asked = isRecord(raw.followUp) ? raw.followUp : {};
	const question =
		typeof asked.question === "string" ? asked.question.trim() : "";
	const target = missing.find((field) => field === asked.field);
	if (target && question && question.length <= MAX_QUESTION_CHARS) {
		return { field: target, question };
	}
	return { field: first, question: FALLBACK_QUESTIONS[first] };
}

/** Everything the person said, as one text: the answer, then the follow-up reply. */
const wordsOf = (input: FirstAnswerInput) =>
	input.followUp
		? `${input.answer.trim()}\n\n${input.followUp.reply.trim()}`
		: input.answer.trim();

/**
 * Safeguard first: an elevated or crisis verdict returns no fields, whatever
 * the reader said or whether it answered at all. The two calls run side by
 * side for the wait's sake; the reader's result is only looked at once the
 * safeguard has cleared the words.
 */
export async function readFirstAnswer(
	input: FirstAnswerInput,
	deps: ReadingDeps
): Promise<FirstAnswerReading> {
	const words = wordsOf(input);
	const reader = deps.readFields(buildReaderPrompt(input, ALLOWED));
	// Settled here so a veto never leaves the reader's rejection unhandled.
	reader.catch(() => undefined);

	const safety = await deps.checkSafety(words);
	if (safety.level === "elevated" || safety.level === "crisis") {
		return {
			resources: safety.resources,
			route: "safety",
			safeguardLevel: safety.level,
		};
	}
	const raw = parseObject(await reader);
	const fields = fieldsFrom(raw, "confident");
	const suggested = fieldsFrom(raw, "suggested");
	const followUp = followUpFor(raw, fields, !!input.followUp);
	return {
		fields,
		route: "heard",
		safeguardLevel: safety.level,
		...(followUp ? { followUp } : {}),
		...(Object.keys(suggested).length > 0 ? { suggested } : {}),
	};
}
