/** The Xolace channel's words: the prototype's where it drew them, production's elsewhere. */
export const CHANNEL = {
	add: "Add a reaction",
	empty: "Nothing from Xolace yet. Announcements for the whole camp land here.",
	failed: "Messages couldn't load. Check your connection and try again.",
	lock: "Xolace talks to the whole camp, not back. Drop a reaction instead.",
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
	sub: "Camp announcements",
	title: "Xolace",
	tryAgain: "Try again",
} as const;
