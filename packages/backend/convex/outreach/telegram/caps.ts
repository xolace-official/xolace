/**
 * The numbers behind AI replies' daily cap and bursts on Telegram (#771).
 * A leaf, so the copy module can quote them without a cycle.
 */

/** AI replies a day, by plan, counted on the user's local day. */
export const DAILY_REPLY_CAP = { free: 5, plus: 50 } as const;

/** A text's reply waits this long after the last text, then answers them all. */
export const BURST_WAIT_MS = 6000;

/**
 * A burst waits for texts still being screened, but no longer than this
 * after the last one started: a check that never finishes can't hold it.
 */
export const SCREEN_HOLD_MS = 30_000;

/** How soon a burst held for a screening looks again. */
export const BURST_RECHECK_MS = 1000;
