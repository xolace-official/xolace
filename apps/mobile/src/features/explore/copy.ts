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
