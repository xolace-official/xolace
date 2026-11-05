// Client-safe: the profile card's freeze copy reads these too.

/** Freezes on hand never exceed this. Xolace+ may raise it later (#427). */
export const FREEZE_CAP = 2;
/** One freeze is earned per this many consecutive qualifying days. */
export const FREEZE_EARN_EVERY = 7;
/** Sparks a streak freeze costs (#680); achievements.display.overview returns it. */
export const FREEZE_SPARK_PRICE = 50;
