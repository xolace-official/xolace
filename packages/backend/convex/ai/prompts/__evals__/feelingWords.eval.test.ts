/**
 * Live eval for B10: the classifier and the mirror read the feeling words
 * people pick, labelled apart from what they wrote (`entryForAi`).
 *
 * Run: `bun run test:evals:feeling-words` (ANTHROPIC_API_KEY required; skips
 * cleanly without it). About $0.12 a run: 10 Haiku classifications, then 6
 * Sonnet mirrors, each graded by a Sonnet judge.
 *
 * 1. Classifier (Haiku), labelled by emotion family:
 *    - words alone carry the feeling;
 *    - picked words steer the same plain writing to different feelings;
 *    - one picked word doesn't override writing that is clear on its own.
 * 2. Mirror (Sonnet), checked by code where the rule is exact and by a judge
 *    where it takes reading:
 *    - the mirror reflects the picked words and, when there is any, the
 *      writing, as one moment, holding any tension between them;
 *    - it never presents a tapped word as something they wrote or said.
 */
import { describe, expect, it } from "vitest";
import { emotionFamily } from "../../../lib/understandingVocab";
import {
	ARTICULATOR_MODEL,
	CLASSIFIER_MODEL,
	type ClassificationResult,
	extractTextFromResponse,
	getAnthropicClient,
	parseClassificationResponse,
	thinkingOff,
} from "../../providers/anthropic";
import { entryForAi, ownWords } from "../accumulatedInput";
import { buildArticulatorPrompt, hasMetaNarration } from "../articulator";
import { buildClassifierPrompt } from "../classifier";
import { hasApiKey, type LabeledCase, runLabeledEval } from "./harness.eval";

type EntryType = "word_cloud" | "guided_entry" | "open_prompt" | "voice";

interface Entry {
	entryType: EntryType;
	words: string[];
	/** What they wrote or said. A words-only entry stores the joined words. */
	written?: string;
}

/** What `submitInput` stores: a words-only entry keeps the joined words. */
const rawInputOf = (e: Entry): string =>
	e.entryType === "word_cloud" ? e.words.join(", ") : (e.written ?? "");

const NO_PATTERN = "(no prior pattern context)";

// --- 1. Classifier ---------------------------------------------------------

type FamilyCase = LabeledCase<string> & Entry;

const WORK_WEEK = "Work again. All week. Same thing.";

const FAMILY_CASES: FamilyCase[] = [
	// Words alone carry the feeling.
	{
		anchor: true,
		entryType: "word_cloud",
		expected: "anxiety",
		note: "words only: tight, restless, buzzing",
		words: ["tight", "restless", "buzzing"],
	},
	{
		anchor: true,
		entryType: "word_cloud",
		expected: "numbness",
		note: "words only: numb, flat, far away",
		words: ["numb", "flat", "far away"],
	},
	{
		entryType: "word_cloud",
		expected: "anger",
		note: "words only: hot, clenched, sharp",
		words: ["hot", "clenched", "sharp"],
	},
	// The same plain writing, steered by what they picked.
	{
		entryType: "guided_entry",
		expected: "anxiety",
		note: "plain writing + tight, restless",
		words: ["tight", "restless"],
		written: WORK_WEEK,
	},
	{
		entryType: "guided_entry",
		expected: "numbness",
		note: "plain writing + flat, drained, numb",
		words: ["flat", "drained", "numb"],
		written: WORK_WEEK,
	},
	{
		entryType: "guided_entry",
		expected: "anger",
		note: "plain writing + hot, clenched",
		words: ["hot", "clenched"],
		written: WORK_WEEK,
	},
	{
		entryType: "voice",
		expected: "anxiety",
		note: "voice + tight, restless",
		words: ["tight", "restless"],
		written:
			"um, I don't know, it's just, the exam's tomorrow and I keep going over it",
	},
	// One picked word doesn't override writing that is clear on its own.
	{
		anchor: true,
		entryType: "open_prompt",
		expected: "anger",
		note: "clear anger + tired",
		words: ["tired"],
		written:
			"I'm so angry at him for lying to me again. I could scream. Every single time.",
	},
	{
		entryType: "open_prompt",
		expected: "anxiety",
		note: "clear dread + heavy",
		words: ["heavy"],
		written:
			"The results come out tomorrow and I can't stop imagining the worst. My chest won't unclench.",
	},
	{
		entryType: "open_prompt",
		expected: "joy",
		note: "clear relief + light, warm",
		words: ["light", "warm"],
		written:
			"She called back. We talked for an hour and it felt like before. I can breathe again.",
	},
];

/** The broad emotion: a child reads as its parent (`emotionFamily`). */
const rootOf = (emotion: string): string =>
	emotionFamily(emotion).at(-1) ?? emotion;

async function classifyFamily(c: FamilyCase): Promise<string> {
	const entry = entryForAi({
		entryType: c.entryType,
		rawInput: rawInputOf(c),
		textures: c.words,
	});
	const prompt = buildClassifierPrompt(
		entry,
		NO_PATTERN,
		false,
		c.entryType,
		undefined,
		c.words
	);
	const res = await getAnthropicClient().messages.create({
		max_tokens: 400,
		messages: [{ content: prompt.user, role: "user" }],
		model: CLASSIFIER_MODEL,
		system: prompt.system,
		thinking: thinkingOff(CLASSIFIER_MODEL),
	});
	const parsed = parseClassificationResponse(extractTextFromResponse(res));
	return rootOf(parsed.primaryEmotion);
}

runLabeledEval(
	"B10 classifier reads picked feeling words (live Haiku)",
	FAMILY_CASES,
	classifyFamily,
	{ threshold: 0.8 }
);

// --- 2. Mirror -------------------------------------------------------------

interface MirrorCase extends Entry {
	classification: Pick<
		ClassificationResult,
		"primaryEmotion" | "intensity" | "thematicTags"
	>;
	note: string;
}

const MIRROR_CASES: MirrorCase[] = [
	{
		classification: {
			intensity: 5,
			primaryEmotion: "anxiety",
			thematicTags: [],
		},
		entryType: "word_cloud",
		note: "words only: heavy, restless",
		words: ["heavy", "restless"],
	},
	{
		classification: {
			intensity: 4,
			primaryEmotion: "numbness",
			thematicTags: [],
		},
		entryType: "word_cloud",
		note: "words only: numb, far away, tired",
		words: ["numb", "far away", "tired"],
	},
	{
		classification: {
			intensity: 6,
			primaryEmotion: "stress",
			thematicTags: ["work"],
		},
		entryType: "guided_entry",
		note: "both, together: overcommitted + tight, restless",
		words: ["tight", "restless"],
		written: "Work again, all week. I keep saying yes to things.",
	},
	{
		classification: {
			intensity: 4,
			primaryEmotion: "sadness",
			thematicTags: [],
		},
		entryType: "open_prompt",
		note: "both, pulling apart: 'fine' + heavy, hollow",
		words: ["heavy", "hollow"],
		written: "I'm fine, honestly. It was a normal day.",
	},
	{
		classification: {
			intensity: 5,
			primaryEmotion: "self-doubt",
			thematicTags: ["work"],
		},
		entryType: "voice",
		note: "voice + restless, small",
		words: ["restless", "small"],
		written:
			"I mean, it went okay I guess, the interview, I just keep replaying the end of it",
	},
	{
		classification: {
			intensity: 6,
			primaryEmotion: "loneliness",
			thematicTags: ["relationships"],
		},
		entryType: "guided_entry",
		note: "both, a word they also wrote: heavy (theirs) + lonely (picked)",
		words: ["heavy", "lonely"],
		written: "Everything feels heavy since the move. The flat is so quiet.",
	},
];

const fullClassification = (
	c: MirrorCase["classification"]
): ClassificationResult => ({
	...c,
	primaryEmotionConfidence: 0.8,
	requiresFollowUp: false,
	specificity: 5,
	supportNeed: "light",
	userLanguageTags: [],
});

async function articulate(c: MirrorCase): Promise<string> {
	const own = ownWords({ entryType: c.entryType, rawInput: rawInputOf(c) });
	const prompt = buildArticulatorPrompt({
		classification: fullClassification(c.classification),
		entryType: c.entryType,
		isFirstSession: false,
		mirrorTone: "adaptive",
		patternSummary: NO_PATTERN,
		rawInput: entryForAi({
			entryType: c.entryType,
			rawInput: rawInputOf(c),
			textures: c.words,
		}),
		recentMirrors: [],
		safeguardLevel: "none",
		textures: c.words,
		writtenChars: own.length,
	});
	// As process.ts asks for it.
	const res = await getAnthropicClient().messages.create({
		max_tokens: 300,
		messages: [{ content: prompt.user, role: "user" }],
		model: ARTICULATOR_MODEL,
		system: prompt.system,
		thinking: thinkingOff(ARTICULATOR_MODEL),
	});
	return extractTextFromResponse(res).trim();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const SAID =
	/\byou(?:'ve| have)? (?:said|wrote|written|typed|told me|called it|put it|used the word)\b/i;

/**
 * Exact rule, checked in code: a picked word they never wrote is not quoted,
 * nor named in a sentence that says they said or wrote something. Picking a
 * word is theirs to be told ("you picked restless" passes).
 */
function quotedPickedWords(
	mirror: string,
	words: readonly string[],
	own: string
): string[] {
	const sentences = mirror.split(/(?<=[.!?…])\s+/);
	return words.filter((word) => {
		const w = new RegExp(`\\b${escapeRegExp(word)}\\b`, "i");
		if (w.test(own)) {
			return false;
		}
		const quoted = new RegExp(
			`["“‘']\\s*${escapeRegExp(word)}\\s*[.,!?…]?\\s*["”’']`,
			"i"
		);
		return (
			quoted.test(mirror) || sentences.some((s) => w.test(s) && SAID.test(s))
		);
	});
}

/** Stronger reading than the code can do; the same model the mirror uses. */
const JUDGE_MODEL = "claude-sonnet-5-5";

const RUBRIC = `You grade one "mirror": a short reflection Xolace writes back to someone after they check in. They may have written (or said) something, and they may have tapped some feeling words from a list. Judge only the MIRROR against what they gave. Each criterion is binary; when one doesn't apply, it passes.

- words: the mirror reflects what the picked feeling words carry. Paraphrase or a fitting image counts; it need not repeat them.
- writing: only when they wrote or said something: the mirror reflects it, not just the picked words.
- together: only when there is both writing and picked words: the mirror reads them as one moment, rather than two separate replies stapled together. When the writing and the words pull apart (say "fine" beside heavy words), it holds both sides or names the gap, without calling them a liar and without dropping either side.
- source: it never presents a picked word as something they wrote or said, and never claims they wrote or said anything when they only picked words. Saying they picked or chose a word passes. A word that appears in their own writing may be quoted.

Answer with JSON only: {"words": {"pass": true, "why": "..."}, "writing": {...}, "together": {...}, "source": {...}}. Keep each "why" to one short sentence.`;

const JUDGED = ["words", "writing", "together", "source"] as const;

async function judge(c: MirrorCase, mirror: string): Promise<string[]> {
	const own = ownWords({ entryType: c.entryType, rawInput: rawInputOf(c) });
	const context = [
		`WHAT THEY ${c.entryType === "voice" ? "SAID" : "WROTE"}: ${own || "(nothing)"}`,
		`FEELING WORDS THEY PICKED: ${c.words.join(", ")}`,
		`MIRROR:\n${mirror}`,
	].join("\n\n");
	const res = await getAnthropicClient().messages.create({
		max_tokens: 600,
		messages: [{ content: context, role: "user" }],
		model: JUDGE_MODEL,
		system: RUBRIC,
		thinking: thinkingOff(JUDGE_MODEL),
	});
	const text = extractTextFromResponse(res);
	const verdict = JSON.parse(
		text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)
	) as Record<string, { pass?: boolean; why?: string }>;
	return JUDGED.filter((k) => verdict[k]?.pass !== true).map(
		(k) => `${k}: ${verdict[k]?.why ?? "no verdict"}`
	);
}

const MIRROR_TIMEOUT_MS = 90_000;

describe("B10 mirror reads picked feeling words (live Sonnet + judge)", () => {
	for (const c of MIRROR_CASES) {
		it.skipIf(!hasApiKey())(
			c.note,
			async () => {
				const mirror = await articulate(c);
				const own = ownWords({
					entryType: c.entryType,
					rawInput: rawInputOf(c),
				});
				const problems = [
					...(mirror ? [] : ["empty mirror"]),
					...(hasMetaNarration(mirror) ? ["meta narration"] : []),
					...quotedPickedWords(mirror, c.words, own).map(
						(w) => `presents the picked word "${w}" as theirs`
					),
					...(await judge(c, mirror)),
				];
				// Logged on a pass too, so a run shows what the mirror wrote.
				console.log(`[${c.note}]\n${mirror}`);
				expect(problems, `${mirror}\n\n${problems.join("\n")}`).toEqual([]);
			},
			MIRROR_TIMEOUT_MS
		);
	}
});
