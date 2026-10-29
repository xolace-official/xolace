/** Bump when the tour is re-cut. A device stores the version it last finished; anything lower
 * sees the current tour once. */
export const REFLECT_TOUR_VERSION = 1;

/** Whether the tour should run for a device that last finished `version`. */
export const shouldShowReflectTour = (version: number) =>
	version < REFLECT_TOUR_VERSION;

// Indexed by a step's `order` (#259).
export const TOUR_STEPS = [
	// A first-run user has seen neither 3am Mode nor a long absence, so the
	// step says what the card is for instead.
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
	// not just a reflection.
	{
		description:
			"The page turns each day you check in here: a reflection, a vent or a read.",
		title: "Your days, counted.",
	},
	// The talk door is a native header button the tour cannot wrap, so this
	// step has no cutout.
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
