/**
 * Live-Haiku eval for the classifier's `requiresFollowUp` flag.
 *
 * Run: `bun run test:evals`
 * Requires ANTHROPIC_API_KEY (vitest.config.ts loads .env.local). Skips cleanly when
 * the key is absent so CI without secrets stays green.
 *
 * This is a calibration eval, not a unit test — it calls the real model. A
 * couple of borderline misses are acceptable signal, not a hard failure; the
 * suite asserts overall accuracy >= 0.8 across the labeled set plus exact
 * correctness on the unambiguous anchors.
 *
 * A second suite checks the rubric line the model says it applied
 * (`followUpReasonCode`), on the same answers: one model call per case serves
 * both. A miss there reads "no/future_worry" or "yes/unknown", which shows
 * which rule the model followed. `codes` lists every line a careful reader
 * could pick for the case.
 */
import type { FollowUpReasonCode } from "../../../lib/followUpCadence";
import {
	CLASSIFIER_MODEL,
	type ClassificationResult,
	getAnthropicClient,
	parseClassificationResponse,
	thinkingOff,
} from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { type LabeledCase, runLabeledEval } from "./harness.eval";

type Case = LabeledCase<boolean> & {
	input: string;
	entryType?: string;
	/** The rubric lines that fit this case; the first is the most likely. */
	codes: FollowUpReasonCode[];
};

const CASES: Case[] = [
	// --- true: unresolved, high-stakes ---
	{
		anchor: true,
		codes: ["grief"],
		expected: true,
		input:
			"My dad died three months ago and I still can't open his last text to me. It just sits there.",
		note: "grief, past-focused, unresolved",
	},
	{
		anchor: true,
		codes: ["shame_guilt", "identity_despair"],
		expected: true,
		input:
			"I keep replaying how I let everyone down at work. I'm such a fraud and everyone can see it.",
		note: "shame, high intensity",
	},
	{
		codes: ["relational_rupture"],
		expected: true,
		input:
			"She left and didn't even say why. I don't understand what I did wrong.",
		note: "relational rupture, no resolution",
	},
	{
		codes: ["identity_despair"],
		expected: true,
		input: "I don't know who I am anymore. Nothing I do feels like mine.",
		note: "identity, present despair",
	},
	{
		codes: ["stuck"],
		expected: true,
		input: "everything is heavy and i can't put it down no matter what i try",
		note: "stuck, no release",
	},
	{
		codes: ["grief"],
		expected: true,
		input: "I miss my mom so much it physically hurts and it's been years.",
		note: "grief, enduring",
	},
	{
		codes: ["shame_guilt", "identity_despair"],
		expected: true,
		input:
			"I feel like I'm failing as a parent and my kids deserve better than me.",
		note: "shame/self-worth",
	},
	{
		codes: ["relational_rupture"],
		expected: true,
		input:
			"We had a huge fight and he said things he can't take back. I don't know if we recover from this.",
		note: "rupture, unresolved",
	},

	// --- false: discharged / low stakes / future-anxiety / positive ---
	{
		anchor: true,
		codes: ["discharged"],
		expected: false,
		input:
			"Honestly just needed to vent about my commute. Feeling better already, thanks.",
		note: "vent complete",
	},
	{
		anchor: true,
		codes: ["low_intensity", "no_trigger"],
		expected: false,
		input: "A bit annoyed my coffee order was wrong this morning, no big deal.",
		note: "low intensity",
	},
	{
		codes: ["future_worry"],
		expected: false,
		input:
			"I'm nervous about my presentation tomorrow but I think I'm prepared.",
		note: "future-focused anxiety, grounded",
	},
	{
		anchor: true,
		codes: ["positive"],
		expected: false,
		input:
			"Feeling really grateful today, the weather is nice and I slept well.",
		note: "positive check-in",
	},
	{
		codes: ["general_stress"],
		expected: false,
		input: "Work is busy and a little stressful but nothing I can't handle.",
		note: "general stress",
	},
	{
		codes: ["low_intensity", "no_trigger"],
		expected: false,
		input: "Kind of tired, kind of meh. Just checking in.",
		note: "low intensity, hedged",
	},
	{
		codes: ["positive"],
		expected: false,
		input: "Excited about the trip next week! So much to plan.",
		note: "positive, future",
	},
	{
		codes: ["discharged"],
		expected: false,
		input:
			"I was frustrated earlier but I talked it through with a friend and we're good now.",
		note: "resolved",
	},
];

/** One live call per case, shared by both suites. */
const answers = new Map<Case, Promise<ClassificationResult>>();

function classify(c: Case): Promise<ClassificationResult> {
	const cached = answers.get(c);
	if (cached) {
		return cached;
	}
	const answer = (async () => {
		const prompt = buildClassifierPrompt(
			c.input,
			"(no prior pattern context)",
			false,
			c.entryType ?? "open_prompt"
		);
		const anthropic = getAnthropicClient();
		// Production's budget (classifierAction): the reason fields add tokens.
		const res = await anthropic.messages.create({
			max_tokens: 512,
			messages: [{ content: prompt.user, role: "user" }],
			model: CLASSIFIER_MODEL,
			system: prompt.system,
			thinking: thinkingOff(CLASSIFIER_MODEL),
		});
		const raw = res.content.find((b) => b.type === "text");
		return parseClassificationResponse(
			raw && raw.type === "text" ? raw.text : "{}"
		);
	})();
	answers.set(c, answer);
	return answer;
}

runLabeledEval(
	"classifier requiresFollowUp eval (live Haiku)",
	CASES,
	async (c) => (await classify(c)).requiresFollowUp,
	{
		threshold: 0.8,
	}
);

const side = (flag: boolean) => (flag ? "yes" : "no");

/** Expected as "yes/grief"; a fitting answer maps onto it, a miss shows itself. */
const CODE_CASES = CASES.map((c) => ({
	...c,
	// Only the clearest cases anchor the code: the others may fit two lines.
	anchor: c.anchor === true && c.codes.length === 1,
	expected: `${side(c.expected)}/${c.codes[0]}`,
	source: c,
}));

runLabeledEval(
	"classifier followUpReasonCode eval (live Haiku, same answers)",
	CODE_CASES,
	async (c) => {
		const r = await classify(c.source);
		const code = r.followUpReasonCode ?? "unknown";
		return r.requiresFollowUp === c.source.expected && c.codes.includes(code)
			? c.expected
			: `${side(r.requiresFollowUp)}/${code}`;
	},
	{
		// Below the flag's 0.8: a right flag on a neighbouring line is a miss here.
		threshold: 0.7,
	}
);
