/**
 * Reflect's words, verbatim from the live board (prototype `src/fixtures/reflect.ts`, board
 * constants 782–833) and production where the board borrowed them. The wait's line follows the
 * server's `processingStage`; the escalation list's rows come from the session, only their verbs
 * and readouts are here.
 */
export const COPY = {
	care: {
		a11y: {
			email: (name: string, value: string) => `Email ${name}, ${value}.`,
			phone: (name: string, value: string) => `Call ${name}, ${value}.`,
			text: (name: string, value: string) => `${name}, ${value}`,
			url: (name: string) => `Open ${name}.`,
		},
		/** The verb on a resource row, by how it opens; rows come from the session. The
		 * readouts are written for VoiceOver (the board's spelled the number out by hand). */
		act: { email: "Email", phone: "Call", text: "", url: "Open" },
		back: "Back",
		body: "What you're carrying sounds heavier than a regular hard day. You don't have to hold it alone. There are people trained for moments like this.",
		breath: {
			idle: ["Hold to breathe in", "Let go whenever you like"],
			in: ["Breathe in", "Keep holding"],
			out: ["Breathe out", "Let it go by itself"],
		},
		breathe: "Breathe with me first",
		notNow: "Not right now",
		resTitle: "People who answer",
		seen: "I've seen these",
		show: "Show me who I can talk to",
		title: "I hear you.",
	},
	chrome: {
		close: "Close, your draft is kept",
		/** Heard: the session has ended, so ✕ goes on to its end. */
		closeHeard: "Close",
		closeWaiting: "Step away, it keeps going",
		help: "Get help now",
		labels: {
			heard: "",
			land: "Thinking",
			mirror: "The mirror",
			next: "Where next",
			wait: "Thinking",
			write: "Reflect",
		},
	},
	dictation: {
		/** Production's first-mic-tap upsell (#559), verbatim. */
		upsell: {
			body: "Your phone can already write down what you say. Xolace+ catches it more closely: the pauses, the names, the way you actually talk. Either way, it's yours to edit before you send it.",
			notNow: "Not now",
			title: "Sharper dictation",
			upgrade: "Upgrade to Xolace+",
		},
	},
	heard: {
		body: "It's saved in Moments whenever you want to come back.",
		days: "days",
		next: "Continue",
		title: { evening: "Heard.", late: "Heard. Rest if you can." },
	},
	mirror: {
		capHint: "That’s two tries. You can leave it here.",
		first: "First",
		fromTalk: (companion: string) => `From your talk with ${companion}`,
		hint: "Not quite? Drag the line that missed.",
		label: "THE MIRROR",
		leaveIt: "Leave it here. It still counts.",
		lineAction: "This part missed",
		notQuite: "Not quite",
		pause: "Pause",
		pickHint: "Which part missed? Tap it.",
		readAloud: "Read it aloud",
		revised: "Revised",
		sayMore: "Say more",
		/** Production's hint when the mirror named a gap (#360). */
		sayMoreHelps:
			"Recommended: add more so the mirror has something to work with",
		takenFrom: "Taken from your words above",
		tapLine: "Tap the line that missed",
		thatsIt: "That's it",
	},
	next: {
		mirrorLabel: "THE MIRROR",
		paths: [
			{
				id: "solo",
				sub: "A quiet space to breathe",
				title: "Sit with this",
			},
			{
				id: "peers",
				sub: "See what others have shared",
				title: "You're not alone",
			},
			{
				id: "exit",
				sub: "Leave it here. It's kept.",
				title: "I just needed to say it",
			},
		],
		/** Production's space-name prompt, asked once on Where next (kit `NameDialog`). */
		spaceName: {
			cancel: "Not now",
			desc: "A soft label, just for you. You can change it anytime in settings.",
			field: "Name",
			save: "Save",
			title: "Want to give this space a name? It's yours.",
		},
		sub: "Pick whichever feels right.",
		title: "Where to from here?",
		/** Production's gave-up card (`feedback.submit`, `gave_up`), after Leave it here. */
		whatHappened: {
			options: [
				{ id: "mirror_kept_missing", label: "The mirror kept missing" },
				{ id: "figured_it_out", label: "I found it myself" },
				{ id: "needed_to_vent", label: "I just needed to express it" },
			],
			title: "What happened?",
		},
	},
	notQuite: {
		cancel: "Cancel",
		closer: "What’s closer?",
		missing: "What’s missing?",
		placeholder: "Help me understand better…",
		/** Production's four reasons (`MissReason`), in the board's words. */
		reasons: [
			{
				id: "wrong_emotion",
				label: "Wrong feeling",
				placeholder: "What does it feel like, really?",
			},
			{
				id: "too_surface_level",
				label: "Too surface-level",
				placeholder: "What’s underneath it?",
			},
			{
				id: "close_but_not_quite",
				label: "Close, not quite",
				placeholder: "What’s the part it missed?",
			},
			{
				id: "missed_the_main_thing",
				label: "Missed the main thing",
				placeholder: "What’s the main thing?",
			},
		],
		sayMorePlaceholder: "Add what’s missing…",
		send: "Send",
	},
	wait: {
		backOnline: "I’m back online",
		/** Production's error state (#283, #377): the fallback, the safeguard's no and the hourly cap. */
		failed: "Something went wrong.",
		keepsGoing: "It keeps going. Today will show when it’s ready.",
		keepWaiting: "Keep waiting",
		limitMore: "Xolace+ raises the hourly limit.",
		offline:
			"You’re offline. Your words are kept here, and they’ll go when you’re back.",
		offlineCard:
			"Nothing is lost. You can close Reflect; your words wait on the Today card.",
		// Copy pending safety review: never name the category or imply fault.
		rejected:
			"This is something I can't reflect back here. If it's weighing on you, talking to someone can help.",
		seePlus: "See Xolace+",
		slow: "This is taking longer than usual. I’m still with it. You can step away and I’ll keep it on Today.",
		/** Production's `processingStage`: still reading, connecting, writing. */
		stages: [
			"Taking this in…",
			"Holding this next to what you’ve shared before…",
			"Finding the words…",
		],
		startOver: "Start over",
		stepAway: "Step away",
		stepAwayLink: "Step away, I'll keep this",
		talkToSomeone: "Talk to someone",
		tryAgain: "Try again",
		yourWords: "YOUR WORDS",
	},
	write: {
		cancelled: "Cancelled. Nothing was kept.",
		draftKept: "Draft kept on the card",
		/** Production's bridge toasts (#462, #707). */
		draftStillHere: "Your draft is still here",
		fourIsPlenty: "Four is plenty",
		letGoCancel: "Let go to cancel",
		listening: "Listening",
		nudge: {
			evening: "There’s no rush. Let it come.",
			late: "No rush. One line is enough tonight.",
		},
		placeholders: {
			evening: [
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
			evening: "What’s sitting with you right now?",
			late: "What’s carrying over?",
		},
		/** Production's quote-reply seed (#316) takes the question's place. */
		replySeed: (seed: string) => `You wrote: “${seed}”`,
		send: "Let it out",
		slideCancel: "Slide up to cancel",
		/** For VoiceOver and TalkBack, where a double tap starts and stops a take. */
		speakHint: "Hold and talk. Slide up to cancel.",
		speakLabel: "Hold to speak",
		tapClose: "Or just tap what feels close",
		tapToStart: "Tap the card to start reflecting",
		wordsStay: "The words stay, the audio doesn’t",
		/** A Plus take being written down after the mic lets go (production's strip). */
		writingDown: "Writing it down…",
	},
} as const;

export type NotQuiteReason = (typeof COPY.notQuite.reasons)[number]["id"];
export type PathId = (typeof COPY.next.paths)[number]["id"];
