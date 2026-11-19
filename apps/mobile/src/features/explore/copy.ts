/** Every string Explore's doors draw (handoff `explore-doors.md` §8), verbatim from the board. */
export const COPY = {
	chips: [
		{ id: "all", label: "All" },
		{ id: "support", label: "Support audio" },
		{ id: "music", label: "Music" },
	],
	/** Production's empty list. */
	empty: "Nothing here yet.",
	episode: (n: number, title: string, min: number) =>
		`Episode ${n}, ${title}, ${min} ${min === 1 ? "minute" : "minutes"}`,
	episodeMeta: (series: string, n: number, min: number) =>
		`${series} · Episode ${n} · ${min} min`,
	family: { music: "Music", support: "Support audio" },
	/** Added to a topic row's VoiceOver label. */
	kind: { music: "music", support: "spoken" },
	loading: "Loading",
	locked: "Xolace+, locked",
	/** The Family menu in a list's bar. */
	menu: "Family",
	minutes: (min: number) => `${min} min`,
	music: (n: number) => `${n} music`,
	series: (name: string) => `${name} · A series`,
	/** The chips row's VoiceOver group. */
	show: "Show",
	spoken: (n: number) => `${n} spoken`,
	/** `getTopicHeader` is null: an unknown slug, or every track retired. */
	topicGone: "This topic isn’t here anymore.",
	topics: "Topics",
} as const;

export type TopicFilter = (typeof COPY.chips)[number]["id"];
export type Family = keyof typeof COPY.family;

/** Explore home (handoff `explore.md`, board `ExploreAlive`), verbatim. */
export const HOME = {
	another: "Another",
	/** Android's menu fallback. */
	cancel: "Cancel",
	cont: "Pick up where you left off",
	/** The ring on a Continue card: what a tap does. */
	contAction: (verb: "Pause" | "Resume" | "Play", title: string) =>
		`${verb}, ${title}`,
	doors: [
		{
			android: "graphic_eq",
			id: "support",
			ios: "waveform",
			label: "Support audio",
		},
		{ android: "music_note", id: "music", ios: "music.note", label: "Music" },
		{ android: "menu_book", id: "lantern", ios: "book", label: "Lantern" },
		{
			android: "grid_view",
			id: "topics",
			ios: "square.grid.2x2",
			label: "Topics",
		},
	],
	feat: "Featured this week",
	featWhy: "Chosen by the people who make Xolace",
	five: "Five minutes or less",
	hearAction: "Hear a preview",
	hearing: "Hearing a preview",
	hour: {
		dawn: "For this morning",
		day: "For the day",
		evening: "For this evening",
		late: "For the small hours",
	},
	lantern: "Lantern",
	left: (min: number) => `${min} min left`,
	named: (word: string) => `Because you named “${word}”`,
	namedWhy: "From your last two sessions. Only you see this.",
	new: "New",
	noSessions: "Don’t use my sessions here",
	noSessionsDone: "Your sessions won’t be used here",
	pause: "Pause",
	paused: (left: string) => `Paused · ${left}`,
	pickGo: "Choose for me",
	pickQ: "Not sure what you need?",
	play: "Play",
	playing: (left: string) => `Playing · ${left}`,
	plus: "Xolace+",
	read: "Read",
	readMin: (min: number) => `${min} min read`,
	readShare: (pct: number) => `${pct}% read`,
	remove: "Remove from here",
	resume: "Resume",
} as const;

export type DoorId = (typeof HOME.doors)[number]["id"];
