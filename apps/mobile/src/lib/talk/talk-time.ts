// Weekly talk time (#582, #596), as people see it. Mirrors convex/talk/time.ts; the
// server enforces it. Talk's start screen, Reflect's talk door and mirror, and Settings
// read it.

export const WEEKLY_TALK_S = 15 * 60;
/** Under this, a talk can't start (the server refuses it too). */
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
