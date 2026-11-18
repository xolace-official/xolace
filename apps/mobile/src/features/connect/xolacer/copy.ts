/** A Xolacer's profile: the prototype's labels, production's facts and request states. */
export const PROFILE = {
	ask: "Ask to talk",
	askSub: "They'll get a request and can accept when they're ready.",
	cooldown: "Not right now",
	edit: "Edit your profile",
	expect: "What to expect",
	expectA11y: "What to expect. Read the full note.",
	gone: {
		body: "Their profile may have been unpublished. There are others on the roster.",
		title: "This Xolacer isn't here",
	},
	hereNow: "here now",
	nameHereNow: (name: string) => `${name}, here now`,
	newXolacer: "New Xolacer",
	notEnoughRated: "Not enough conversations rated yet",
	notRightNow: (name: string) =>
		`${name} isn't taking new conversations at the moment. Nothing to do with you. Try someone else on the roster.`,
	notRightNowTitle: "Not right now",
	notTaking: "Not taking conversations",
	notTakingNote: "They'll show up as available again when they have space.",
	openChat: "Open chat",
	otherListeners: (what: string) => `Others listen to ${what} too`,
	otherListenersA11y: (what: string) =>
		`See other Xolacers who listen to ${what}`,
	privacy: "Private between you two. It's never linked to your reflections.",
	privacyLabel: "Your chat",
	rateA11y: (name: string) => `Rate your conversation with ${name}`,
	rateAction: "Rate",
	rated: (rating: number, count: number) =>
		`★ ${rating.toFixed(1)} · ${count} conversation${count === 1 ? "" : "s"} rated`,
	ratedA11y: (n: number) => `You rated ${n} out of 5. Change your rating.`,
	ratedLine: (n: number) => `You rated ★${n}. Change`,
	rateSub: "Only you and Xolace see your score.",
	rateTitle: (name: string) => `How was talking with ${name}?`,
	repliesInADay: "replies within a day",
	requestNote: (name: string) =>
		`${name} has your request and can accept when they're ready.`,
	seeRequest: "See your request",
	self: "This is how your profile looks to everyone else.",
	since: (when: string) => `Xolacer since ${when}`,
	talkedBefore: "You've talked before",
	talkedOpen: "Your conversation is still here. Open it any time.",
	talkedResting:
		"Your conversation is still here. Picking it back up doesn't need a new request.",
	toast: {
		notTaking: (name: string) =>
			`${name} isn't taking conversations right now.`,
		openLimit: (max: number) =>
			`You've got ${max} conversations open. Let one rest before starting another.`,
		pendingLimit: (max: number) =>
			`You're already waiting on ${max} Xolacers. Give them a moment to reply.`,
	},
	who: (name: string) =>
		`${name} is a trained peer Xolacer, not a therapist. No diagnoses, no clinical advice.`,
	whoLabel: "Who they are",
} as const;
