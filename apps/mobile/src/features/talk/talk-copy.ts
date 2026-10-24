// Words the talk screen says about itself (#593).

/** The companion's name when the person hasn't named their space (#601). */
export { COMPANION_FALLBACK_NAME } from "@xolace/backend/convex/ai/prompts/companion";

/** Agreed in #588. Rule 12: it has to be literally true when it ships. */
export const PRIVACY_LINE =
	"Your talk is saved as text in Xolace, like a reflection, and goes when you delete your data. We don't keep a recording. Our voice provider is set to keep nothing and we ask it to delete its copy as soon as you finish.";

// Ending a talk: the mirror now, or "Just end", which still makes it, for later.
export const JUST_END = "Just end";
export const MIRROR_LATER = "Your mirror waits in your timeline";
/** The consent card: the companion keeps going unless told otherwise. */
export const END_ANYTIME =
	"You can end whenever you like, from the menu up top or tell . Stop wherever feels right; you don't have to go deeper than you want.";

// Weekly talk time (#582, #596). Mirrors convex/talk/time.ts; the server enforces.
export const WEEKLY_TALK_S = 15 * 60;
export const MIN_TALK_S = 3 * 60;
export const TALK_TIME_RESETS = "Talk time resets Monday";

/** People only ever see minutes, and nothing at 15 or more. */
export function talkTimeLine(secondsLeft: number): string | null {
	if (secondsLeft >= WEEKLY_TALK_S) {
		return null;
	}
	if (secondsLeft < MIN_TALK_S) {
		return "Not enough talk time left for a talk this week. More on Monday.";
	}
	return `About ${Math.floor(secondsLeft / 60)} minutes of talking left this week. More on Monday.`;
}
