/**
 * Copy for The Quiet Return (a long gap, or the first-session anniversary). Night beats both.
 */

export type QuietReturnTier =
	| "away-14-30"
	| "away-30-90"
	| "away-90-plus"
	| "anniversary";

export const QUIET_RETURN_PROMPTS: Record<QuietReturnTier, string> = {
	anniversary:
		"A year ago you showed up here for the first time. Something brought you then. What brings you today?",
	"away-14-30":
		"You've been away for a while. No explanation needed. What did you bring back with you?",
	"away-30-90":
		"It's been some time. Whatever kept you away, it doesn't matter here. What's with you right now?",
	"away-90-plus":
		"A lot of time has passed. You don't have to explain where you went. What's here today?",
};
