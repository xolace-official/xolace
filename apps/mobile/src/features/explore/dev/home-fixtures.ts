/**
 * Explore home on the board's data (`ExploreAlive`: `CONTINUE`, `TIMES`, `BY`, `NEW`, `FIVE`,
 * `FEAT`), shaped as `browse.explore` and `browse.hub` serve them. For the hour serves only
 * tracks, so the board's Lantern rows there become tracks; Lantern stays on Continue and Five.
 */
import type { Id } from "@xolace/backend/dataModel";
import { art } from "@/features/explore/dev/covers";
import { type TrackId, trackOf } from "@/features/explore/dev/fixtures";
import type {
	ContinueCard,
	ForYou,
	HomeEntry,
	HomeTrack,
	ShelfTrack,
	ShortItem,
} from "@/features/explore/home/home-model";
import type { DayPhase } from "@/lib/day-phase";

const homeTrack = (id: TrackId): HomeTrack => ({ ...trackOf(id), plus: true });

const shelfTrack = (id: TrackId): ShelfTrack => {
	const t = trackOf(id);
	return {
		_id: t._id,
		attribution: t.attribution,
		family: t.family,
		slug: t.slug,
		thumbhash: t.thumbhash,
		thumbUrl: t.thumbUrl,
		title: t.title,
	};
};

const entry = (
	id: string,
	title: string,
	kind: HomeEntry["kind"],
	readMin: number,
	a: string,
	b: string
): HomeEntry => ({
	_id: `dev-${id}` as Id<"library_entries">,
	coverThumbUrl: art(a, b),
	dek: "",
	kind,
	plus: false,
	primarySubject: "sleep",
	readMin,
	slug: `dev-${id}`,
	title,
});

export const ENTRIES = {
	breakk: entry(
		"breakk",
		"Taking a real break",
		"advice",
		3,
		"#E0F4EC",
		"#8CCBB0"
	),
	loud: entry(
		"loud",
		"Why your mind gets loud at night",
		"explainer",
		6,
		"#F6D3B8",
		"#E79A7E"
	),
	panic: entry(
		"panic",
		"What a panic attack is doing",
		"explainer",
		4,
		"#FCE1C8",
		"#E8A87C"
	),
	twoam: entry(
		"twoam",
		"Small things to try when sleep won’t come",
		"advice",
		4,
		"#DDE6F6",
		"#9DB2E0"
	),
	yes: entry(
		"yes",
		"When yes keeps costing you",
		"advice",
		4,
		"#FDE9C6",
		"#E3A857"
	),
} as const;

const letting = homeTrack("letting");
const thoughts = homeTrack("thoughts");
const SECONDS = 60;
const LEFT_MIN = 4;

/** Three cards: a track 5 min into 9, an episode a minute in, and an entry 40% read. */
export const CONT: readonly ContinueCard[] = [
	{
		id: letting._id,
		kind: "track",
		minutesLeft: LEFT_MIN,
		plus: true,
		positionSec: letting.durationSec - LEFT_MIN * SECONDS,
		track: letting,
		updatedAt: 3,
	},
	{
		entry: ENTRIES.loud,
		id: ENTRIES.loud._id,
		kind: "entry",
		percentRead: 40,
		plus: false,
		updatedAt: 2,
	},
	{
		id: thoughts._id,
		kind: "track",
		minutesLeft: 10,
		plus: true,
		positionSec: SECONDS,
		track: thoughts,
		updatedAt: 1,
	},
];

/** Today's four phases, three each (`TIMES`). */
export const HOUR: Record<DayPhase, HomeTrack[]> = {
	dawn: ["softer", "first", "land"].map((id) => homeTrack(id as TrackId)),
	day: ["land", "clear", "naming"].map((id) => homeTrack(id as TrackId)),
	evening: ["home", "warm", "kinder"].map((id) => homeTrack(id as TrackId)),
	late: ["notonly", "quiet", "letting"].map((id) => homeTrack(id as TrackId)),
};

export const FOR_YOU: ForYou = {
	axis: "lifeArea",
	slug: "work",
	tracks: ["leave", "weight", "tide"].map((id) => homeTrack(id as TrackId)),
	word: "work",
};

export const FRESH: ShelfTrack[] = ["first", "tide", "naming", "toomuch"].map(
	(id) => shelfTrack(id as TrackId)
);

export const FEATURED: ShelfTrack = shelfTrack("setting");

/** Two pages (`FIVE`): support audio and reading in turn. */
export const SHORT: ShortItem[] = [
	{ kind: "track", plus: true, track: homeTrack("land") },
	{ entry: ENTRIES.twoam, kind: "entry", plus: false },
	{ kind: "track", plus: true, track: homeTrack("toomuch") },
	{ entry: ENTRIES.panic, kind: "entry", plus: false },
	{ kind: "track", plus: true, track: homeTrack("notonly") },
	{ entry: ENTRIES.breakk, kind: "entry", plus: false },
];
