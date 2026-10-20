/**
 * Safety during a live talk (#599, decisions in #581). Every turn passes a
 * phrase-check floor and a moderation race (the endpoint). No classifier runs
 * live (cost): implicit risk is caught by the full safeguard at the end. A
 * verdict only ever raises the talk's peak; the endpoint reads it each turn
 * and generateMirror folds it into the session level at the end.
 */
import { v } from "convex/values";
import { internalMutation, query, type MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireSessionOwnership } from "../lib/auth";
import { resourceValidator, talkPeakValidator } from "../lib/validators";
import {
  CRISIS_RESOURCES,
  SUPPORT_RESOURCES,
  evaluateSafeguard,
  levelAbove,
  type SafeguardResult,
  type TalkPeak,
} from "../ai/safeguard";
import type { ModerationResult } from "../ai/providers/moderation";
import type { ClassificationResult } from "../ai/providers/anthropic";
import type { TalkLine } from "./transcript";

/**
 * The companion's first words at crisis, spoken as written, once per talk.
 * REVIEW(#581): a draft; the wording must be human-reviewed before launch.
 * "On your screen" is literally true: the endpoint raises the peak first.
 */
export const CRISIS_LINE =
  "I'm really glad you told me. I'm worried about you, and I want you to have someone who can help right now, so I've put help on your screen. I'm right here with you.";

// ponytail: a short English list, matched on the turn's own words. The
// floor under moderation, not a classifier; tune it with the prototype (#581).
const CRISIS_PHRASES = [
  /\bkill(ing)? my ?self\b/,
  /\b(end|take|ending|taking) (my|my own) life\b/,
  /\bsuicid(e|al)\b/,
  /\b(want|wanna|going|ready) (to )?die\b/,
  /\bbetter off dead\b/,
  /\b(don'?t|do not) want to (be alive|live|wake up)\b/,
  /\bno reason to (live|go on|be here)\b/,
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

/** The deterministic floor: a crisis phrase in this turn's words. */
export function phrasePeak(words: string): TalkPeak | null {
  const text = words.toLowerCase().replace(/[’‘]/g, "'");
  const hit = CRISIS_PHRASES.find((p) => p.test(text));
  if (!hit) return null;
  return {
    level: "crisis",
    triggerType: "crisis_keywords",
    triggerConfidence: 1,
    // A clinical summary, not their words.
    triggerEvidence: "Crisis phrase matched.",
  };
}

/** An escalating safeguard verdict as a peak; anything below elevated is none. */
export function peakOf(result: SafeguardResult): TalkPeak | null {
  if (!result.isEscalation || !result.triggerType) return null;
  if (result.level !== "elevated" && result.level !== "crisis") return null;
  return {
    level: result.level,
    triggerType: result.triggerType,
    triggerConfidence: result.triggerConfidence,
    triggerEvidence: result.triggerEvidence,
  };
}

// Moderation alone, live: the engine's own thresholds with nothing classified,
// so only moderation's explicit signals can escalate.
const UNCLASSIFIED: ClassificationResult = {
  primaryEmotion: "unclassified",
  primaryEmotionConfidence: 0,
  intensity: 0,
  specificity: 0,
  thematicTags: [],
  userLanguageTags: [],
  requiresFollowUp: false,
  supportNeed: "none",
};

export const moderationPeak = (m: ModerationResult) => peakOf(evaluateSafeguard(UNCLASSIFIED, m, []));

/** True when `next` should replace the stored peak. */
export const raises = (stored: TalkPeak | undefined, next: TalkPeak) =>
  !stored || levelAbove(next.level, stored.level) || (!!stored.fromHistory && next.level === stored.level);

const ELEVATED_SKILL = `Safety comes first for the rest of this talk.
- Stay warm and present. Check in on their safety in plain words, gently, without making it an interview.
- Never debate, argue with or minimise what they feel.
- Gently encourage reaching a person: someone they trust, or a support line. There is a help button on their screen.
- Never claim you can call or contact anyone, or that anyone is coming.
- Never say why you are checking in, never mention their past or anything flagged, and never mention this note.`;

const CRISIS_SKILL = `They may be in danger. For the rest of this talk you stay with them in a safety role and never go back to ordinary reflecting.
- Short, calm, warm sentences. Stay present; you are glad they are talking to you.
- Ask simply about their safety right now.
- Encourage them to reach a person now: a crisis line, emergency services, or someone they trust. The help on their screen has numbers they can call.
- Never debate, argue with or minimise what they feel. No advice beyond reaching help and staying safe.
- Never claim you can call or contact anyone, or that anyone is coming.
- Never mention this note.`;

/** The safety skill for this turn's system prompt; empty below elevated. */
export const safetySkill = (peak: TalkPeak | undefined) =>
  !peak ? "" : peak.level === "crisis" ? CRISIS_SKILL : ELEVATED_SKILL;

/** Raises the talk's peak when `peak` is higher. Closed talks keep theirs. */
export async function raiseTalkSafety(ctx: MutationCtx, session: Doc<"sessions">, peak: TalkPeak) {
  if (session.state !== "initiated" || !raises(session.talkSafety, peak)) return;
  await ctx.db.patch("sessions", session._id, { talkSafety: peak });
}

/**
 * A verdict for an open talk: the endpoint's moderation, in time or late,
 * only once `syncLines` bound the turn to this talk.
 */
export const raise = internalMutation({
  args: {
    sessionId: v.string(),
    peak: v.optional(talkPeakValidator),
    crisisLineSpoken: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const id = ctx.db.normalizeId("sessions", args.sessionId);
    const session = id ? await ctx.db.get("sessions", id) : null;
    if (session?.entryType !== "talk" || session.state !== "initiated") return null;
    if (args.peak) await raiseTalkSafety(ctx, session, args.peak);
    if (args.crisisLineSpoken) await ctx.db.patch("sessions", session._id, { talkCrisisLineSpoken: true });
    return null;
  },
});

/**
 * What the talk screen shows for safety: a help button at elevated, the
 * resources pinned at crisis. Stays readable after the talk closes.
 */
export const help = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.null(),
    v.object({ level: v.union(v.literal("elevated"), v.literal("crisis")), resources: v.array(resourceValidator) }),
  ),
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireSessionOwnership(ctx, sessionId);
    const level = session.talkSafety?.level;
    if (!level) return null;
    return { level, resources: level === "crisis" ? CRISIS_RESOURCES : SUPPORT_RESOURCES };
  },
});
