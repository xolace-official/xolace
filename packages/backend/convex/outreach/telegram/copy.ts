import {
	ACUTE_NUDGE_BODY,
	fallbackFollowUpCard,
} from "../../ai/prompts/followUpCardWriter";
import type { CrisisContacts } from "../../lib/crisisResources";
import type { FollowUpTier } from "../validators";
import { DAILY_REPLY_CAP } from "./caps";

/**
 * Every fixed line the Telegram bot sends or shows (#760 §6), taken as drafted
 * in the conversation prototype (#732). Later tickets add their lines here;
 * adapters and the inbound processor write no copy of their own.
 */

/** A chat with no linked Xolace account writes to the bot. */
export const STRANGER_REPLY =
	"Hi. This bot works with the Xolace app. To get check-ins here, open Xolace → Settings → Reach me on… and link Telegram.\n\nIf you're in danger right now, call your local emergency number.";

/** `/start` with a token that's unknown, expired, used or repeated. */
export const EXPIRED_LINK_REPLY =
	"This link has expired. Open Xolace → Reach me on… for a new one.";

/** A chat was just linked (#766). */
export const WELCOME =
	"You're linked 👋\nThis is where Xolace will check in on you: a short message with a few buttons. Tap an answer, or just write back.\n\nTelegram shows previews on your lock screen, so the first line of every message stays general.\n\nTo stop, send /stop or unlink in Xolace → Reach me on…";

/** Sent to the chat when it's unlinked from the app (#767). */
export const GOODBYE_APP =
	"Unlinked. You won't get check-ins here. You can link again in Xolace anytime.";

/** The reply to `/stop` in a linked chat (#767). */
export const STOP_REPLY =
	"Stopped. This chat is no longer linked, and you won't get check-ins here.\nTo link again, open Xolace → Reach me on…";

/** `/help` in a linked chat (#767). */
export const HELP =
	"I'm Xolace's check-in bot. When Xolace checks in, it happens here: tap an answer or write back.\n/stop unlinks this chat.";

/** A chat already linked to one account is linked by another (#767). */
export const RELINKED =
	"This chat now gets check-ins for the Xolace account you just linked.";

/** An account linked a new chat; this, its old one, is told (#767). */
export const OLD_CHAT = "No longer linked to Xolace.";

/** A chat whose link was revoked writes to the bot (#767). */
export const REVOKED_REPLY =
	"This chat isn't linked to Xolace anymore. To link it again, open Xolace → Reach me on… for a fresh link.\n\nIf you're in danger right now, call your local emergency number.";

/** The commands a linked chat sees, set for that chat when it links. */
export const LINKED_COMMANDS = [
	{ command: "stop", description: "Unlink this chat from Xolace" },
	{ command: "help", description: "What this bot does" },
] as const;

/** The bot's profile, set by `configureBot`. */
export const BOT_PROFILE = {
	// `/stop` is set per linked chat (`LINKED_COMMANDS`), never here.
	commands: [{ command: "help", description: "What this bot does" }],
	description:
		"Xolace's check-in bot. Link it from the Xolace app (Settings → Reach me on…) and check-ins arrive here: tap an answer or write back.\n\nIf you're in danger right now, call your local emergency number.",
	name: "Xolace",
	shortDescription: "Check-ins from the Xolace app.",
} as const;

// ---------------------------------------------------------------------------
// Check-ins (#768)
// ---------------------------------------------------------------------------

/**
 * A follow-up nudge's first line on Telegram: push's tier-generic line, never
 * the card text, so never the compounding domain, a day or a time. The lock
 * screen shows it, and the chat history keeps it on every device.
 */
export function nudgeFirstLine(tier: FollowUpTier): string {
	return tier === "acute" ? ACUTE_NUDGE_BODY : fallbackFollowUpCard(tier);
}

/** The three answers Telegram offers, the app's chips. Acute has no Heavier. */
export const ANSWER_BUTTONS = {
	heavier: "🌧 Heavier",
	lighter: "🌤 Lighter",
	still_here: "☁️ Still with it",
} as const;

/** Adds the card text to the same message. */
export const REVEAL_BUTTON = "What was this about?";

export const SUPPORT_RESOURCES_BUTTON = "Support resources";

export const OPEN_XOLACE_BUTTON = "Open Xolace";

/** A check-in that was answered, once it collapses. */
export const CHECKED_IN = {
	heavier: "✓ Checked in: heavier",
	lighter: "✓ Checked in: lighter",
	still_here: "✓ Checked in: still sitting with it",
} as const;

/** Any other check-in that is no longer live. */
export const CHECK_IN_CLOSED = "This check-in is closed. Nothing to do here.";

/** The toast for a tap on a check-in that has closed. */
export const CHECK_IN_CLOSED_TOAST = "This check-in has closed";

// ---------------------------------------------------------------------------
// Answer taps (#769)
// ---------------------------------------------------------------------------

/** The toast for a tap on a check-in already answered, here or in the app. */
export const ALREADY_ANSWERED_TOAST = "Already answered";

// ---------------------------------------------------------------------------
// AI replies (#770)
// ---------------------------------------------------------------------------

/** Sent instead of a reply the model couldn't write, with Open Xolace. */
export const REPLY_FAILED =
	"I couldn't reply just now — I'm still here in Xolace.";

// ---------------------------------------------------------------------------
// Crisis (#772)
// ---------------------------------------------------------------------------

/**
 * The fixed reply to a crisis text, never the model: the country's emergency
 * number and priority-1 helplines from the shared list the app's crisis
 * screen reads, so the bot and the app never give two different numbers.
 * Null contacts (country unknown) point to the local emergency number; the
 * Find a helpline button carries the rest.
 */
export function crisisReply(contacts: CrisisContacts | null): string {
	const help = contacts
		? [
				`If you're in danger right now, call ${contacts.emergencyNumber}.`,
				...contacts.helplines.map((h) => `${h.label}: ${h.value}`),
			]
		: ["If you're in danger right now, call your local emergency number."];
	return [
		"I'm really glad you told me.",
		help.join("\n"),
		"I'm still here, and so is Xolace.",
	].join("\n\n");
}

/** Opens the app's crisis resources screen, `from=telegram`. */
export const MORE_SUPPORT_BUTTON = "More support options";

/** IASP's directory, first when the country is unknown. */
export const FIND_A_HELPLINE_BUTTON = "Find a helpline";

// ---------------------------------------------------------------------------
// Reply caps (#771)
// ---------------------------------------------------------------------------

/** At the day's reply cap: Plus, or anyone struggling (with Support resources). */
export const CAP_REPLY =
	"I've hit my reply limit for today. You can keep going in Xolace, and I'll be back here tomorrow.";

/** At a free user's cap, when they aren't struggling: with Get Xolace+. */
export const CAP_UPSELL = `That's my ${DAILY_REPLY_CAP.free} replies for today on the free plan. With Xolace+ I can keep talking with you here, up to ${DAILY_REPLY_CAP.plus} a day. Or carry on in Xolace now, and I'll be back here tomorrow.`;

export const GET_PLUS_BUTTON = "Get Xolace+";
