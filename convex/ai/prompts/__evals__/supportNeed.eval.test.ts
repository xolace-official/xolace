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
import { getAnthropicClient, parseClassificationResponse, CLASSIFIER_MODEL, thinkingOff, type SupportNeed } from "../../providers/anthropic";
import { buildClassifierPrompt } from "../classifier";
import { runLabeledEval, type LabeledCase } from "./harness.eval";

type Case = LabeledCase<SupportNeed> & {
  input: string;
  entryType?: string;
};

const CASES: Case[] = [
  // --- none: discharged, low-stakes, positive ---
  { input: "Honestly just needed to vent about my commute. Feeling better already, thanks.", expected: "none", anchor: true, note: "vent complete" },
  { input: "Feeling really grateful today, the weather is nice and I slept well.", expected: "none", anchor: true, note: "positive check-in" },
  { input: "A bit annoyed my coffee order was wrong this morning, no big deal.", expected: "none", note: "low intensity" },
  { input: "I was frustrated earlier but I talked it through with a friend and we're good now.", expected: "none", note: "resolved" },

  // --- light: real feeling, not urgent ---
  { input: "Work is busy and a little stressful, I'm managing but it's wearing on me some days.", expected: "light", note: "mild, ongoing" },
  { input: "I'm nervous about my presentation tomorrow but I think I'm prepared.", expected: "light", note: "future-anxiety, grounded, still worth a beat" },
  { input: "Kind of tired, kind of meh, been feeling a little flat this week.", expected: "light", note: "low-moderate, not stuck" },

  // --- active: unresolved, heavy, but not crisis ---
  { input: "I keep replaying how I let everyone down at work. I'm such a fraud and everyone can see it.", expected: "active", anchor: true, note: "shame, high intensity, circling" },
  { input: "She left and didn't even say why. I don't understand what I did wrong.", expected: "active", note: "relational rupture, no resolution" },
  { input: "everything is heavy and i can't put it down no matter what i try", expected: "active", note: "stuck, no release" },
  { input: "I don't know who I am anymore. Nothing I do feels like mine.", expected: "active", anchor: true, note: "identity, present despair" },
];

async function classify(c: Case): Promise<SupportNeed> {
  const prompt = buildClassifierPrompt(c.input, "(no prior pattern context)", false, c.entryType ?? "open_prompt");
  const anthropic = getAnthropicClient();
  const res = await anthropic.messages.create({
    model: CLASSIFIER_MODEL,
    max_tokens: 400,
    thinking: thinkingOff(CLASSIFIER_MODEL),
    system: prompt.system,
    messages: [{ role: "user", content: prompt.user }],
  });
  const raw = res.content.find((b) => b.type === "text");
  const parsed = parseClassificationResponse(raw && raw.type === "text" ? raw.text : "{}");
  return parsed.supportNeed;
}

runLabeledEval("classifier supportNeed eval (live Haiku)", CASES, classify, {
  threshold: 0.7,
});
