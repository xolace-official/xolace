/**
 * What Xolace writes back on Telegram (#770): one short, personal reply to a
 * check-in tap or to free text. Pure: `reply.ts` makes the model call, and the
 * reply eval plays the same prompt against the model.
 *
 * Telegram is held to a stricter bar than push (#760 §6): the first line is
 * what the lock screen shows, so it is short and general, and the chat keeps
 * every message on every device.
 */
import type { Infer } from "convex/values";
import {
	DOMAIN_LABELS,
	DOMAINS,
	type Domain,
} from "../../lib/understandingVocab";
import type { reachValidator } from "../../lib/validators";
import type { SafeguardLevel } from "../safeguard";

/** How the person asked Xolace to sound (`notifications.reach`). */
export type Reach = Infer<typeof reachValidator>;

/** The answers a Telegram check-in offers. */
export type TapAnswer = "lighter" | "still_here" | "heavier";

/** What this reply answers. */
export type ReplyTrigger =
	| { kind: "tap"; answer: TapAnswer }
	| { kind: "text"; level: SafeguardLevel; text: string };

/** The follow-up the reply knows about: the open one, else the latest. */
export type ReplyCard = {
	/** The answer it has, from the app or a tap; only Telegram's three are named. */
	answer?: TapAnswer;
	domain?: Domain;
	text: string;
};

/** One earlier message in this chat, oldest first. */
export type ReplyTurn = { role: "person" | "xolace"; text: string };

export type ReplyInput = {
	card: ReplyCard | null;
	/** Talk's memory preload, read-only (rules included; memory off says so). */
	memory: string;
	reach: Reach;
	/** Whether Support resources ride under the reply as a button. */
	resources: boolean;
	trigger: ReplyTrigger;
	turns: ReplyTurn[];
};

export type ReplyPrompt = { system: string; user: string };

/** The lock-screen line: a few words at most. */
export const FIRST_LINE_MAX_CHARS = 60;
/** A Telegram reply is a few sentences, never a letter. */
export const REPLY_MAX_CHARS = 600;

const VOICE: Record<Reach, string> = {
	direct:
		"Direct: exactly two plain lines, no softening or filler. The second line ends in one question.",
	quiet:
		"Quiet: exactly two short lines, never one. The second is a soft invite to say more, never a demand.",
	warm: "Warm: a short first line, then about three sentences that end in one question. Kind, never gushing.",
};

const ANSWER_WORDS: Record<TapAnswer, string> = {
	heavier: "heavier",
	lighter: "lighter",
	still_here: "still sitting with it",
};

const TAP_GOAL: Record<TapAnswer, string> = {
	heavier:
		"They tapped Heavier. Be with them, without fixing. Say Xolace has a space to work through it at their own pace, and that support is a tap away below.",
	lighter:
		"They tapped Lighter. Be glad with them, and ask what helped, in your own words.",
	still_here:
		"They tapped Still with it. Say that's a real answer, not a step back, and invite them to say what's keeping it close.",
};

const RULES = `You are Xolace, writing back in a private Telegram chat with someone who uses the Xolace app. Xolace checked in on something they reflected on, and they just answered. You write one reply message.

The first line:
- Its own line, ${FIRST_LINE_MAX_CHARS} characters at most, a few words.
- General: Telegram shows it on their lock screen. Never the topic, a life area, a feeling they named, a day, a time, or any of their words. "Thanks for telling me." and "Good to hear." are the kind of line.

The rest:
- Plain text. No markdown, lists, emoji, quotes around the reply, or sign-off.
- One question at most.
- You may speak of what they wrote, in your own words. Never quote it back at length.
- Never expose the machinery: no labels, scores, safety verdicts, or "my notes say".
- Never say you saved, kept or noted anything.
- You're not a therapist: no diagnoses, no advice lists, no promises.
- Xolace, the app, is where they can go deeper. Mention it only when it fits.`;

const RESOURCES_LINE =
	"A Support resources button sits under your reply. You may say support is right there, below.";
const NO_RESOURCES_LINE = "There is no support button under this reply.";

const domainName = (domain: Domain) => DOMAIN_LABELS[domain].toLowerCase();

function cardLines(card: ReplyCard | null): string {
	if (!card) {
		return "No check-in is open.";
	}
	const lines = [`The check-in, as Xolace wrote it: ${card.text}`];
	if (card.domain) {
		lines.push(`It's about their ${domainName(card.domain)}.`);
	}
	if (card.answer) {
		lines.push(`Their answer to it: ${ANSWER_WORDS[card.answer]}.`);
	}
	return lines.join("\n");
}

function turnLines(turns: ReplyTurn[]): string {
	if (turns.length === 0) {
		return "Nothing earlier in this chat.";
	}
	return turns
		.map((t) => `${t.role === "person" ? "Them" : "You"}: ${t.text}`)
		.join("\n");
}

function triggerLines(trigger: ReplyTrigger): string {
	if (trigger.kind === "tap") {
		return `They just tapped: ${ANSWER_WORDS[trigger.answer]}.\n${TAP_GOAL[trigger.answer]}`;
	}
	const care =
		trigger.level === "elevated"
			? "\nThey may be struggling more than they say. Be steady and kind, and point to the support below."
			: "";
	return `They just wrote:\n<their_words>\n${trigger.text}\n</their_words>\nAnswer what they wrote.${care}`;
}

/** The system prompt and the turn for one reply. */
export function buildReplyPrompt(input: ReplyInput): ReplyPrompt {
	const system = [
		RULES,
		`How they asked Xolace to sound. ${VOICE[input.reach]}`,
		input.resources ? RESOURCES_LINE : NO_RESOURCES_LINE,
		input.memory,
	]
		.filter(Boolean)
		.join("\n\n");
	const user = [
		cardLines(input.card),
		`Earlier in this chat, oldest first:\n${turnLines(input.turns)}`,
		triggerLines(input.trigger),
		"Write the reply now: only the message.",
	].join("\n\n");
	return { system, user };
}

const WRAPPING_QUOTES = /^["'“”‘’]+|["'“”‘’]+$/g;

/** Every life area, by key and label, as whole words. */
const LIFE_AREA = new RegExp(
	`\\b(${[
		...DOMAINS,
		...DOMAINS.flatMap((d) => DOMAIN_LABELS[d].toLowerCase().split(/\W+/)),
	]
		.filter((w) => w.length > 2)
		.join("|")})\\b`,
	"i"
);
/** A day, a month or a time: never on the lock screen. */
const WHEN =
	/\b(mon|tues?|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?s?\b|\b(today|tonight|yesterday|tomorrow|morning|evening|weekend|jan(uary)?|feb(ruary)?|march|april|june|july|aug(ust)?|sept?(ember)?|oct(ober)?|nov(ember)?|dec(ember)?)\b|\d|\b(am|pm)\b/i;
/** Words of their own a first line may share: the general kind it's made of. */
const GENERAL_WORDS = new Set([
	"about",
	"being",
	"really",
	"right",
	"sharing",
	"sounds",
	"still",
	"thank",
	"thanks",
	"there",
	"these",
	"those",
	"telling",
	"where",
	"which",
	"while",
]);
/** Their words that would say something on a lock screen. */
const telling = (text: string) =>
	(text.toLowerCase().match(/[a-z']{5,}/g) ?? []).filter(
		(w) => !GENERAL_WORDS.has(w)
	);

/**
 * Whether a first line is general enough for the lock screen: no life area,
 * no day or time, and none of the card's or their own telling words.
 */
export function isGeneralLine(line: string, privateTexts: readonly string[]) {
	if (LIFE_AREA.test(line) || WHEN.test(line)) {
		return false;
	}
	const own = new Set(privateTexts.flatMap(telling));
	return !telling(line).some((w) => own.has(w));
}

/**
 * A model reply as it goes out, or null when it breaks the rules code can
 * check: one line only, the first line too long or not general (a life
 * area, a day or time, the card's or their own words), quiet not two lines,
 * or the whole too long.
 */
export function shapeReply(
	raw: string,
	rules: { reach: Reach; private?: readonly string[] }
): string | null {
	const lines = raw
		.replace(WRAPPING_QUOTES, "")
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const [first] = lines;
	if (!first || first.length > FIRST_LINE_MAX_CHARS) {
		return null;
	}
	if (!isGeneralLine(first, rules.private ?? [])) {
		return null;
	}
	// The first line stands alone; quiet is exactly it and one more.
	if (lines.length < 2 || (rules.reach === "quiet" && lines.length !== 2)) {
		return null;
	}
	const text = lines.join("\n");
	return text.length > REPLY_MAX_CHARS ? null : text;
}
