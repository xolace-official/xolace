/**
 * After a session: every string the two moments show (the prototype's
 * `fixtures/session.ts`, from the board, curly apostrophes included).
 */
export const COPY = {
	another: "Start another",
	chip: (day: number) => `Day ${day}`,
	continue: "Continue",
	done: "I’m done for now",
	followUp: {
		/** Step −4 and −5 (production's "high" bucket). */
		high: {
			ask: "What’s bearing down hardest right now?",
			rows: [
				{ key: "mirror_missed", label: "The mirror missed" },
				{ key: "something_happened", label: "Something happened" },
				{ key: "building_for_a_while", label: "Building for a while" },
				{ key: "needed_to_say_it", label: "I needed to say it" },
			],
		},
		/** Step −3 (production's "mid" bucket). */
		mid: {
			ask: "What’s keeping it this heavy?",
			rows: [
				{ key: "mirror_missed", label: "The mirror missed" },
				{ key: "life_is_heavy", label: "Life is just heavy" },
				{ key: "feeling_disconnected", label: "Feeling disconnected" },
				{ key: "something_else", label: "Something else" },
			],
		},
		notNow: "Not now",
		sub: "Optional. One tap is enough.",
		thanks: "Thank you. We hear you.",
	},
	heavier: "heavier",
	late: {
		line: "It’ll still be here tomorrow if you need it.",
		title: ["You can put", "it down now."],
	},
	lighter: "lighter",
	next: {
		kfree: {
			sub: "3 small steps, with Xolace+",
			title: "Turn this into kindling",
		},
		kindling: {
			sub: "3 small steps from tonight",
			title: "Your kindling is ready",
		},
		/** Before this session's kindling has landed (production's slot said so too). */
		kindlingSettingUp: {
			sub: "It lands on Today when it’s ready",
			title: "Setting up your kindling…",
		},
		/** Letters (handoff `letters.md` §2): until it's opened. */
		letterRead: {
			sub: "Someone wrote it for whoever needed it",
			title: "A letter is waiting for you",
		},
		letterWrite: {
			sub: "A few kind lines, for whoever needs them",
			title: "Write a letter to a stranger",
		},
		listen: {
			sub: "Sounds made for after a session",
			title: "Something soft to listen to",
		},
		listener: {
			sub: "A trained peer, not a therapist. This only opens their profile.",
			title: (name: string, listensTo: string) =>
				`${name} listens to ${listensTo}`,
		},
		loading: "Finding something for you",
	},
	nextLabel: "Next, if you want it",
	nothing: {
		sub: "What you wrote is saved to your moments.",
		title: ["Go gently."],
	},
	notSure: "Not sure",
	notSureLine: "That’s okay. It can take a while to land.",
	notSureWord: "not sure",
	private: "Only you see this.",
	question: "How do you feel now?",
	share: {
		caption: "Distilled from your words. Nothing that points to you.",
		holding: "Keep holding…",
		keep: "Not this time",
		kept: "Kept just for you.",
		leave: "Leave it",
		leaving: "Leaving it for someone",
		left: "Left for someone.",
		letGo: "Let go",
		/** The line under the title, by the path the session ended on. */
		sub: {
			peers: "Like the four you just read, someone out there might need yours.",
			sit: "Someone out there might be carrying something just like this.",
		},
		title: ["Leave it for someone?"],
	},
	skip: "Skip for now",
	slide: "Slide to answer",
	sliderLabel: "How do you feel now, from heavier to lighter",
	title: ["You showed up", "for yourself today."],
} as const;
