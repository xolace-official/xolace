/**
 * The doors' screens on the board's data (`ExploreDoors`: `TOPICS`, `TR`, `SLEEP`, `SPOOL`,
 * `MPOOL`, `LIST`), shaped as `getTopics`, `getTopicHeader`, `getTopic` and `listByFamily` serve
 * them. Music runs 4 to 5 minutes, as the prototype's player had it.
 */
import type { Id } from "@xolace/backend/dataModel";
import type {
	ExploreTrack,
	TopicHeader,
	TopicTile,
} from "@/features/explore/explore-model";
import { art } from "./covers";

/** title, kind, topic, minutes (0: music), art, then the series and episode. */
type Row = readonly [
	string,
	"s" | "m",
	string,
	number,
	string,
	string,
	string?,
	number?,
];

const WIND = "Wind down";
const TR = {
	allowed: ["Lying awake is allowed", "s", "sleep", 5, "#FFE3B0", "#F7A78A"],
	body: ["Back into your body", "s", "anger", 9, "#DDE6F6", "#9DB2E0"],
	clear: ["Clear water", "m", "anxiety", 0, "#CDEFF7", "#7DB9E8"],
	cool: ["Letting the heat pass", "s", "anger", 4, "#FFC9B0", "#D9654E"],
	covers: ["Under the covers", "m", "sleep", 0, "#F6D3B8", "#E79A7E"],
	dark: ["Company in the dark", "s", "sleep", 9, "#3B3355", "#A08CC9"],
	deep: ["Deep blue hours", "m", "sleep", 0, "#16234A", "#4C6FB8"],
	drift: ["Long drift", "m", "calm", 0, "#C9D6F2", "#6F84C4"],
	fields: ["Open fields", "m", "overthinking", 0, "#DDEFC9", "#8FBF6B"],
	first: ["First light", "m", "stress", 0, "#FFE3B0", "#F7A78A"],
	fixit: [
		"You don’t have to fix it all",
		"s",
		"self-worth",
		5,
		"#FDE9C6",
		"#E3A857",
	],
	garden: ["Night garden", "m", "sleep", 0, "#2F4A3A", "#7FBF9A"],
	grey: ["Grey afternoon", "m", "sadness", 0, "#D3D6DE", "#8A90A6"],
	hard: ["It’s allowed to be hard", "s", "grief", 5, "#F2DCCB", "#C98F7A"],
	home: ["Coming home to yourself", "s", "loneliness", 7, "#D9ECF7", "#7D9FCB"],
	housequiet: [
		"The house goes quiet",
		"s",
		"sleep",
		10,
		"#2B2F5C",
		"#7C8FD9",
		WIND,
		4,
	],
	hush: ["Hush of a fan", "m", "sleep", 0, "#E0E0EC", "#A6A3C2"],
	kinder: [
		"Kinder words for yourself",
		"s",
		"self-worth",
		6,
		"#FFD2B8",
		"#D9876E",
	],
	land: ["Two minutes to land", "s", "anxiety", 2, "#D7F0E6", "#6FBF9F"],
	leave: ["Leaving work at work", "s", "work", 7, "#E3DBFF", "#8E7BE0"],
	letting: [
		"Letting the day go",
		"s",
		"sleep",
		9,
		"#FFC9A8",
		"#F48FB1",
		WIND,
		2,
	],
	mind: ["When your mind won’t stop", "s", "sleep", 6, "#E3DBFF", "#8E7BE0"],
	moon: ["Moonwater", "m", "sleep", 0, "#1E3550", "#6FA8D6"],
	naming: ["Naming what you feel", "s", "sadness", 6, "#E8E0FF", "#B49BFF"],
	notonly: [
		"You’re not the only one awake",
		"s",
		"sleep",
		5,
		"#2C2550",
		"#7D6BC9",
	],
	quiet: ["Low sound for the quiet", "m", "sleep", 0, "#BFE8F2", "#9E8CF2"],
	scan: ["A body scan for bed", "s", "sleep", 10, "#D8EEF2", "#88C1CC"],
	setting: [
		"Setting the day down",
		"s",
		"sleep",
		8,
		"#2E2650",
		"#6B5BB8",
		WIND,
		1,
	],
	shoulders: [
		"Loosening your shoulders",
		"s",
		"stress",
		3,
		"#E0F4EC",
		"#8CCBB0",
	],
	sleepcomes: [
		"Sleep when it comes",
		"s",
		"sleep",
		12,
		"#1F1C3A",
		"#5D4E9E",
		WIND,
		5,
	],
	slower: ["Breathing slower", "s", "sleep", 4, "#DCEFF5", "#79B4C9"],
	softer: ["A softer morning", "s", "stress", 6, "#FFE9C9", "#F2B880"],
	steady: ["Something steady to hold", "s", "grief", 8, "#D8E3F0", "#7F97B8"],
	stillmorning: ["Still morning", "m", "focus", 0, "#F2E6C9", "#C7A86B"],
	thoughts: [
		"When the thoughts come back",
		"s",
		"sleep",
		11,
		"#3A3266",
		"#9E8CF2",
		WIND,
		3,
	],
	three: ["If you wake at 3am", "s", "sleep", 7, "#2E3A66", "#8EA2E0"],
	thunder: ["Far-off thunder", "m", "sleep", 0, "#3A3F5C", "#9AA3C7"],
	tide: ["Slow tide", "m", "calm", 0, "#A8E0D8", "#3E8C9A"],
	tinroof: ["Rain on a tin roof", "m", "sleep", 0, "#A9C2D2", "#4E6B85"],
	toomuch: ["When it’s too much", "s", "anxiety", 4, "#FFB7A0", "#E0607E"],
	warm: ["A warm room", "m", "loneliness", 0, "#FFD2B8", "#D9876E"],
	weight: ["The weight of a long day", "s", "stress", 8, "#F3C9D9", "#B56C93"],
} as const satisfies Record<string, Row>;
type TrackId = keyof typeof TR;

/** title, art: the board's `TOPICS`, alphabetical by slug. */
const TOPICS = {
	anger: ["Anger", 6, 0, "#7A3A34", "#E39A82"],
	anxiety: ["Anxiety", 14, 5, "#3E8C9A", "#A8E0D8"],
	calm: ["Calm", 0, 8, "#2F6F8F", "#BFE8F2"],
	emotions: ["Emotions", 5, 3, "#6B4EE6", "#D9CCFF"],
	focus: ["Focus", 0, 4, "#3B4A7A", "#9DB2E0"],
	grief: ["Grief", 6, 2, "#4E6B85", "#A9C2D2"],
	loneliness: ["Loneliness", 7, 3, "#7D6BC9", "#C9BAFF"],
	overthinking: ["Overthinking", 0, 5, "#5B3E7A", "#D6A8E8"],
	relationships: ["Relationships", 8, 0, "#8F5E2E", "#F2C46B"],
	sadness: ["Sadness", 4, 6, "#34507A", "#8EB4E6"],
	"self-worth": ["Self-worth", 9, 0, "#D9876E", "#FFD2B8"],
	sleep: ["Sleep", 12, 8, "#2E2650", "#6B5BB8"],
	stress: ["Stress", 11, 6, "#B56C93", "#F3C9D9"],
	work: ["Work", 10, 4, "#1E7A61", "#8CCBB0"],
} as const satisfies Record<
	string,
	readonly [string, number, number, string, string]
>;
export type Slug = keyof typeof TOPICS;

const SECONDS = 60;
const MUSIC_MIN_S = 240;
const MUSIC_SPREAD_S = 61;
const MUSIC_STEP_S = 13;

function track(id: TrackId, i: number): ExploreTrack {
	const [title, f, topic, min, a, b, series, ep]: Row = TR[id];
	const music = f === "m";
	return {
		_id: `dev-${id}` as Id<"audio_tracks">,
		attribution: undefined,
		durationSec: music
			? MUSIC_MIN_S + ((i * MUSIC_STEP_S) % MUSIC_SPREAD_S)
			: min * SECONDS,
		episodeNumber: ep,
		family: music ? "music" : "support",
		series: series ? "wind-down" : undefined,
		seriesTitle: series,
		slug: `dev-${id}`,
		thumbhash: undefined,
		thumbUrl: art(a, b),
		title,
		topicTitle: TOPICS[topic as Slug][0],
	};
}
const tracks = (ids: readonly TrackId[]) => ids.map(track);

const SLEEP = {
	eps: ["setting", "letting", "thoughts", "housequiet", "sleepcomes"],
	mu: [
		"quiet",
		"tinroof",
		"garden",
		"thunder",
		"covers",
		"moon",
		"hush",
		"deep",
	],
	sp: ["notonly", "scan", "mind", "three", "allowed", "slower", "dark"],
} as const;
const SPOOL = [
	"land",
	"toomuch",
	"naming",
	"home",
	"softer",
	"weight",
	"leave",
	"kinder",
	"fixit",
	"shoulders",
	"steady",
	"hard",
	"body",
	"cool",
] as const;
const MPOOL = [
	"clear",
	"warm",
	"first",
	"tide",
	"drift",
	"stillmorning",
	"grey",
	"fields",
] as const;

/** The two lists, in production's order (the order the rows were added). */
export const LIST = {
	music: tracks([...SLEEP.mu, ...MPOOL]),
	support: tracks([...SLEEP.eps, ...SLEEP.sp, ...SPOOL]),
};

/** Every topic's tile. */
export const TILES: readonly TopicTile[] = Object.entries(TOPICS).map(
	([slug, [title, supportCount, musicCount, a, b]]) => ({
		musicCount,
		slug,
		supportCount,
		thumbhash: undefined,
		thumbUrl: art(a, b),
		title,
	})
);

/** Sleep has its own; any other topic takes its own tracks first, then fills from the pools. */
export function topicTracks(slug: Slug): ExploreTrack[] {
	if (slug === "sleep") {
		return tracks([...SLEEP.eps, ...SLEEP.sp, ...SLEEP.mu]);
	}
	const [, spoken, music] = TOPICS[slug];
	const pick = (pool: readonly TrackId[], n: number) =>
		[
			...pool.filter((k) => TR[k][2] === slug),
			...pool.filter((k) => TR[k][2] !== slug),
		].slice(0, n);
	return tracks([...pick(SPOOL, spoken), ...pick(MPOOL, music)]);
}

/** The topic's cover, its counts the rows it lists. */
export function topicHeader(slug: Slug): TopicHeader {
	const rows = topicTracks(slug);
	const supportCount = rows.filter((t) => t.family === "support").length;
	const [title, , , a, b] = TOPICS[slug];
	return {
		musicCount: rows.length - supportCount,
		slug,
		supportCount,
		thumbhash: undefined,
		thumbUrl: art(a, b),
		title,
	};
}
