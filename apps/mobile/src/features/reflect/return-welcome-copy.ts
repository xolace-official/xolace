/**
 * Copy for the Return Welcome sheet — a one-shot greeting shown the first time
 * a lapsed user reopens the app after their streak window expired.
 *
 * Intent: acknowledge that the app *knows* them and knows they were away, then
 * warmly encourage them back in. Not guilt, not indifference — recognition.
 * The longer the gap, the more the wording leans into "glad you walked back."
 *
 * Varies by gap, mirroring the inline header tiers in quiet-return-copy.ts:
 *   recent        — returning, but under 14 days
 *   away-14-30    — a couple of weeks
 *   away-30-90    — a month-plus
 *   away-90-plus  — months
 *   anniversary   — one year since first session
 *
 * The mascot points down toward this copy — it should read as "come sit",
 * a hand reaching back toward the fire.
 */

import type { QuietReturnTier } from "@/src/features/reflect/quiet-return-copy";

export type ReturnWelcomeTier = QuietReturnTier | "recent";

type ReturnWelcomeCopy = {
  title: string;
  body: string;
  cta: string;
};

export const RETURN_WELCOME: Record<ReturnWelcomeTier, ReturnWelcomeCopy> = {
  recent: {
    title: "There you are.",
    body: "A few days away, a few feelings to set down, that's just being human. You came back, and that's the part that matters. Let's pick up from wherever you are now.",
    cta: "I'm ready",
  },
  "away-14-30": {
    title: "Welcome back.",
    body: "It's been a couple of weeks. Life pulls us away sometimes, what counts is you found your way back here. The fire's been kept warm for you.",
    cta: "Let's begin",
  },
  "away-30-90": {
    title: "Good to see you again.",
    body: "It's been a while, and that's alright, you're here now. Whatever you carried through those weeks, you don't have to hold it on your own tonight.",
    cta: "I'm here",
  },
  "away-90-plus": {
    title: "You came back.",
    body: "Months have passed, and still, here you are. That takes something real. The fire never went out, and there's a place for you at it. Let's see what's with you now.",
    cta: "Sit with me",
  },
  anniversary: {
    title: "One year on.",
    body: "A year ago you showed up here for the very first time. You've moved through a lot since then, even on the days it didn't feel like it. Glad you keep finding your way back to the fire.",
    cta: "Continue",
  },
};
