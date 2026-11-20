export type PeersSet = "match" | "recent" | "none";

type SetCopy = {
	rows: readonly [string, string];
	sub: string;
	next: string;
};

export const COPY = {
	actions: { hide: "Hide this", report: "Report" },
	announce: (title: string, n: number) =>
		`${title} ${n} ${n === 1 ? "reflection" : "reflections"}.`,
	done: "Done",
	felt: "I’ve felt this too",
	hint: "Hold a card to report it",
	loading: "Loading",
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
	showLess: "Show less",
	toast: {
		alreadyReported: "You’ve already flagged this reflection.",
		failed: "Something went wrong. Try again in a moment.",
		hidden: "Hidden.",
		reported: "Thanks. We’ll review this.",
		reportLimited: "You’ve reported a lot recently. Try again later.",
		slow: "Take a breath, then try again.",
	},
	you: (others: number) => {
		if (others === 0) {
			return "You’re the first";
		}
		return `You and ${others} ${others === 1 ? "other" : "others"}`;
	},
} as const;

export type ReportReason = (typeof COPY.sheet.reasons)[number]["value"];
