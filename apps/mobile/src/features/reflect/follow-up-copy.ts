/**
 * Copy + response sets for the follow-up check-in sheet.
 *
 * The check-in surfaces a day or so after a session that left something
 * unresolved. The card's sentence (`cardText`) is written server-side per
 * session; this file owns the static chrome: the response chips, the
 * tier-aware chip selection, and the resolution acknowledgment.
 *
 * Mirrors the shape of return-welcome-copy.ts (sibling sheet).
 */

import { isStreakMilestone, streakMilestoneCopy } from "@/convex/streaks/milestones";
import { getStreakCopy } from "@/src/features/reflect/streak-copy";

export type FollowUpResponse =
  | "lighter"
  | "still_here"
  | "heavier"
  | "processed"
  | "vent";

export type FollowUpTier = "acute" | "elevated" | "standard";

export type StatusResponse = Exclude<FollowUpResponse, "vent">;
type Chip = { key: StatusResponse; label: string };

// How-is-it-sitting-now self-report. These are a single group answering one
// question — they are NOT the same kind of action as `vent`, which leaves the
// sheet for the voice-vent screen and is rendered as a separate doorway below.
const CHIPS: Record<StatusResponse, Chip> = {
  lighter: { key: "lighter", label: "Feeling lighter" },
  still_here: { key: "still_here", label: "Still sitting with it" },
  heavier: { key: "heavier", label: "Got heavier" },
  processed: { key: "processed", label: "I worked through it" },
};

/**
 * Tier-aware status-chip set (the "how's it sitting now?" answers only — the
 * `vent` doorway is rendered separately, see VENT_*).
 * - Acute (crisis, ~45 min after): presence-first. `still_here` / `lighter`
 *   only; OMIT `processed` (reads glib so soon after a crisis). Resources link
 *   is rendered separately too.
 * - Elevated / Standard: the full self-report set.
 */
export function chipsForTier(tier: FollowUpTier): Chip[] {
  if (tier === "acute") {
    return [CHIPS.still_here, CHIPS.lighter];
  }
  return [CHIPS.lighter, CHIPS.still_here, CHIPS.heavier, CHIPS.processed];
}

/** Headline when a restored/deep-linked route arrives without the card's sentence. */
export const FOLLOW_UP_FALLBACK_HEADLINE = "How is it sitting with you now?";

/** The vent doorway — a separate kind of action from the status chips. */
export const VENT_LABEL = "Let it out";
export const VENT_SUBLABEL = "Say it out loud - nothing is kept";
export const VENT_A11Y_LABEL = "Let it out - open voice vent, your voice is never stored";

/** The answers whose next step is the reflective prompt (#449 lighter, #450 processed). */
export type ReflectiveAnswer = "lighter" | "processed";

/**
 * Per-answer copy for the reflective step. `processed` is the clearest
 * resolution signal, so it also carries an always-on milestone line that
 * sits above the streak nod.
 */
export const REFLECTIVE_COPY: Record<
  ReflectiveAnswer,
  { prompt: string; placeholder: string; inputA11y: string; milestone?: string }
> = {
  lighter: {
    prompt: "Good to hear. What helped?",
    placeholder: "A walk, a person, a song… or nothing you can name",
    inputA11y: "What helped? Optional",
  },
  processed: {
    prompt: "You worked through it. What got you there?",
    placeholder: "A realization, a conversation, time… or nothing you can name",
    inputA11y: "What got you there? Optional",
    milestone: "You set this one down. That's yours to keep.",
  },
};
export const REFLECTIVE_SHARE_LABEL = "Share anonymously with others who feel this";
export const REFLECTIVE_DONE = "Done";
export const REFLECTIVE_SAVING = "Saving…";
export const REFLECTIVE_SKIP = "Skip for now";
export const REFLECTIVE_SAVED = "Saved.";
export const REFLECTIVE_SAVED_SHARED = "Saved. It will be shared anonymously.";

/**
 * The streak nod on a lighter/processed answer — existing streak copy only
 * (push milestone lines first, then the calendar's per-day lines).
 */
export function streakNod(streak: number): string | null {
  if (streak <= 0) return null;
  if (isStreakMilestone(streak)) return streakMilestoneCopy(streak);
  return getStreakCopy(streak) ?? `${streak} days of coming back. It counts.`;
}

/**
 * The `still_here` next step (#451): an acknowledgment, nothing to fill in,
 * and a few static places to go if they want company while it sits.
 */
export const STILL_HERE_HEADLINE = "That's okay. Some things take longer to set down.";
export const STILL_HERE_MESSAGE =
  "Nothing to do here. If you want something beside you while it sits, these are close.";
export const STILL_HERE_LINKS = [
  { key: "music", title: "Music", sub: "Something to listen to" },
  { key: "support", title: "Support audio", sub: "A voice to sit with" },
  { key: "library", title: "Lantern", sub: "Stories from people who've been here" },
] as const;
export const STILL_HERE_SKIP = "Not now";

/**
 * The `heavier` next step (#452): a menu of places to turn, support first.
 * Keys match `follow_up_responses.heavierChoice`. Picking none is fine.
 */
export const HEAVIER_HEADLINE = "Thank you for telling me. You don't have to carry it alone.";
export const HEAVIER_MESSAGE = "If something would help right now, pick one. Or just close this.";
export const HEAVIER_OPTIONS = [
  { key: "crisis_resources", title: "Talk to someone", sub: "People you can reach right now" },
  { key: "music", title: "Music", sub: "Something to listen to" },
  { key: "support_audio", title: "Support audio", sub: "A voice to sit with" },
  { key: "library", title: "Lantern", sub: "Stories from people who've been here" },
] as const;
export const HEAVIER_SKIP = "Not now";

/** The headline over each answer's next step — all four tailored (#449–#452). */
export const STEP_HEADLINE: Record<StatusResponse, string> = {
  lighter: REFLECTIVE_COPY.lighter.prompt,
  still_here: STILL_HERE_HEADLINE,
  heavier: HEAVIER_HEADLINE,
  processed: REFLECTIVE_COPY.processed.prompt,
};

/** Quiet link back to crisis resources (acute / escalation-derived cards). */
export const FOLLOW_UP_RESOURCES_LABEL = "Resources are still here";

/** Accessibility label for Flux on the check-in sheet. */
export const FOLLOW_UP_MASCOT_LABEL =
  "Flux, the Xolace companion, checking back in with you";
