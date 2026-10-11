import type { SupportNeed } from "../providers/anthropic";
import type { PremiumTier } from "../../lib/premium";
import type { CatalogEntry } from "./catalog";
import type { Compounding } from "../../compounding/stretches";

/**
 * Kindling generation prompt + parser (docs/paths-v1.md §2.2, #331).
 *
 * One Haiku call, no tool loop. The model picks 3–4 action TYPES from the
 * catalog and writes one user-facing `why` line per pick. Negative examples
 * only (repo precedent: feedback_prompt_examples_cause_fixation — positive
 * examples make the model fixate and mode-collapse toward them).
 *
 * The exact wording is a tuning loop against the live model; the validator
 * below is the fixed contract the loop tunes toward.
 */

export interface PathsPromptUnderstanding {
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  specificity: number;
  thematicTags: string[];
  userLanguageTags: string[];
  temporalContext?: string;
  supportNeed: SupportNeed;
  safeguardLevel?: string;
}

/** A compounding domain tonight's session touched (#521). Context, never a rule. */
export type PromptCompounding = Pick<Compounding, "domain" | "state" | "returning"> & {
  days: number; // since the stretch began
};

export interface PathsPromptContext {
  understanding: PathsPromptUnderstanding;
  profile: string | null; // rendered semantic profile; null on cold start
  catalog: readonly CatalogEntry[]; // already filtered to what can bind
  tier: PremiumTier; // prompt framing only, never a branch
  compounding?: readonly PromptCompounding[]; // already gated upstream; empty = no line
}

export interface PickedTwig {
  actionType: string;
  order: number;
  why: string;
}

export type DropReason =
  | "unparseable"
  | "not_object"
  | "unknown_action_type"
  | "duplicate_action_type"
  | "why_missing"
  | "why_length"
  | "why_sentences"
  | "why_person"
  | "why_vocabulary"
  | "why_promise"
  | "over_max"
  | "unbindable";

export interface Dropped {
  actionType: string | null;
  reason: DropReason;
}

export const MIN_TWIGS = 3;
export const MAX_TWIGS = 4;
// Wider than the prompt's "roughly 12–22": Haiku overshoots "roughly" by a
// few words routinely, and a drop here can sink the whole kindling.
const WHY_MIN_WORDS = 8;
const WHY_MAX_WORDS = 32;

// The banned clinical register (§2.2), matched on stems so "anxious",
// "coping", "regulation", "grounded", "managing" all fail too.
const BANNED_WHY = /\b(anxi|symptom|cop(e|es|ed|ing)\b|regulat|ground(ing|ed)\b|manag)/i;

// Compounding is context for the pick, never something the why line says
// (#521): not the word, not "your usual", not how long it has weighed.
const COMPOUNDING_WHY = /compound|\busual\b|\b(\d+|few|couple of) days\b|\bweeks?\b|\bmonths?\b/i;

// Outcome promises (§2.2 "Do NOT promise an outcome"): "this will help",
// "you'll feel calmer", "proven to", "guaranteed". Modal forms only — a bare
// "you feel" is usually the person's own words being quoted back.

const PROMISE_WHY =
  /\b(will|would|going to) (help|calm|ease|make|feel|work)\b|\byou('ll| will|'d| would) feel\b|\b(proven|guaranteed)\b/i;

export function buildPathsPrompt(ctx: PathsPromptContext): {
  system: string;
  user: string;
} {
  const system = `You choose what Xolace quietly offers a person after they have sat with a feeling. Xolace is a digital campfire, the fire helps someone see what they are carrying; it is not a therapist and never sounds like one.

Pick exactly ${MAX_TWIGS} actions from the catalog below that fit this person right now, order them, and for each write one "why" line the person will read under the action.

## The why line
- Second person, present tense.
- Names something they actually said or came back to in this session (their own words are listed under "their words").
- States plainly what the action is. Nothing more.
- One sentence, two beats, roughly 12–22 words.

## What NOT to do
- Do NOT promise an outcome or make a claim ("this will help", "you'll feel calmer", "proven to").
- Do NOT use clinical words, never anxiety, symptoms, cope, regulate, grounding, manage, or anything that sounds like a clinic.
- Do NOT label, or explain the person to themselves.
- Do NOT give advice, reassurance, or silver linings.
- Do NOT invent details they did not say.
- Do NOT write more than one sentence, and do NOT stack clauses to smuggle a second one in.
- Do NOT pick the same action twice, and do NOT pick an action that is not in the catalog.
- Do NOT pick two spoken support-audio actions (\`audio_topic_*\`) together, and do NOT pick two instrumental music actions (\`music_topic_*\`) together — vary it: one spoken and one music is good, or pair either with breathing or xolacer.
- Do NOT pick "xolacer" unless they seem to want a person rather than a tool.
- Do NOT mention Xolace, the app, the model, or the catalog in the why line.
- Do NOT mention how long something has weighed on them, any number, or what is "usual" for them in the why line; "weighing on them lately" is background for your pick only.

## Output
Respond with ONLY a JSON array, no fences, no prose:
[{"actionType": "<catalog key>", "order": 1, "why": "..."}, ...]`;

  const u = ctx.understanding;
  const understandingBlock = [
    `- feeling: ${u.primaryEmotion}${u.granularLabel ? ` (${u.granularLabel})` : ""}`,
    `- intensity: ${u.intensity}/10, specificity: ${u.specificity}/10`,
    u.thematicTags.length > 0 ? `- themes: ${u.thematicTags.join(", ")}` : null,
    u.userLanguageTags.length > 0
      ? `- their words: ${u.userLanguageTags.map((t) => `"${t}"`).join(", ")}`
      : null,
    u.temporalContext ? `- focus: ${u.temporalContext.replace("_", " ")}` : null,
    ctx.compounding?.length
      ? `- weighing on them lately: ${ctx.compounding.map(compoundingPhrase).join("; ")}`
      : null,
    `- support need: ${u.supportNeed}`,
  ]
    .filter((line): line is string => !!line)
    .join("\n");

  const profileBlock = ctx.profile
    ? `## What Xolace knows about this person over time\n${ctx.profile}`
    : `## What Xolace knows about this person over time\n(none yet, this is a first read)`;

  const catalogBlock = ctx.catalog
    .map((c) => `- ${c.actionType}: ${c.modelDescription}`)
    .join("\n");

  const user = `## This session\n${understandingBlock}\n\n${profileBlock}\n\n## Catalog (${ctx.tier} member — every action is available)\n${catalogBlock}`;

  return { system, user };
}

function roughDuration(days: number): string {
  if (days < 7) return "a few days";
  if (days < 11) return "about a week";
  if (days < 60) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

const compoundingPhrase = (c: PromptCompounding) =>
  [`${c.domain} for ${roughDuration(c.days)}`, c.state === "easing" ? "easing" : null, c.returning ? "returning" : null]
    .filter((part): part is string => !!part)
    .join(", ");

function validateWhy(why: unknown): DropReason | null {
  if (typeof why !== "string" || !why.trim()) return "why_missing";
  const text = why.trim();
  const words = text.split(/\s+/).length;
  if (words < WHY_MIN_WORDS || words > WHY_MAX_WORDS) return "why_length";
  // One sentence: a terminator followed by a new capitalised sentence. Not
  // any following text — "e.g. the" and "wait... then" are still one.
  if (/[.!?]\s+[A-Z]/.test(text)) return "why_sentences";
  if (!/\byou(r|'re|'ve|'d)?\b/i.test(text)) return "why_person";
  if (BANNED_WHY.test(text) || COMPOUNDING_WHY.test(text)) return "why_vocabulary";
  if (PROMISE_WHY.test(text)) return "why_promise";
  return null;
}

/**
 * Parse and validate the model's array. Invalid entries are dropped, never
 * repaired or retried (§5); the caller decides whether ≥ MIN_TWIGS survive.
 * Surviving twigs are re-ordered by the model's `order` and renumbered 1..n
 * so a drop never leaves a gap.
 */
export function parsePathsResponse(
  raw: string,
  catalog: readonly CatalogEntry[],
): { twigs: PickedTwig[]; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  let parsed: unknown;
  try {
    parsed = JSON.parse(start >= 0 && end > start ? raw.slice(start, end + 1) : raw);
  } catch {
    parsed = undefined;
  }
  if (!Array.isArray(parsed)) {
    return { twigs: [], dropped: [{ actionType: null, reason: "unparseable" }] };
  }

  const keys = new Set(catalog.map((c) => c.actionType));
  const seen = new Set<string>();
  const kept: PickedTwig[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      dropped.push({ actionType: null, reason: "not_object" });
      continue;
    }
    const { actionType, order, why } = item as Record<string, unknown>;
    const key = typeof actionType === "string" ? actionType : null;
    if (!key || !keys.has(key)) {
      dropped.push({ actionType: key, reason: "unknown_action_type" });
      continue;
    }
    if (seen.has(key)) {
      dropped.push({ actionType: key, reason: "duplicate_action_type" });
      continue;
    }
    const whyReason = validateWhy(why);
    if (whyReason) {
      dropped.push({ actionType: key, reason: whyReason });
      continue;
    }
    seen.add(key);
    kept.push({
      actionType: key,
      order: typeof order === "number" && Number.isFinite(order) ? order : kept.length + 1,
      why: (why as string).trim(),
    });
  }

  kept.sort((a, b) => a.order - b.order);
  const twigs = kept.slice(0, MAX_TWIGS).map((t, i) => ({ ...t, order: i + 1 }));
  for (const extra of kept.slice(MAX_TWIGS)) {
    dropped.push({ actionType: extra.actionType, reason: "over_max" });
  }
  return { twigs, dropped };
}
