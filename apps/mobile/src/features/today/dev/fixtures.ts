import type { Id } from "@xolace/backend/dataModel";
import type { CampfireView } from "../campfire/campfire-model";
import type { KindlingView, TwigView } from "../kindling/kindling-model";
import { type MomentView, momentView } from "../moments/moments-model";
import { type RailTile, railTiles } from "../rail/rail-model";
import type { Today } from "../today-data";
import type { Covers } from "./covers";

/** Today's fake data: the board's Thursday, Ama and a 12-day streak (`P/src/fixtures/today.ts`). */
export const FIXTURE_WEEKDAY = "Thursday";
export const FIXTURE_DAY = "2026-11-19";
export const FIXTURE_NAME = "Ama";
export const FIXTURE_STREAK = 12;
/** The board's month prompt (`P/src/fixtures/return.ts` WELCOME_BACK.page.prompt). */
export const FIXTURE_MONTH_PROMPT =
	"What have you been carrying that nobody asks about?";

/** The board's four steps (`P/src/fixtures/kindling.ts`), the first tended. */
const BOARD_TWIGS: TwigView[] = [
	{ id: "t1", length: "A MINUTE", state: "done", title: "Name what's heavy" },
	{
		id: "t2",
		length: "A FEW MINUTES",
		state: "pending",
		title: "Sit with this",
	},
	{
		id: "t3",
		length: "2 MINUTES",
		state: "pending",
		title: "Write one line to tomorrow's you",
	},
	{
		id: "t4",
		length: "WHEN YOU'RE READY",
		state: "pending",
		title: "Tell someone one true thing",
	},
];

export const FIXTURE_KINDLING = {
	all: {
		id: "k1",
		twigs: BOARD_TWIGS.map((t) => ({ ...t, state: "done" as const })),
	},
	/** One of four tended (`01-evening`). */
	board: { id: "k1", twigs: BOARD_TWIGS },
	/** Three of four tended: the last one's tend closes the kindling (`getActive` goes null). */
	last: {
		id: "k1",
		twigs: BOARD_TWIGS.map((t, i) => (i < 3 ? { ...t, state: "done" } : t)),
	},
	/** Two of four tended: the board's second step has just been done (`06-kindling-tended`). */
	tended: {
		id: "k1",
		twigs: BOARD_TWIGS.map((t, i) => (i === 1 ? { ...t, state: "done" } : t)),
	},
	/** Production sends three steps as often as four. */
	three: {
		id: "k3",
		twigs: [
			BOARD_TWIGS[0],
			{ ...BOARD_TWIGS[1], state: "skipped" },
			BOARD_TWIGS[2],
		].filter((t): t is TwigView => t !== undefined),
	},
} satisfies Record<string, KindlingView>;

export const FIXTURE_CAMPFIRE = {
	count: { count: 38, emotion: "anxiety", kind: "count" },
	stats: { count: 1240, kind: "stats", lighterPercent: 62 },
	warming: { emotion: "self doubt", kind: "warming" },
} satisfies Record<string, CampfireView>;

type Shelf = Parameters<typeof railTiles>[0];
type TimelineRow = Parameters<typeof momentView>[0];

const shelfItem = (
	slug: string,
	title: string,
	family: "music" | "support",
	cover: string
): Shelf[number] => ({
	_id: slug as Id<"audio_tracks">,
	attribution: undefined,
	family,
	slug,
	thumbhash: undefined,
	thumbUrl: cover,
	title,
});

/** The board's rail (`P/src/fixtures/today.ts` RAIL), as the New shelf sends it. */
const fixtureRail = (covers: Covers): RailTile[] =>
	railTiles([
		shelfItem("voice", "A voice for this", "support", covers.a1),
		shelfItem("quiet", "Low sound for the quiet", "music", covers.a2),
		shelfItem("arrives", "When it all arrives", "support", covers.a3),
		shelfItem("rain", "Rain on the tent", "music", covers.a2),
	]);

const timelineRow = (
	id: string,
	mirrorText: string,
	granularLabel: string,
	hasMirrorAudio: boolean
): TimelineRow => ({
	_id: id as Id<"sessions">,
	confirmationState: null,
	createdAt: 0,
	entryType: "open_prompt",
	granularLabel,
	hasMirrorAudio,
	mirrorText,
	pathChosen: null,
	primaryEmotion: null,
	toneUsed: null,
});

/** The board's moments (`TODAY_MOMENTS`), as the timeline's first page sends them. */
const FIXTURE_MOMENTS: MomentView[] = [
	timelineRow(
		"m1",
		"You're not behind. You're tired of running at a pace that was never yours.",
		"overwhelm",
		true
	),
	timelineRow(
		"m2",
		"You can set it down for tonight. It will still be there to look at tomorrow.",
		"stress",
		false
	),
	timelineRow(
		"m3",
		"That it matters this much shows you what you care about.",
		"self-doubt",
		false
	),
	timelineRow(
		"m4",
		"Missing home doesn't mean you chose wrong. It means you had somewhere worth missing.",
		"homesickness",
		true
	),
].map(momentView);

/** The board's word for today. */
const FIXTURE_WORD = "Slow is still moving.";

/** The rail, moments and word: the board's, none at all, or still loading. */
export type FixtureModules = "board" | "none" | "loading";

/** The rail, moments and word: loading is undefined, none is empty (the word null). */
export function lowerModules(
	modules: FixtureModules,
	covers: Covers
): Pick<
	Today["state"],
	"rail" | "moments" | "word" | "playingSlug" | "listenLocked"
> {
	if (modules === "loading") {
		return {
			listenLocked: false,
			moments: undefined,
			playingSlug: null,
			rail: undefined,
			word: undefined,
		};
	}
	const board = modules === "board";
	return {
		listenLocked: false,
		moments: board ? FIXTURE_MOMENTS : [],
		playingSlug: null,
		rail: board ? fixtureRail(covers) : [],
		word: board ? FIXTURE_WORD : null,
	};
}
