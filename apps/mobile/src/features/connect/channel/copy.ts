/** The Xolace channel's words: the prototype's where it drew them, production's elsewhere. */
export const CHANNEL = {
	add: "Add a reaction",
	/** Beside the time, as Stream's own footer said it. */
	edited: "Edited",
	empty: "Nothing from Xolace yet. Announcements for the whole camp land here.",
	failed: "Messages couldn't load. Check your connection and try again.",
	/** The header's lifebuoy, as in the thread. */
	help: "Get help now",
	lock: "Xolace talks to the whole camp, not back. Drop a reaction instead.",
	/** A broadcast of yours that didn't reach Stream. */
	notSent: "This post didn't send.",
	/** A link in a post, as a VoiceOver action: "Open xolace.app/lantern". */
	openLink: (url: string) =>
		`Open ${url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}`,
	/** The sender's composer. */
	placeholder: "Post to the whole camp",
	/** "Hug, 24, you reacted" */
	reaction: (name: string, count: number, mine: boolean) =>
		`${name}, ${count}${mine ? ", you reacted" : ""}`,
	reactionHint: (mine: boolean) =>
		mine ? "Takes your reaction back" : "Adds your reaction",
	reactionNames: {
		fire: "Fire",
		growth: "Growth",
		hug: "Hug",
		laugh: "Laugh",
		love: "Love",
		smile: "Smile",
		thanks: "Thanks",
	} as Record<string, string>,
	/** Where the broadcaster removed a post. */
	removed: "This post was removed.",
	resend: "Send again",
	sub: "Camp announcements",
	title: "Xolace",
	tryAgain: "Try again",
} as const;
