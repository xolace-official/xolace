export const CHANNEL = {
	add: "Add a reaction",
	edited: "Edited",
	empty: {
		body: "Announcements for the whole camp land here.",
		title: "Nothing from Xolace yet",
	},
	failed: "Messages couldn't load. Check your connection and try again.",
	help: "Get help now",
	loading: "Loading announcements",
	lock: "Xolace talks to the whole camp, not back. Drop a reaction instead.",
	more: "Reactions and more",
	notSent: "This post didn't send.",
	openLink: (words: string, nth: number) =>
		`Open ${words.replace(/^(https?:\/\/|mailto:)(www\.)?/, "").replace(/\/$/, "")}${nth > 1 ? `, ${nth}` : ""}`,
	placeholder: "Post to the whole camp",
	reaction: (name: string, count: number) => `${name}, ${count}`,
	reactionHint: {
		add: "Adds your reaction",
		remove: "Takes your reaction back",
		swap: "Changes your reaction to this one",
	},
	removed: "This post was removed.",
	resend: "Send again",
	resendFailed: "Still couldn't send it. Check your connection and try again.",
	sub: "Camp announcements",
	title: "Xolace",
	tryAgain: "Try again",
} as const;
