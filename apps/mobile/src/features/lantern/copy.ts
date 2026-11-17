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
		label: (title: string, min: number, locked: boolean) =>
			`${title}, support audio, ${min} ${min === 1 ? "minute" : "minutes"}${locked ? ", Xolace+" : ""}`,
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
