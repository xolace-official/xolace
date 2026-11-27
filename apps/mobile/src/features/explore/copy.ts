export const COPY = {
	chips: [
		{ id: "all", label: "All" },
		{ id: "support", label: "Support audio" },
		{ id: "music", label: "Music" },
	],
	empty: "Nothing here yet.",
	episode: (n: number, title: string, min: number) =>
		`Episode ${n}, ${title}, ${min} ${min === 1 ? "minute" : "minutes"}`,
	episodeMeta: (series: string, n: number, min: number) =>
		`${series} · Episode ${n} · ${min} min`,
	family: { music: "Music", support: "Support audio" },
	kind: { music: "music", support: "spoken" },
	loading: "Loading",
	locked: "Xolace+, locked",
	menu: "Family",
	minutes: (min: number) => `${min} min`,
	music: (n: number) => `${n} music`,
	series: (name: string) => `${name} · A series`,
	show: "Show",
	spoken: (n: number) => `${n} spoken`,
	topicGone: "This topic isn’t here anymore.",
	topics: "Topics",
} as const;

export type TopicFilter = (typeof COPY.chips)[number]["id"];
export type Family = keyof typeof COPY.family;

export const HOME = {
	another: "Another",
	cancel: "Cancel",
	cont: "Pick up where you left off",
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

const THOUSAND = 1000;
const compact = (n: number) =>
	n < THOUSAND ? `${n}` : `${(n / THOUSAND).toFixed(1).replace(/\.0$/, "")}k`;

export const SEARCH = {
	episode: (n: number) => `Episode ${n}`,
	listenMin: (min: number) => `${min} min listen`,
	loading: "Loading",
	needSomeone: {
		body: "People you can reach, any time.",
		label: "Need someone now? See people you can reach",
		title: "Need someone now?",
	},
	noResults: (query: string) => `Nothing matches “${query}”`,
	place: { hub: "Lantern hub", topic: "Topic" },
	placeholder: "Search audio, music and Lantern",
	readMin: (min: number) => `${min} min read`,
	save: "Save",
	section: {
		lantern: "Lantern",
		music: "Music",
		places: "Hubs & topics",
		support: "Support audio",
	},
	sectionEmpty: {
		body: "Try a feeling, like “can’t sleep”.",
		title: "Nothing matches that",
	},
	seeAll: "See all",
	share: "Share",
	shareMessage: (title: string, url: string) =>
		`I just read “${title}” on Xolace and thought you might like it too. Worth a few minutes:\n${url}`,
	unsave: "Remove from saved",
	views: (n: number) => `${compact(n)} ${n === 1 ? "view" : "views"}`,
	wayOuts: [
		{ href: "/explore/topics", label: "Browse topics" },
		{ href: "/explore/library/subjects", label: "Lantern subjects" },
	],
} as const;

export type SearchSection = keyof typeof SEARCH.section;
