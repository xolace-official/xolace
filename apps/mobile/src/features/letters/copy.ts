/**
 * Every string Letters shows, and the limits its copy speaks of (handoff `letters.md` §3, the
 * board `LettersAlive.dc.html`). Words: letter, sender, recipient, received, acknowledge; never
 * message, note, DM or delivered. The caps (one a day, three waiting) are the contract's: the
 * server says when Write is off, and these lines only say why.
 */

/** A letter needs at least this many characters to send. */
export const LETTER_MIN = 40;
/** And can't be longer than this. */
export const LETTER_MAX = 500;
/** The count shows under LETTER_MIN and past this. */
export const COUNT_FROM = 400;
/** Acknowledge and Hide can be undone for this long. */
export const UNDO_SECONDS = 5;

/** "For": Anyone by default, then the matching's feeling families (the board's stand-ins). */
export const FOR = [
	"Anyone",
	"Anxiety",
	"Loneliness",
	"Grief",
	"Sleep",
	"Low days",
] as const;
export type LetterFor = (typeof FOR)[number];

/** Human-written starters. They drop into the letter and stay editable. Never AI help. */
export const STARTERS = [
	"I don’t know what you’re carrying, but",
	"Something that helped me:",
	"You’re allowed to",
	"On a hard day, I remind myself",
] as const;

/** Report's reasons, in the board's order; a reason is required (open question 30). */
export const REPORT_REASONS = [
	"unkind",
	"selling",
	"private",
	"other",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const LETTERS = {
	card: {
		invite: "Write a few kind lines for a stranger",
		threeWaiting: "3 letters waiting to be received",
		waitingForYou: "A letter is here for you",
		wroteToday: "You wrote today’s letter",
	},
	/** At risk: Reflect's care, word for word (open question 27), plus Talk to a Xolacer. */
	care: {
		body: "What you're carrying sounds heavier than a regular hard day. You don't have to hold it alone. There are people trained for moments like this.",
		breathe: "Breathe with me first",
		notNow: "Not right now",
		show: "Show me who I can talk to",
		talk: "Talk to a Xolacer",
		title: "I hear you.",
	},
	/**
	 * The check's lines (#750). At risk has none; a check that can't finish reads as a pass. A
	 * fixable letter's line is the server's (`outcome.line`): it names what to take out.
	 */
	check: {
		held: "This letter can’t be sent.",
		lang: "Letters are English-only for now.",
	},
	endCard: {
		read: {
			sub: "Someone wrote it for whoever needed it",
			title: "A letter is waiting for you",
		},
		write: {
			sub: "A few kind lines, for whoever needs them",
			title: "Write a letter to a stranger",
		},
	},
	/** Above every letter. */
	fixedLine: "Someone wrote this for whoever needed it",
	hub: {
		footnote: "Only you see this list. Nothing here says who received them.",
		forYou: "For you",
		hidden: (n: number) => `Hidden · ${n}`,
		hiddenA11y: (n: number) => `Hidden, ${n}`,
		letterForYou: "A letter for you",
		letterForYouSub: "Someone wrote it for whoever needed it",
		noneSent: "You haven’t written one yet.",
		nothingYet: "Nothing yet. When a letter fits, it comes here.",
		off: "Letters for you are off.",
		/** The Letters screen's offer drops the "too" (board, hub `.hcard.offer`). */
		offerTitle: "Receive letters?",
		open: "Open",
		sent: "Sent",
		turnOn: "Turn on",
		write: "Write a letter",
		writeLine: "One a day, unsigned. Xolace places it with someone it fits.",
	},
	/** One line, first that applies, when Write is off. */
	limit: {
		three:
			"Three of your letters are still waiting to be received. You can write again when one is.",
		today: "You’ve written today’s letter. You can write another tomorrow.",
	},
	offer: {
		body: "Xolace picks letters based on how your recent sessions felt. The sender never learns who you are.",
		notNow: "Not now",
		title: "Receive letters too?",
		yes: "Yes",
		yesA11y: "Yes, receive letters",
	},
	/** The three pushes (B12 sends them; open question 28: kept as written). */
	push: {
		acknowledged: "Your letter reached someone",
		acknowledgedSub: "They acknowledged it.",
		received: "One of your letters was received",
		receivedSub: "Xolace placed it with someone it fits.",
		recipient: "Someone wrote you a letter",
	},
	read: {
		acknowledge: "This reached me",
		acknowledged: "Acknowledged. The sender will know it reached someone.",
		acknowledgeHint: "The sender will know it reached someone.",
		footer: "Letters for you are on · Change in Settings",
		footerA11y: "Letters for you are on. Change in Settings",
		gone: "Reported. The letter is gone.",
		hide: "Hide",
		hint: "Drag the letter up to open it",
		/** Proposed (the prototype has no line): a letter that's gone, or not yours. */
		notThere: "This letter isn’t here anymore.",
		open: "Open",
		/** Proposed: Open failed, and the letter sealed again. */
		openFailed: "Couldn’t open it. Try again.",
		report: "Report",
		rowAcknowledged: "Received · you acknowledged it",
		rowHidden: "Hidden",
		rowReceived: "Received",
		undo: "Undo",
		undoAcknowledged: "Acknowledged",
		undoAvailable: (what: string) => `${what}. Undo is available.`,
		undoHidden: "Letter hidden",
		unhidden: "Unhidden. It’s back with your letters.",
		unhide: "Unhide",
	},
	report: {
		note: "It goes away at once. The sender isn’t told.",
		reasons: {
			other: "Something else",
			private: "It shares private details",
			selling: "It’s selling something",
			unkind: "It’s unkind or hurtful",
		} satisfies Record<ReportReason, string>,
		send: "Report",
		title: "Report this letter",
	},
	sent: {
		body: "Xolace will place it with someone it fits. Your letters show when it’s received.",
		done: "Done",
		seeLetters: "See your letters",
		title: "It’s on its way.",
	},
	/** A sent letter's status: nothing about the recipient, and no "read". */
	status: {
		acknowledged: "Received · acknowledged",
		received: "Received",
		waiting: "Waiting to be received",
	},
	title: "Letters",
	withdraw: {
		action: "Withdraw",
		body: "It won’t be placed with anyone. You can’t undo this.",
		cancel: "Cancel",
		title: "Withdraw this letter?",
	},
	write: {
		countLeft: (n: number) => `${n} left`,
		/** Under LETTER_MIN, then past COUNT_FROM. */
		countUnder: (n: number) => `${n} more characters to send`,
		/** Send didn't reach the server: the words stay; nothing else changes. */
		failed: "Your letter didn’t send. Your words are still here.",
		field: "Your letter",
		for: "For",
		placeholder: "Write to someone you’ll never meet…",
		reading: "Reading it over…",
		send: "Send",
		startWith: "Start with",
		title: "A letter",
	},
} as const;
