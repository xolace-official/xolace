import type { Run } from "./thread-model";

const t = (text: string): Run => ({ text });
const bold = (text: string): Run => ({ bold: true, text });

export const THREAD = {
	appearsOnAccept: "Messages will appear here once your request is accepted.",
	bar: {
		accept: "Accept",
		asked: (name: string) => [
			bold(name),
			t(
				" asked to talk. Accepting opens a conversation only the two of you can see."
			),
		],
		askedPresent: (name: string) => [
			bold(name),
			t(" asked to talk. "),
			bold("They're still in the app right now."),
			t(" Accepting opens a conversation only the two of you can see."),
		],
		cantPickUp: (name: string) => [
			t(`${name} isn't able to pick this one up. `),
			bold("Nothing to do with you."),
			t(" It happens, and there are others here."),
		],
		changeRating: "Change how you rated this",
		closedHistory: [
			t("This conversation is closed. "),
			bold("Everything you two wrote is still here."),
		],
		closedRequest: [t("This request is closed. Nothing was sent either way.")],
		decline: "Not right now",
		findAnother: "Find another Xolacer",
		goneQuiet: (name: string) => [
			t("This one's gone quiet. "),
			bold(`${name} is still here.`),
			t(" Picking it up doesn't need a new request."),
		],
		rate: "How was this conversation?",
		resume: "Pick this back up",
		sentAway: (name: string) => [
			t("Request sent. "),
			bold(`${name} has stepped away for now.`),
			t(
				" A notification will reach them, and they can accept when they have space."
			),
		],
		sentPresent: (name: string) => [
			t("Request sent. "),
			bold(`${name} is here right now.`),
			t(" They can accept it whenever they see it."),
		],
		steppedBack: (name: string) => [
			t(`${name} has stepped back for now. Nothing to do with you. `),
			bold("Everything you two wrote is still here."),
		],
		theyWrappedUp: (name: string) => [
			bold(`${name} wrapped this one up.`),
			t(
				" Nothing to do with you. Everything you wrote is still here, and picking it back up doesn't need a new request."
			),
		],
		youWrappedUp: [
			t("You wrapped this one up. "),
			bold("Nothing was deleted."),
			t(" Picking it back up doesn't need a new request."),
		],
	},
	blockDialog: {
		body: "Neither of you will be able to send another message here, and this can't be undone.",
		bodyHistory:
			"Neither of you will be able to send another message here, and this can't be undone. Everything already written stays.",
		confirm: "Block",
		title: "Block this conversation?",
	},
	help: "Get help now",
	hereNow: "here now",
	lastHere: (ago: string) => `last here ${ago}`,
	loading: "Loading your conversation",
	menu: {
		block: "Block",
		changeRating: "Change your rating",
		rate: "Rate this conversation",
		report: "Report",
	},
	messagesFailed:
		"Messages couldn't load. Check your connection and try again.",
	more: "More",
	nothingSaid: "Nothing was said here.",
	notTaking: "Not taking conversations right now",
	offline: "offline",
	offlineStrip:
		"You're offline. Messages won't send until the connection is back.",
	opensOnAccept:
		"Nothing has been said yet. The conversation opens once you accept.",
	placeholder: (name: string) => `Message ${name}`,
	reconnecting: "Reconnecting. Hold onto that for a second.",
	requestClosed: "This request is closed",
	requestSent: "Request sent, no reply yet",
	resource: {
		call: "Call",
		email: "Email",
		forSeeker:
			"This sounds like a lot to be holding right now. You don't have to carry it alone. These are here for you, any time.",
		forXolacer:
			"What was just shared may be more than a conversation can hold. These are here for both of you. You can point to them, and you don't have to carry this alone.",
		fromXolace: "From Xolace",
		noDialer: "Couldn't open the dialer. Please dial the number yourself.",
		noLink: "Couldn't open the link.",
		noMail: "Couldn't open a mail app.",
		open: "Open",
	},
	resting: "Resting",
	restingSince: (ago: string) => `Resting · last spoke ${ago}`,
	toast: {
		blockFailed: "Couldn't block this conversation",
		declineFailed: "Couldn't decline. Try again.",
		flagFailed: "Couldn't flag this message",
		flagged: "Flagged.",
		flaggedBody: "Someone will take a look.",
		resumeFailed: "Couldn't pick this back up. Try again.",
		resumeLimit: (max: number) =>
			`You've got ${max} conversations open. Let one rest before picking this back up.`,
		resumeQuiet: "This one has gone quiet on their end too.",
		tryAgain: "Something went wrong. Try again.",
	},
	tryAgain: "Try again",
	typing: "typing…",
	unavailable: {
		body: "It may have been closed, or it isn't yours to open.",
		title: "This conversation isn't here",
	},
	usuallyReplies: "usually replies within a day",
	viewProfile: (name: string) => `View ${name}'s profile`,
	waitingOnYou: "Waiting on you",
	waitingOnYouAfterSession: "Waiting on you · just after a session",
	xolacerPrefix: "Xolacer · ",
} as const;
