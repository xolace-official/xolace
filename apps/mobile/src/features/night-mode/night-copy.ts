/** Copy for 3am Mode: sessions started between 10pm and 4am. */

export const NIGHT_HEADLINE = "What's carrying over?";

export const NIGHT_TEXTURE_WORDS = [
	"wide awake",
	"can't turn it off",
	"something happened",
	"replaying it",
	"spiraling",
	"aching",
	"hollow",
	"too much",
] as const;

/** Typing nudge delay; slower cadence for late-night sessions. */
export const NIGHT_NUDGE_DELAY_MS = 14_000;

/** Day nudge delay for reference. */
export const DAY_NUDGE_DELAY_MS = 8000;
