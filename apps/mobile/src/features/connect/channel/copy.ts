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
	/** The card's VoiceOver action: Stream's hold overlay, with the reactions, Copy, and for the
	 * broadcaster Edit and Delete. */
	more: "Reactions and more",
	/** A broadcast of yours that didn't reach Stream. */
	notSent: "This post didn't send.",
	/** A link in a post, as a VoiceOver action: its words ("Open how it works") or address
	 * ("Open xolace.app/lantern"), and a number after when two would read the same, since
	 * iOS tells actions apart by label ("Open xolace.app, 2"). */
	openLink: (words: string, nth: number) =>
		`Open ${words.replace(/^(https?:\/\/|mailto:)(www\.)?/, "").replace(/\/$/, "")}${nth > 1 ? `, ${nth}` : ""}`,
	/** The sender's composer. */
	placeholder: "Post to the whole camp",
	/** "Hug, 24". Yours is the chip's selected state. */
	reaction: (name: string, count: number) => `${name}, ${count}`,
	/** One reaction each: a tap adds yours, swaps it for this one, or takes it back. */
	reactionHint: {
		add: "Adds your reaction",
		remove: "Takes your reaction back",
		swap: "Changes your reaction to this one",
	},
	/** Where the broadcaster removed a post. */
	removed: "This post was removed.",
	resend: "Send again",
	/** A resend that didn't reach Stream either. */
	resendFailed: "Still couldn't send it. Check your connection and try again.",
	sub: "Camp announcements",
	title: "Xolace",
	tryAgain: "Try again",
} as const;
