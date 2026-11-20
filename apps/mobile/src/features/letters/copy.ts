export const COUNT_FROM = 400;
export const UNDO_SECONDS = 5;

export const FOR = [
	"Anyone",
	"Anxiety",
	"Loneliness",
	"Grief",
	"Sleep",
	"Low days",
] as const;
export type LetterFor = (typeof FOR)[number];

export const STARTERS = [
	"I don’t know what you’re carrying, but",
	"Something that helped me:",
	"You’re allowed to",
	"On a hard day, I remind myself",
] as const;

export const LETTERS_OFFER_VERSION = "letters_offer.v1";

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
	care: {
		body: "What you're carrying sounds heavier than a regular hard day. You don't have to hold it alone. There are people trained for moments like this.",
		breathe: "Breathe with me first",
		notNow: "Not right now",
		show: "Show me who I can talk to",
		talk: "Talk to a Xolacer",
		title: "I hear you.",
	},
	check: {
		held: "This letter can’t be sent.",
		lang: "Letters are English-only for now.",
	},
	dismiss: "Dismiss",
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
		offerTitle: "Receive letters?",
		open: "Open",
		sent: "Sent",
		turnOn: "Turn on",
		write: "Write a letter",
		writeLine: "One a day, unsigned. Xolace places it with someone it fits.",
	},
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
		notThere: "This letter isn’t here anymore.",
		open: "Open",
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
	status: {
		acknowledged: "Received · acknowledged",
		held: "This letter can’t be sent.",
		received: "Received",
		returned: "Not placed. No one it fit came along this time.",
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
		countUnder: (n: number) => `${n} more characters to send`,
		failed: "Your letter didn’t send. Your words are still here.",
		field: "Your letter",
		for: "For",
		noSession:
			"Letters open after your first session. Your words are still here.",
		placeholder: "Write to someone you’ll never meet…",
		reading: "Reading it over…",
		send: "Send",
		startWith: "Start with",
		title: "A letter",
	},
} as const;
