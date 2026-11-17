/**
 * Every string Lantern's home, lists and welcome show (`P/src/fixtures/lantern.ts`, the board's
 * copy). Reader-facing prose says "Lantern", never "library", "articles" or "content".
 */
export const COPY = {
	home: {
		allSubjects: "All subjects",
		az: "A–Z",
		continue: "Continue reading",
		continueKicker: (pct: number) => `Continue · ${pct}% read`,
		continueLabel: (title: string, pct: number) =>
			`${title}. ${pct} percent read`,
		forYou: "For you",
		hubs: "Hubs",
		kinds: "What kind of light",
		lettersLabel: (letter: string) => `Subjects starting with ${letter}`,
		readingAsMenu: "Reading as",
		saved: "Saved",
	},
	kinds: {
		advice: { label: "Advice", line: "Small things to try" },
		explainer: { label: "Explainers", line: "What’s going on, in plain words" },
		story: { label: "Stories", line: "People who’ve felt it too" },
	},
	listen: {
		kicker: (min: number) => `Listen · ${min} min`,
		label: (title: string, kind: string, min: number, locked: boolean) =>
			`${title}, ${kind.toLowerCase()}, ${min} ${min === 1 ? "minute" : "minutes"}${locked ? ", Xolace+" : ""}`,
		locked: "Xolace+, locked",
		pause: (title: string) => `Pause ${title}`,
		play: (title: string) => `Play ${title}`,
		playing: "Playing",
	},
	lists: {
		empty: "Nothing here yet.",
		hubGone: "This hub has been put away.",
		saved: "Saved",
		savedEmpty:
			"Nothing saved yet. Tap the bookmark on anything you want to come back to.",
		subjects: "Subjects",
	},
	reader: {
		aa: {
			fire: "Read by the fire",
			fireLine: "Dims the page, like reading by firelight",
			larger: "Larger text",
			mode: "Reading mode",
			size: "Text size",
			smaller: "Smaller text",
		},
		backToTop: "Back to top",
		bar: {
			appearance: "Reading appearance",
			back: "Back",
			save: "Save",
			share: "Share",
		},
		contentNote: "Content note",
		contentNoteLabel: (note: string) => `Content note: ${note}`,
		dock: {
			back15: "Back 15 seconds",
			close: "Close player",
			keepListening: "Keep listening",
			keepListeningLabel: "Keep listening with Xolace+",
			label: "Audio player",
			pause: (title: string) => `Pause ${title}`,
			play: (title: string) => `Play ${title}`,
			previewEnded: "Free preview · 0:30",
			previewEndedAnnouncement:
				"Preview ended. Xolace+ unlocks the full listen",
			transcript: "Transcript",
			unavailable: "Audio unavailable",
			value: (elapsed: string, left: string) =>
				`${elapsed} elapsed, ${left} remaining`,
		},
		finished: "Finished",
		gone: "This entry isn’t in Lantern anymore.",
		helped: "This helped",
		helpedCount: (n: number) => `${n} people found this helpful`,
		helpedHint: "Tap again to undo",
		helpline: "Need to talk to someone? Find support near you",
		listen: (min: number) => `Listen · ${min}m`,
		listenLabel: (min: number) =>
			`Listen, ${min} ${min === 1 ? "minute" : "minutes"}`,
		loading: "Loading",
		markedRead: "Marked as read",
		minutesLeft: (min: number) => `${min} min left`,
		notAlone: "You’re not the only one.",
		pause: "Pause",
		pickUp: (pct: number) => `Pick up at ${pct}%`,
		pickUpLabel: (pct: number) => `Pick up where you left off, ${pct} percent`,
		play: "Play",
		playing: "Playing",
		reflect: "Reflect on this",
		resume: "Resume where you left off",
		savedToast: "Saved. It’s under the bookmark on Lantern",
		sources: {
			further: "For further reading",
			opens: "Opens the original page",
			title: "Sources adapted from",
			view: "View sources",
			viewHint: (n: number) =>
				`Lists the ${n} ${n === 1 ? "source" : "sources"} this was adapted from`,
		},
		transcript: {
			none: "No transcript for this one yet.",
			title: "Transcript",
		},
		unsavedToast: "Removed from saved",
		upNext: (kind: string) => `Up next · ${kind}`,
	},
	readingAs: {
		done: "Done",
		leansOn: (names: readonly string[]) =>
			`For you now leans on ${names.join(" and ")}`,
		line: "Pick any that fit. It only shapes what’s picked for you.",
		skip: "Skip",
		title: "Reading as…",
	},
	row: {
		partwayMark: (pct: number) => `. ${pct} percent read`,
		read: "Read",
		readMark: ". Read",
		save: "Save",
		share: "Share",
		unsave: "Remove from saved",
	},
	shareMessage: (title: string, url: string) =>
		`I just read “${title}” on Xolace and thought you might like it too. Worth a few minutes:\n${url}`,
	title: "Lantern",
	welcome: {
		hold: "Hold to begin",
		line: "Explainers, advice and stories, built for support. New reads arrive as Lantern grows.",
		title: "Welcome to the Lantern",
	},
} as const;
