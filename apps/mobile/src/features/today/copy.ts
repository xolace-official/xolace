import type { TodayPhase } from "./today-model";

export const COPY = {
	campfire: {
		campers: (n: number) => (n === 1 ? " camper" : " campers"),
		count: (emotion: string) => ` sat with ${emotion} by the fire this week.`,
		lighter: (percent: number) =>
			`When they say how they feel afterwards, ${percent}% say lighter.`,
		link: "You are not alone.",
		stats: (n: number) =>
			n === 1
				? " person has sat by this fire."
				: " people have sat by this fire.",
		warming: (emotion: string) =>
			`Others have sat with ${emotion} by this fire too.`,
	},
	card: {
		a11yHint: (doors: string, count: number) =>
			`Opens Reflect. ${doors} ${count === 1 ? "is" : "are"} in actions.`,
		and: "and",
		failed: {
			body: "Something got in the way. Open it to see what you can do.",
			hint: "Tap to open it",
			title: "That one didn't go through",
		},
		hint: (doors: string) => `Hold the card for ${doors}`,
		monthLabel: "THIS MONTH",
		next: {
			body: "Your mirror landed. The next step is yours to choose.",
			hint: "Tap to pick up where you left off",
			title: "Where to from here?",
		},
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
		ready: {
			body: "It's here for a little while, when you're ready.",
			hint: "Tap to open it",
			title: "Your mirror is ready",
		},
		speak: "Speak instead",
		waiting: {
			body: "Finding the words. It'll be here when you're back.",
			hint: "Tap to wait with it",
			title: "Still with your words",
		},
	},
	doors: {
		sit: { label: "Sit with this", sub: "Breathe first" },
		talk: { label: "Talk", sub: "Out loud" },
		title: "How do you want to let it out?",
		vent: { label: "Vent", sub: "Let it rip" },
		writeInstead: "Write instead",
	},
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
	kindling: {
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
		anyKind: { length: "WHEN YOU'RE READY", title: "A small step" },
		begin: "Begin",
		done: "DONE",
		doneEyebrow: "THIS KINDLING IS DONE",
		empty: {
			free: {
				action: "See how",
				eyebrow: "PART OF XOLACE+",
				hint: "Shows Xolace+",
				label: "Your kindling, part of Xolace+. A few steps after each talk.",
				title: "A few steps after each talk",
			},
			plus: {
				action: "Talk",
				eyebrow: "NONE RIGHT NOW",
				hint: "Opens Talk",
				label: "Your kindling. None right now. Your next talk lights one.",
				title: "Your next talk lights one",
			},
			settingUp: {
				eyebrow: "SETTING UP",
				label: "Your kindling is being set up. It lands here when it’s ready.",
				title: "It lands here when it’s ready",
			},
		},
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
	listen: {
		family: { music: "Music", support: "Support audio" },
		hint: "Opens the player",
		lateTitle: "For the quiet",
		locked: ", Xolace+",
		lockedHint: "Part of Xolace+",
		playing: ", playing",
		seeAll: "See all",
		seeAllLabel: "See all in Explore",
		title: "Something to listen to",
	},
	moments: {
		openHint: "Opens this moment",
		seeAll: "See all",
		seeAllLabel: "See all moments",
		title: "Your moments",
	},
	opensReflect: "Opens Reflect",
	partOfDay: {
		dawn: "early",
		day: "afternoon",
		evening: "evening",
		late: "late",
	} satisfies Record<TodayPhase, string>,
	reflect: "Reflect",
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
	word: {
		eyebrow: "TODAY'S WORD",
		fallback:
			"Curated lines for the day, and the ones your own sessions left behind.",
		label: "Open daily quotes",
		sub: "Chosen for you · tap to reply",
		title: "A word for today",
	},
} as const;
