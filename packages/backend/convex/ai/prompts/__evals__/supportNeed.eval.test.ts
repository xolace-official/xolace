/**
 * Live-Haiku eval for the classifier's `supportNeed` grade
 * (docs/paths-v1.md §1 — the kindling trigger).
 *
 * Run: `bun run test:evals`
 * Requires ANTHROPIC_API_KEY (vitest.config.ts loads .env.local). Skips cleanly when
 * the key is absent so CI without secrets stays green.
 *
 * Ordinal grading eval, not a unit test — it calls the real model. A
 * near-miss (off by one grade) is acceptable signal; exact match on the
 * unambiguous anchors is not.
 */
import {
	CLASSIFIER_MODEL,
	getAnthropicClient,
	parseClassificationResponse,
	type SupportNeed,
	thinkingOff,
} from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { type LabeledCase, runLabeledEval } from "./harness.eval";

type Case = LabeledCase<SupportNeed> & {
	input: string;
	entryType?: string;
};

const CASES: Case[] = [
	// --- none: discharged, low-stakes, positive ---
	{
		anchor: true,
		expected: "none",
		input:
			"Honestly just needed to vent about my commute. Feeling better already, thanks.",
		note: "vent complete",
	},
	{
		anchor: true,
		expected: "none",
		input:
			"Feeling really grateful today, the weather is nice and I slept well.",
		note: "positive check-in",
	},
	{
		expected: "none",
		input: "A bit annoyed my coffee order was wrong this morning, no big deal.",
		note: "low intensity",
	},
	{
		expected: "none",
		input:
			"I was frustrated earlier but I talked it through with a friend and we're good now.",
		note: "resolved",
	},

	// --- light: real feeling, not urgent ---
	{
		expected: "light",
		input:
			"Work is busy and a little stressful, I'm managing but it's wearing on me some days.",
		note: "mild, ongoing",
	},
	{
		expected: "light",
		input:
			"I'm nervous about my presentation tomorrow but I think I'm prepared.",
		note: "future-anxiety, grounded, still worth a beat",
	},
	{
		expected: "light",
		input: "Kind of tired, kind of meh, been feeling a little flat this week.",
		note: "low-moderate, not stuck",
	},

	// --- active: unresolved, heavy, but not crisis ---
	{
		anchor: true,
		expected: "active",
		input:
			"I keep replaying how I let everyone down at work. I'm such a fraud and everyone can see it.",
		note: "shame, high intensity, circling",
	},
	{
		expected: "active",
		input:
			"She left and didn't even say why. I don't understand what I did wrong.",
		note: "relational rupture, no resolution",
	},
	{
		expected: "active",
		input: "everything is heavy and i can't put it down no matter what i try",
		note: "stuck, no release",
	},
	{
		anchor: true,
		expected: "active",
		input: "I don't know who I am anymore. Nothing I do feels like mine.",
		note: "identity, present despair",
	},
];

async function classify(c: Case): Promise<SupportNeed> {
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
	return parsed.supportNeed;
}

runLabeledEval("classifier supportNeed eval (live Haiku)", CASES, classify, {
	threshold: 0.7,
});
