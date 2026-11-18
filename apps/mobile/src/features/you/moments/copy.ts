/**
 * Moments and a moment's strings: the prototype's (`P/src/fixtures/you.ts`, `MOMENTS_PAGE` and
 * `MOMENT_COPY`) where it drew one, production's timeline where it kept production's words (the
 * empty line, the free window's length from the server).
 */
export const MONTHS = [
	"January",
	"February",
	"March",
	"April",
	"May",
	"June",
	"July",
	"August",
	"September",
	"October",
	"November",
	"December",
] as const;

export const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

/** 7 → "week", 14 → "2 weeks", 30 → "30 days" (production's `formatWindow`). */
const windowOf = (days: number) => {
	if (days === 7) {
		return "week";
	}
	if (days % 7 === 0) {
		return `${days / 7} weeks`;
	}
	return `${days} days`;
};

export const MOMENTS_COPY = {
	list: {
		/** Production's empty line, in the redesign's voice. */
		empty: "Your moments will appear here after your first reflection.",
		/** The door's own label, read as one button. */
		limitLabel: (days: number) =>
			`You're seeing the last ${windowOf(days)}. Xolace+ keeps every moment. See all`,
		limitSub: "Xolace+ keeps every moment",
		limitTitle: (days: number) => `You're seeing the last ${windowOf(days)}`,
		/** A card, read as one link. */
		row: (quote: string, line: string, tone: string | null) =>
			[`“${quote}”`, line, tone].filter(Boolean).join(". "),
		seeAll: "See all",
		title: "Moments",
		today: "Today",
		yesterday: "Yesterday",
	},
	moment: {
		again: "Reflect on this again",
		/** The id led nowhere: deleted, or another person's. */
		gone: "This moment isn't here any more.",
		pause: "Pause the mirror",
		play: "Play the mirror",
		share: "Share the mirror",
		theMirror: "THE MIRROR",
		theTalk: "THE TALK",
		youSaid: "YOU SAID",
	},
	paths: {
		exit: "just needed to say it",
		peers: "you're not alone",
		solo: "sat with this",
		talk: "talk",
	},
	/** The feeling when the session has none (production's `getEmotionLabel`). */
	reflection: "Reflection",
	tones: {
		direct: "Direct",
		gentle: "Gentle",
		poetic: "Poetic",
		witnessed: "Witnessed",
	},
} as const;
