import type { TodayPhase } from "./today-model";

/**
 * Every string Today shows (design/handoff/today.md §3, the TodayAlive board). The
 * board's "Thursday" and "Ama" are the device's weekday and the user's display name.
 */
export const COPY = {
	/** The campfire (board `.camp`): this week's cohort, from `cohort.getWeeklyCohortCard`. */
	campfire: {
		campers: (n: number) => (n === 1 ? " camper" : " campers"),
		count: (emotion: string) => ` sat with ${emotion} by the fire this week.`,
		lighter: (percent: number) =>
			`When they say how they feel afterwards, ${percent}% say lighter.`,
		link: "You are not alone.",
		/** The v2 intake's count when there's no cohort yet (`intake.campfireStats`). */
		stats: (n: number) =>
			n === 1
				? " person has sat by this fire."
				: " people have sat by this fire.",
		warming: (emotion: string) =>
			`Others have sat with ${emotion} by this fire too.`,
	},
	/** The Reflect card (board `.hero`): its question by phase, the field's rotating lines and the hint. */
	card: {
		/** VoiceOver only; `doors` is the doors' list ("Talk and Vent"). */
		a11yHint: (doors: string, count: number) =>
			`Opens Reflect. ${doors} ${count === 1 ? "is" : "are"} in actions.`,
		and: "and",
		hint: (doors: string) => `Hold the card for ${doors}`,
		/** The month's prompt on the card while it's carried this week (board `.ph.wrote .tref`). */
		monthLabel: "THIS MONTH",
		or: "or",
		placeholders: {
			day: [
				"Write it out…",
				"Start with one word…",
				"Or hold the mic and say it",
			],
			late: [
				"Say it, then set it down…",
				"One line is enough…",
				"Or hold the mic and say it",
			],
		},
		prompt: {
			dawn: "What are you waking up with?",
			day: "What's sitting with you right now?",
			evening: "What's sitting with you right now?",
			late: "What's carrying over?",
		} satisfies Record<TodayPhase, string>,
		/** The mirror came back while you were away (board `restReady`). */
		ready: {
			body: "It's waiting for you, whenever you are.",
			hint: "Tap to open it",
			title: "Your mirror is ready",
		},
		speak: "Speak instead",
		/** Your words are with the mirror (board `restWaiting`): the card is a way back to them. */
		waiting: {
			body: "Finding the words. It'll be here when you're back.",
			hint: "Tap to wait with it",
			title: "Still with your words",
		},
	},
	/** Hold the card: the doors rise out of the hint line. */
	doors: {
		sit: { label: "Sit with this", sub: "Breathe first" },
		talk: { label: "Talk", sub: "Out loud" },
		title: "How do you want to let it out?",
		vent: { label: "Vent", sub: "Let it rip" },
		writeInstead: "Write instead",
	},
	/** The greeting, with the display name when there is one. */
	greeting: {
		dawn: (name: string | null) =>
			name ? `Good morning, ${name}` : "Good morning",
		day: (name: string | null) =>
			name ? `Good afternoon, ${name}` : "Good afternoon",
		evening: (name: string | null) =>
			name ? `Good evening, ${name}` : "Good evening",
		late: (name: string | null) => (name ? `Still up, ${name}?` : "Still up?"),
	} satisfies Record<TodayPhase, (name: string | null) => string>,
	help: "Get help now",
	/** Your kindling (board `.kin`, `P/src/fixtures/kindling.ts` KINDLING_TODAY). */
	kindling: {
		/** VoiceOver: each step's state, and the count. */
		a11y: {
			count: (k: number, n: number) => `${k} of ${n} tended`,
			later: "Later",
			next: "Next",
			passed: "Passed by",
			peekHint: "Shows this step below",
			tended: "Tended",
		},
		all: (n: number) =>
			`ALL ${n === 3 ? "THREE" : n === 4 ? "FOUR" : n} TENDED`,
		allTitle: "The fire's kept. Flux saved it.",
		/** A kind of step this build doesn't know yet. */
		anyKind: { length: "WHEN YOU'RE READY", title: "A small step" },
		begin: "Begin",
		done: "DONE",
		doneEyebrow: "THIS KINDLING IS DONE",
		/** Each kind of step: its title when the server sends none, and how long it asks (production's twig eyebrows). */
		kinds: {
			audio: { length: "SOMETHING TO HEAR", title: "A voice for this" },
			breathing: { length: "A FEW MINUTES", title: "Sit with this" },
			bridge: { length: "WHEN YOU'RE READY", title: "Tell someone you trust" },
			music: { length: "SOMETHING TO HEAR", title: "Low sound for the quiet" },
			read: { length: "SOMETHING TO READ", title: "A few pages for this" },
			try: { length: "AWAY FROM THE APP", title: "Something to try" },
			xolacer: {
				length: "WHEN YOU WANT IT",
				title: "Someone who has been here",
			},
		},
		later: (length: string) => `LATER · ${length}`,
		next: (length: string) => `NEXT · ${length}`,
		/** Follows the rolling count: "{k} of 4 tended". */
		of: (n: number) => ` of ${n} tended`,
		open: "Open your kindling",
		passed: "PASSED BY",
		seeIt: "See it",
		title: "Your kindling",
	},
	lateCare: {
		sub: "People you can reach, any time",
		title: "If tonight is heavy",
	},
	/** The listening rail (board `.rail`), from the hub's New shelf. */
	listen: {
		family: { music: "Music", support: "Support audio" },
		/** VoiceOver: where a tile goes (holding to preview is touch only). */
		hint: "Opens the player",
		lateTitle: "For the quiet",
		/** A free member's tile: it opens Xolace+. */
		locked: ", Xolace+",
		lockedHint: "Part of Xolace+",
		playing: ", playing",
		seeAll: "See all",
		seeAllLabel: "See all in Explore",
		title: "Something to listen to",
	},
	/** Your moments (production's carousel). */
	moments: {
		/** VoiceOver: what a moment card does. */
		openHint: "Opens this moment",
		seeAll: "See all",
		seeAllLabel: "See all moments",
		title: "Your moments",
	},
	/** VoiceOver only: the toolbar's Reflect pill. */
	opensReflect: "Opens Reflect",
	/** The eyebrow's second half, after the weekday ("Thursday · evening"). */
	partOfDay: {
		dawn: "early",
		day: "afternoon",
		evening: "evening",
		late: "late",
	} satisfies Record<TodayPhase, string>,
	reflect: "Reflect",
	/** A streak that broke yesterday, revived with one saver (production's chip and sheet). */
	rekindle: {
		ask: "Use 1 streak saver",
		chip: "Tap to rekindle",
		desc: (n: number) =>
			`Your ${n}-day streak went quiet. You can rekindle it until tonight.`,
		failed: "Couldn't rekindle it. Try again.",
		gone: "That streak can't be rekindled any more.",
		label: (n: number) => `${n}-day streak went quiet. Tap to rekindle`,
		notNow: "Not now",
		quiet: (n: number) => `Your ${n}-day streak went quiet`,
		title: "The embers are still warm",
	},
	streakHint: "Opens You",
	streakLabel: (n: number) => (n === 1 ? "1 day streak" : `${n} day streak`),
	title: "Today",
	/** A word for today: today's quote, into Quotes. */
	word: {
		eyebrow: "TODAY'S WORD",
		/** Production's quotes card line, when there's no quote to show yet. */
		fallback:
			"Curated lines for the day, and the ones your own sessions left behind.",
		label: "Open daily quotes",
		sub: "Chosen for you · tap to reply",
		title: "A word for today",
	},
} as const;
