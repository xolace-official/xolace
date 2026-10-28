/**
 * Copy for the Return Welcome sheet. Tiers mirror quiet-return-copy.ts plus `recent` (under 14d).
 */

import type { QuietReturnTier } from "@/features/reflect/quiet-return-copy";

export type ReturnWelcomeTier = QuietReturnTier | "recent";

type ReturnWelcomeCopy = {
	title: string;
	body: string;
	cta: string;
};

export const RETURN_WELCOME: Record<ReturnWelcomeTier, ReturnWelcomeCopy> = {
	anniversary: {
		body: "A year ago you showed up here for the very first time. You've moved through a lot since then, even on the days it didn't feel like it. Glad you keep finding your way back to the fire.",
		cta: "Continue",
		title: "One year on.",
	},
	"away-14-30": {
		body: "It's been a couple of weeks. Life pulls us away sometimes, what counts is you found your way back here. The fire's been kept warm for you.",
		cta: "Let's begin",
		title: "Welcome back.",
	},
	"away-30-90": {
		body: "It's been a while, and that's alright, you're here now. Whatever you carried through those weeks, you don't have to hold it on your own tonight.",
		cta: "I'm here",
		title: "Good to see you again.",
	},
	"away-90-plus": {
		body: "Months have passed, and still, here you are. That takes something real. The fire never went out, and there's a place for you at it. Let's see what's with you now.",
		cta: "Sit with me",
		title: "You came back.",
	},
	recent: {
		body: "A few days away, a few feelings to set down, that's just being human. You came back, and that's the part that matters. Let's pick up from wherever you are now.",
		cta: "I'm ready",
		title: "There you are.",
	},
};
