/** Today's fake data: the board's Thursday, Ama and a 12-day streak (`P/src/fixtures/today.ts`). */
export const FIXTURE_WEEKDAY = "Thursday";
export const FIXTURE_DAY = "2026-11-19";
export const FIXTURE_NAME = "Ama";
export const FIXTURE_STREAK = 12;
/** The board's month prompt (`P/src/fixtures/return.ts` WELCOME_BACK.page.prompt). */
export const FIXTURE_MONTH_PROMPT =
	"What have you been carrying that nobody asks about?";

import type { CampfireView } from "../campfire/campfire-model";
import type { KindlingView, TwigView } from "../kindling/kindling-model";

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
