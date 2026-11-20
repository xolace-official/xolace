export const WEEKLY_TALK_S = 15 * 60;
export const MIN_TALK_S = 3 * 60;
export const TALK_TIME_RESETS = "Talk time resets Monday";

export function talkTimeLine(secondsLeft: number): string | null {
	if (secondsLeft >= WEEKLY_TALK_S) {
		return null;
	}
	if (secondsLeft < MIN_TALK_S) {
		return "Not enough talk time left for a talk this week. More on Monday.";
	}
	return `About ${Math.floor(secondsLeft / 60)} minutes of talking left this week. More on Monday.`;
}
