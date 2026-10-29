/** Static copy for the follow-up check-in; the card sentence is written server-side. Mirrors
 * return-welcome-copy.ts. */

import {
	isStreakMilestone,
	streakMilestoneCopy,
} from "@xolace/backend/convex/streaks/milestones";
import { getStreakCopy } from "@/features/streak/streak-copy";

export type FollowUpResponse =
	| "lighter"
	| "still_here"
	| "heavier"
	| "processed"
	| "vent";

export type FollowUpTier = "acute" | "elevated" | "standard";

export type StatusResponse = Exclude<FollowUpResponse, "vent">;
type Chip = { key: StatusResponse; label: string };

// Self-report chips. `vent` is not one of them: it leaves the sheet for the
// voice-vent screen and is rendered as a separate doorway.
const CHIPS: Record<StatusResponse, Chip> = {
	heavier: { key: "heavier", label: "Got heavier" },
	lighter: { key: "lighter", label: "Feeling lighter" },
	processed: { key: "processed", label: "I worked through it" },
	still_here: { key: "still_here", label: "Still sitting with it" },
};

/** Status chips per tier. Acute omits `processed`: it reads glib so soon after a crisis. */
export function chipsForTier(tier: FollowUpTier): Chip[] {
	if (tier === "acute") {
		return [CHIPS.still_here, CHIPS.lighter];
	}
	return [CHIPS.lighter, CHIPS.still_here, CHIPS.heavier, CHIPS.processed];
}

/** Headline when a restored/deep-linked route arrives without the card's sentence. */
export const FOLLOW_UP_FALLBACK_HEADLINE = "How is it sitting with you now?";

export const VENT_LABEL = "Let it out";
export const VENT_SUBLABEL = "Say it out loud - nothing is kept";
export const VENT_A11Y_LABEL =
	"Let it out - open voice vent, your voice is never stored";

/** The answers whose next step is the reflective prompt (#449 lighter, #450 processed). */
export type ReflectiveAnswer = "lighter" | "processed";

/** Per-answer copy for the reflective step; `processed` also carries a milestone line. */
export const REFLECTIVE_COPY: Record<
	ReflectiveAnswer,
	{ prompt: string; placeholder: string; inputA11y: string; milestone?: string }
> = {
	lighter: {
		inputA11y: "What helped? Optional",
		placeholder: "A walk, a person, a song… or nothing you can name",
		prompt: "Good to hear. What helped?",
	},
	processed: {
		inputA11y: "What got you there? Optional",
		milestone: "You set this one down. That's yours to keep.",
		placeholder: "A realization, a conversation, time… or nothing you can name",
		prompt: "You worked through it. What got you there?",
	},
};
export const REFLECTIVE_SHARE_LABEL =
	"Share anonymously with others who feel this";
export const REFLECTIVE_DONE = "Done";
export const REFLECTIVE_SAVING = "Saving…";
export const REFLECTIVE_SKIP = "Skip for now";
export const REFLECTIVE_SAVED = "Saved.";
export const REFLECTIVE_SAVED_SHARED = "Saved. It will be shared anonymously.";

/** Streak nod on a lighter/processed answer: push milestone lines first, then per-day lines. */
export function streakNod(streak: number): string | null {
	if (streak <= 0) {
		return null;
	}
	if (isStreakMilestone(streak)) {
		return streakMilestoneCopy(streak);
	}
	return getStreakCopy(streak) ?? `${streak} days of coming back. It counts.`;
}

/** The `still_here` next step (#451): an acknowledgment plus a few places to go. */
const STILL_HERE_HEADLINE = "That's okay. Some things take longer to set down.";
export const STILL_HERE_MESSAGE =
	"Nothing to do here. If you want something beside you while it sits, these are close.";
export const STILL_HERE_LINKS = [
	{ key: "music", sub: "Something to listen to", title: "Music" },
	{ key: "support", sub: "A voice to sit with", title: "Support audio" },
	{
		key: "library",
		sub: "Stories from people who've been here",
		title: "Lantern",
	},
] as const;
export const STILL_HERE_SKIP = "Not now";

/** The `heavier` next step (#452). Keys match `follow_up_responses.heavierChoice`. */
const HEAVIER_HEADLINE =
	"Thank you for telling me. You don't have to carry it alone.";
export const HEAVIER_MESSAGE =
	"If something would help right now, pick one. Or just close this.";
export const HEAVIER_OPTIONS = [
	{
		key: "crisis_resources",
		sub: "People you can reach right now",
		title: "Talk to someone",
	},
	{ key: "music", sub: "Something to listen to", title: "Music" },
	{ key: "support_audio", sub: "A voice to sit with", title: "Support audio" },
	{
		key: "library",
		sub: "Stories from people who've been here",
		title: "Lantern",
	},
] as const;
export const HEAVIER_SKIP = "Not now";

/** Headline over each answer's next step (#449-#452). */
export const STEP_HEADLINE: Record<StatusResponse, string> = {
	heavier: HEAVIER_HEADLINE,
	lighter: REFLECTIVE_COPY.lighter.prompt,
	processed: REFLECTIVE_COPY.processed.prompt,
	still_here: STILL_HERE_HEADLINE,
};

/** Quiet link back to crisis resources (acute / escalation-derived cards). */
export const FOLLOW_UP_RESOURCES_LABEL = "Resources are still here";

/** Accessibility label for Flux on the check-in sheet. */
export const FOLLOW_UP_MASCOT_LABEL =
	"Flux, the Xolace companion, checking back in with you";
