/**
 * Every fixed line the Telegram bot sends or shows (#760 §6), taken as drafted
 * in the conversation prototype (#732). Later tickets add their lines here;
 * adapters and the inbound processor write no copy of their own.
 */

/** A chat with no linked Xolace account writes to the bot. */
export const STRANGER_REPLY =
	"Hi. This bot works with the Xolace app. To get check-ins here, open Xolace → Settings → Reach me on… and link Telegram.\n\nIf you're in danger right now, call your local emergency number.";

/** The bot's profile, set by `configureBot`. */
export const BOT_PROFILE = {
	commands: [
		// `/stop` joins when it unlinks (#767).
		{ command: "help", description: "What this bot does" },
	],
	description:
		"Xolace's check-in bot. Link it from the Xolace app (Settings → Reach me on…) and check-ins arrive here: tap an answer or write back.\n\nIf you're in danger right now, call your local emergency number.",
	name: "Xolace",
	shortDescription: "Check-ins from the Xolace app.",
} as const;
