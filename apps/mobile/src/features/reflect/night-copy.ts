/**
 * Copy for 3am Mode — sessions started between 10pm and 4am.
 *
 * These constants are purely data. They are wired in by
 * IdleState, TypingState, and the session-end variants.
 */

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

/** Activity variant (solo/peers path): replaces "You showed up for yourself today." */
export const NIGHT_SESSION_END_ACTIVITY =
  "You can put it down now. It'll still be here tomorrow if you need it.";

/** Exit variant: replaces "Heard." */
export const NIGHT_SESSION_END_EXIT = "Heard. Rest if you can.";

/** Typing nudge delay — slower cadence for late-night sessions. */
export const NIGHT_NUDGE_DELAY_MS = 14_000;

/** Day nudge delay for reference. */
export const DAY_NUDGE_DELAY_MS = 8_000;
