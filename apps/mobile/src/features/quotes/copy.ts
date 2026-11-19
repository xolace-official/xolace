/** Every line Quotes shows (handoff `quotes.md` §1), as the "Quotes v2" board has it. */
export const QUOTE_COPY = {
	accessibility: {
		back: "Back",
		background: "Choose a background",
		clear: "Show just the words",
		close: "Close",
		closeKeepDraft: "Close, keep the draft",
		done: "Done",
		heart: (on: boolean) => (on ? "Resonates. Tap to undo" : "Resonate"),
		keptLink: (n: number) => `Words you kept, ${n}`,
		newer: "Newer",
		older: "Older",
		pause: (paused: boolean) =>
			paused ? "Play the background" : "Pause the background",
		plusSheet: "Keep quotes with Xolace+",
		plusTile: (name: string) => `${name}, Xolace+`,
		share: "Share as an image",
		sound: (on: boolean) => (on ? "Turn the sound off" : "Turn the sound on"),
		star: (saved: boolean, locked: boolean) => {
			if (saved) {
				return "Kept. Tap to remove";
			}
			return locked ? "Keep this quote, Xolace+" : "Keep this quote";
		},
	},
	clearHint: "Tap anywhere to bring everything back",
	/**
	 * The one-time daily quote offer (B19), the first time someone resonates with or keeps a
	 * quote. Never shown again, whatever they answer.
	 */
	dailyQuote: {
		blocked:
			"Notifications are off for Xolace. You can allow them in Settings.",
		body: "One a day, at a time that suits you. You can change it or turn it off in Settings.",
		chooseTime: "Choose time",
		label: "A daily quote",
		send: "That time",
		slots: { afternoon: "Afternoon", evening: "Evening", morning: "Morning" },
		title: "Want a quote like this each morning?",
		turnedOn: (slot: string) =>
			`Today’s quote will come each ${slot.toLowerCase()}`,
		yes: "Yes",
	},
	edit: "Edit",
	error: "Today’s words didn’t arrive.",
	errors: {
		cantSave: "Xolace can’t save to Photos. You can allow it in Settings.",
		cardNotReady: "The card isn’t ready yet.",
		generic: "Something went wrong. Try again.",
		loopMissing: "The loop didn’t download. Try again.",
		noShare: "Sharing isn’t available here.",
		reply: "Your reply didn’t send. Try again.",
	},
	gate: "Keeping quotes is part of Xolace+. Resonate stays free, and it still shapes tomorrow’s words.",
	/** The tiers come from the catalogue, so this never names which backgrounds are free. */
	gateBackground:
		"This background comes with Xolace+. The free ones stay yours, and today’s words read the same on any of them.",
	keepIt: "Keep it",
	keptEither: "Your reply is kept either way.",
	keptLink: (n: number) => `Words you kept · ${n}`,
	keptWith: (name: string) => `Kept with ${name}`,
	listened: "Tomorrow’s words will take this into account.",
	loading: "Loading today’s words",
	loop: "Loop",
	loopNote: "Loops rest in Low Power Mode and with Reduce Motion.",
	lowPowerNote: "Low Power Mode is on, so loops show their still.",
	making: "Making…",
	noneKept: "Nothing kept yet. The star keeps today’s words here.",
	notNow: "Not now",
	placeholder: "A thought, a feeling, a little of both…",
	position: (i: number, total: number) => `${i} of ${total}`,
	private: "Only you can see this",
	prompt: "What does this bring up for you?",
	reason: {
		curated: "Chosen for you today.",
		/** A free account who would have had one of their own. */
		locked: "This one’s for everyone. Yours is waiting →",
		/** Curated, and no reflection today yet. */
		reflectToday: "Reflect today and tomorrow’s is yours.",
		/** A session-made quote. */
		session: "Based on what you’ve been sharing.",
	},
	reflect: "Reflect on this",
	retry: "Try again",
	saveImage: "Save image",
	saveVideo: "Save video",
	seePlus: "See Xolace+",
	shareGo: "Share…",
	shareStillNote: "Your reply is never in the image.",
	shareVideoNote:
		"The loop with the words on it, made on your phone. Your reply is never included.",
	sheets: {
		background: "Background",
		flagged: "Your reply",
		gate: "Keep the words that land",
		gateBackground: "A Xolace+ background",
		sent: "Kept safe",
		share: "Share",
		write: "Write back",
	},
	square: "Square · 1:1",
	still: "Still",
	story: "Story · 9:16",
	support:
		"That sounds heavy to carry on your own. Support is here if you want it.",
	talk: "Talk to someone",
	toasts: {
		kept: "Kept in Words you kept",
		removed: "Removed from Words you kept",
		resonate: "Tomorrow’s words will lean this way",
		savedImage: "Saved to Photos",
		savedVideo: "Video saved to Photos",
	},
	video: "Video",
	wordmark: "XOLACE",
	wordsKept: "Words you kept",
	writeBack: "Write back",
	wroteBack: "YOU WROTE BACK",
	yourReply: "Your reply",
} as const;
