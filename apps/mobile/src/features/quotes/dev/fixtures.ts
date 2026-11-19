/** Quotes on fixtures: what the dev states draw and the model tests read. */
import { STILLS } from "@/features/quotes/background/stills";
import {
	type CatalogueRow,
	type KeptCard,
	reasonLine,
	resolveBackgrounds,
	shownBackground,
} from "@/features/quotes/quotes-model";
import type { QuotesState } from "@/features/quotes/quotes-screen-data";

/** The catalogue's stills as B18 seeds them. Loops are hosted, so fixtures leave them out. */
const CATALOGUE: readonly CatalogueRow[] = [
	{ ink: "dark", key: "poster", kind: "still", name: "Poster", plus: false },
	{
		ink: "light",
		key: "first-light",
		kind: "still",
		name: "First light",
		plus: false,
	},
	{ ink: "light", key: "night", kind: "still", name: "Night", plus: false },
	{
		ink: "light",
		key: "mountain-air",
		kind: "still",
		name: "Mountain air",
		plus: true,
	},
	{
		ink: "light",
		key: "deep-forest",
		kind: "still",
		name: "Deep forest",
		plus: true,
	},
	{
		ink: "light",
		key: "still-water",
		kind: "still",
		name: "Still water",
		plus: true,
	},
	{ ink: "light", key: "dunes", kind: "still", name: "Dunes", plus: true },
	{
		ink: "light",
		key: "moonrise",
		kind: "still",
		name: "Moonrise",
		plus: true,
	},
	{ ink: "dark", key: "ink-wash", kind: "still", name: "Ink wash", plus: true },
];
const BACKGROUNDS = resolveBackgrounds(CATALOGUE, STILLS);

export const QUOTES = {
	long: {
		text: "You do not have to make sense of everything today. There is room to pause, to leave a question unanswered, to take the smaller step. The care you offer yourself in these ordinary moments matters, even when nobody else can see it.",
		title: "The smaller step",
	},
	medium: {
		text: "You don’t have to bloom every day. Some days, growing quietly is enough.",
		title: "At your own pace",
	},
	short: { text: "You can begin again.", title: "Begin again" },
} as const;

const KEPT: readonly KeptCard[] = [
	{
		background: "mountain-air",
		day: "Sunday 8 Nov",
		flagged: false,
		id: "k1",
		text: "You do not have to become someone else to begin again.",
	},
	{
		background: "night",
		day: "Friday 6 Nov",
		flagged: false,
		id: "k2",
		reply: "Needed this after the week I had.",
		text: "Rest is not a reward. It is part of the work.",
	},
	{
		day: "Tuesday 3 Nov",
		flagged: false,
		id: "k3",
		text: "Small steps still count.",
	},
	{
		background: "deep-forest",
		day: "Saturday 31 Oct",
		flagged: false,
		id: "k4",
		reply: "I needed this on a day I felt behind everyone.",
		text: "The path doesn’t ask how fast you walked it. Only that you kept your feet on it.",
	},
];

/** A Xolace+ account on today's session quote, over `key`. */
export function fixtureState(
	key = "poster",
	patch: Partial<QuotesState> = {}
): QuotesState {
	const isPlus = patch.isPlus ?? true;
	return {
		active: true,
		background: shownBackground(key, BACKGROUNDS, isPlus),
		backgrounds: BACKGROUNDS,
		isPlus,
		kept: KEPT,
		keptCount: 14,
		lowPower: false,
		offerDailyQuote: false,
		quote: QUOTES.medium,
		reason: reasonLine({
			hasSessionToday: true,
			sessionLocked: false,
			type: "session",
		}),
		replyFlagged: false,
		replyReaches: true,
		resonated: false,
		saved: false,
		saveLocked: !isPlus,
		sending: false,
		soundOn: false,
		status: "ready",
		...patch,
	};
}
