/**
 * Bump when the tour is re-cut for a screen that has changed enough that the
 * old walkthrough describes the wrong thing. A device stores the version it
 * last finished; anything lower sees the current tour once.
 */
export const REFLECT_TOUR_VERSION = 1;

/** Whether the tour should run for a device that last finished `version`. */
export const shouldShowReflectTour = (version: number) =>
	version < REFLECT_TOUR_VERSION;

// Indexed by a step's `order`. Four steps since the rewrite (#259) — the card,
// the mic, the chips, the menu: nothing a user would have found on their own —
// plus the streak and the talk door, which are on screen but say nothing about
// what they are.
export const TOUR_STEPS = [
	// The prompt does shift with 3am Mode and long absences, but a first-run
	// user has seen neither, so the step points at what the card is for instead.
	{
		description: "Tap the card and write whatever is on your mind.",
		title: "Start here.",
	},
	{
		description: "Tap this button to record your voice.",
		title: "Speak instead.",
	},
	{
		description: "Select any that match how you feel right now.",
		title: "Can't write? Tap words that fit.",
	},
	// Any qualifying day counts (convex/streaks/activityLog.ts ACTION_WEIGHTS),
	// not just a reflection, so the copy doesn't say "each reflection".
	{
		description:
			"The page turns each day you check in here: a reflection, a vent or a read.",
		title: "Your days, counted.",
	},
	// The talk door is a native header button, which the tour can't wrap, so this
	// step has no cutout: the card sits under the header and shows the glyph.
	{
		description:
			"Tap the waveform up top to talk it through out loud, back and forth. Part of Xolace+.",
		title: "Rather say it out loud?",
	},
	{
		description: "Discovery, Vent and Settings.",
		title: "The rest lives here.",
	},
] as const;

export type TourStep = (typeof TOUR_STEPS)[number];
