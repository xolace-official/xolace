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
		empty: "Your reflections will appear here after your first session.",
		emptyTitle: "No moments yet",
		limitSub: "Xolace+ keeps every moment",
		limitTitle: (days: number) => `You're seeing the last ${windowOf(days)}`,
		loading: "Loading your moments",
		row: (quote: string, line: string, tone: string | null) =>
			[`“${quote}”`, line, tone].filter(Boolean).join(". "),
		seeAll: "See all",
		title: "Moments",
		today: "Today",
		yesterday: "Yesterday",
	},
	moment: {
		again: "Reflect on this again",
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
	reflection: "Reflection",
	tones: {
		direct: "Direct",
		gentle: "Gentle",
		poetic: "Poetic",
		witnessed: "Witnessed",
	},
} as const;
