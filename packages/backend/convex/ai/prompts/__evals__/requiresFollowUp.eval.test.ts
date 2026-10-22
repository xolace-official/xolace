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
 */
import {
	CLASSIFIER_MODEL,
	getAnthropicClient,
	parseClassificationResponse,
	thinkingOff,
} from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { type LabeledCase, runLabeledEval } from "./harness.eval";

type Case = LabeledCase<boolean> & {
	input: string;
	entryType?: string;
};

const CASES: Case[] = [
	// --- true: unresolved, high-stakes ---
	{
		anchor: true,
		expected: true,
		input:
			"My dad died three months ago and I still can't open his last text to me. It just sits there.",
		note: "grief, past-focused, unresolved",
	},
	{
		anchor: true,
		expected: true,
		input:
			"I keep replaying how I let everyone down at work. I'm such a fraud and everyone can see it.",
		note: "shame, high intensity",
	},
	{
		expected: true,
		input:
			"She left and didn't even say why. I don't understand what I did wrong.",
		note: "relational rupture, no resolution",
	},
	{
		expected: true,
		input: "I don't know who I am anymore. Nothing I do feels like mine.",
		note: "identity, present despair",
	},
	{
		expected: true,
		input: "everything is heavy and i can't put it down no matter what i try",
		note: "stuck, no release",
	},
	{
		expected: true,
		input: "I miss my mom so much it physically hurts and it's been years.",
		note: "grief, enduring",
	},
	{
		expected: true,
		input:
			"I feel like I'm failing as a parent and my kids deserve better than me.",
		note: "shame/self-worth",
	},
	{
		expected: true,
		input:
			"We had a huge fight and he said things he can't take back. I don't know if we recover from this.",
		note: "rupture, unresolved",
	},

	// --- false: discharged / low stakes / future-anxiety / positive ---
	{
		anchor: true,
		expected: false,
		input:
			"Honestly just needed to vent about my commute. Feeling better already, thanks.",
		note: "vent complete",
	},
	{
		anchor: true,
		expected: false,
		input: "A bit annoyed my coffee order was wrong this morning, no big deal.",
		note: "low intensity",
	},
	{
		expected: false,
		input:
			"I'm nervous about my presentation tomorrow but I think I'm prepared.",
		note: "future-focused anxiety, grounded",
	},
	{
		anchor: true,
		expected: false,
		input:
			"Feeling really grateful today, the weather is nice and I slept well.",
		note: "positive check-in",
	},
	{
		expected: false,
		input: "Work is busy and a little stressful but nothing I can't handle.",
		note: "general stress",
	},
	{
		expected: false,
		input: "Kind of tired, kind of meh. Just checking in.",
		note: "low intensity, hedged",
	},
	{
		expected: false,
		input: "Excited about the trip next week! So much to plan.",
		note: "positive, future",
	},
	{
		expected: false,
		input:
			"I was frustrated earlier but I talked it through with a friend and we're good now.",
		note: "resolved",
	},
];

async function classify(c: Case): Promise<boolean> {
	const prompt = buildClassifierPrompt(
		c.input,
		"(no prior pattern context)",
		false,
		c.entryType ?? "open_prompt"
	);
	const anthropic = getAnthropicClient();
	const res = await anthropic.messages.create({
		max_tokens: 400,
		messages: [{ content: prompt.user, role: "user" }],
		model: CLASSIFIER_MODEL,
		system: prompt.system,
		thinking: thinkingOff(CLASSIFIER_MODEL),
	});
	const raw = res.content.find((b) => b.type === "text");
	const parsed = parseClassificationResponse(
		raw && raw.type === "text" ? raw.text : "{}"
	);
	return parsed.requiresFollowUp;
}

runLabeledEval(
	"classifier requiresFollowUp eval (live Haiku)",
	CASES,
	classify,
	{
		threshold: 0.8,
	}
);
