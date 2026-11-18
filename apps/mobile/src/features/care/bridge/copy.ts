/** Trusted Bridge: production's intro, recipient step and states, in the prototype's words for
 * the draft (`BRIDGE` in the prototype's settings fixture). */
export const COPY = {
	draft: {
		back: "Back",
		done: "Done",
		doneHint: "Finish and return home",
		editHint: "Double tap to edit",
		error:
			"Couldn't personalize this time, but the template below is yours to edit.",
		fallback:
			"Hey — I've been working through something lately and I'd really like to talk to you about it. Could we find some time soon?",
		label: "YOUR WORDS",
		later: "Not right now",
		mascot: "Flux with a bundle",
		privacy: "Used only to write your draft · never stored",
		rateLimited:
			"That's every draft you have today. It comes back tomorrow, the template below is yours to edit in the meantime.",
		share: (name: string) => `Share with ${name}`,
		sub: "Shaped around what you felt. Edit it until it sounds like you, then share when you're ready.",
		title: (name: string) => `A message for ${name}.`,
	},
	intro: {
		begin: "Begin",
		body: "Processing is one thing. Telling someone who matters is another. Trusted Bridge turns what you felt into something you can actually say.",
		mascot: "Flux sending a paper boat",
		privacy: [
			{
				icon: { android: "security", ios: "lock.shield.fill" },
				sub: "Who you're writing to is never saved.",
				title: "Never stored",
			},
			{
				icon: { android: "auto_awesome", ios: "sparkles" },
				sub: "Their name shapes the draft, then it's discarded.",
				title: "Used only to write this",
			},
			{
				icon: { android: "back_hand", ios: "hand.raised.fill" },
				sub: "Only you decide if it goes.",
				title: "Nothing sends itself",
			},
		],
		title: "Felt it.\nNow find the words.",
	},
	loading: {
		mascot: "Flux thinking",
		sub: "Turning what you felt into something you can say.",
		them: "them",
		title: (name: string) => `Finding the words for ${name}…`,
	},
	quota: {
		freeLeft: (n: number) => `${n} draft today.`,
		freeOut: "That's today's draft. It comes back tomorrow.",
		plus: (n: number) => `Xolace+ gives you ${n} a day`,
		plusLabel: (n: number) => `Xolace Plus gives you ${n} drafts a day`,
		plusOut: "That's every draft today. They come back tomorrow.",
	},
	recipient: {
		address: "What do you call them?",
		addressPlaceholder: "or type what you call them",
		addressSub:
			"Optional - the message will open with exactly this word, the way you greet them (like “Mom”, “babe” or “bro”), instead of their name.",
		close: "Close",
		left: (n: number) => `${n} characters left`,
		nameLabel: "Their name",
		namePlaceholder: "their name or how you think of them",
		relationship: "Their relationship to you",
		relationshipSub: "Optional - helps us find the right tone for your words",
		sub: "We'll shape the message around them. We never store who they are.",
		title: "Who would you like to tell?",
		write: "Write this together",
	},
	toast: { progress: "Couldn't save your progress. Try sharing again." },
} as const;
