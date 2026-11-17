/**
 * Every string You're not alone shows (design/handoff/peers.md §6–8, the
 * board's `SETS`, `youLabel` and markup). The report sheet keeps production's
 * copy word for word (screen map, `/report-reflection`).
 */

/** Which result the screen shows: a close match, recent ones, or nothing yet. */
export type PeersSet = "match" | "recent" | "none";

type SetCopy = {
	/** The title's two lines (board `tA` / `tB`). */
	rows: readonly [string, string];
	sub: string;
	/** The bridge line under the last card, when session end offers "Leave it for someone". */
	next: string;
};

export const COPY = {
	/** VoiceOver's custom actions on each quote (board card 05). */
	actions: { hide: "Hide this", report: "Report" },
	/** VoiceOver, when the last card lands: the set's title, then the count. */
	announce: (title: string, n: number) =>
		`${title} ${n} ${n === 1 ? "reflection" : "reflections"}.`,
	done: "Done",
	felt: "I’ve felt this too",
	/** fix: production's "Long press any card to report" at 1.76:1. */
	hint: "Hold a card to report it",
	loading: "Loading",
	/** The card's hold menu. */
	menu: { cancel: "Cancel", hide: "Hide this", report: "Report…" },
	readMore: "Read more",
	sets: {
		match: {
			next: "Next, you can leave yours for someone.",
			rows: ["Others have felt", "something like this."],
			sub: "",
		},
		none: {
			next: "You can leave yours for someone next.",
			rows: ["You’re among", "the first."],
			sub: "No one has shared something like this yet.",
		},
		recent: {
			next: "Yours could be the first of its kind. You can leave it for someone next.",
			rows: ["Nothing quite like", "yours yet."],
			sub: "Here’s what others shared recently.",
		},
	} satisfies Record<PeersSet, SetCopy>,
	/** Production's reasons and header, word for word (its `report-sheet.tsx`). */
	sheet: {
		cancel: "Cancel",
		reasons: [
			{ label: "Offensive or hateful", value: "offensive" },
			{ label: "Self-harm or crisis content", value: "self_harm" },
			{ label: "Spam or off-topic", value: "spam" },
			{ label: "Something else", value: "other" },
		],
		title: "Why are you reporting this?",
	},
	/** Production's "show less", in sentence case beside "Read more". */
	showLess: "Show less",
	toast: {
		/** Production's report toasts, their descriptions word for word. */
		alreadyReported: "You’ve already flagged this reflection.",
		failed: "Something went wrong. Try again in a moment.",
		hidden: "Hidden.",
		reported: "Thanks. We’ll review this.",
		reportLimited: "You’ve reported a lot recently. Try again later.",
		/** fix: production's "Slow down / Take a breath before resonating again." */
		slow: "Take a breath, then try again.",
	},
	/** Board `youLabel`: the others who felt it, you aside. */
	you: (others: number) => {
		if (others === 0) {
			return "You’re the first";
		}
		return `You and ${others} ${others === 1 ? "other" : "others"}`;
	},
} as const;

export type ReportReason = (typeof COPY.sheet.reasons)[number]["value"];
