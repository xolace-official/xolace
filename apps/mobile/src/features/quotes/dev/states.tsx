import type { DevState } from "@/dev/dev-state";
import { FixtureScreen } from "@/features/quotes/dev/fixture-screen";
import { fixtureState, QUOTES } from "@/features/quotes/dev/fixtures";
import type { QuoteUi } from "@/features/quotes/motion/quote-ui";
import { reasonLine } from "@/features/quotes/quotes-model";
import type { QuotesState } from "@/features/quotes/quotes-screen-data";

const OPTIONS = { headerShown: false };
const FREE = { isPlus: false };
const REPLY = "Slower today, and that's fine.";

const state = (
	title: string,
	key: string,
	patch: Partial<QuotesState> = {},
	initialUi?: Partial<QuoteUi>
): Omit<DevState, "id"> => ({
	options: OPTIONS,
	Screen: () => (
		<FixtureScreen state={{ ...fixtureState(key, patch), initialUi }} />
	),
	title,
});

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "today", ...state("Today, on Poster", "poster") },
	{ id: "still", ...state("Today, on First light (light ink)", "first-light") },
	{ id: "dark-ink", ...state("Today, on Ink wash (dark ink)", "ink-wash") },
	{
		id: "night",
		...state("Night, a short quote", "night", { quote: QUOTES.short }),
	},
	{
		id: "long",
		...state("A long quote", "deep-forest", { quote: QUOTES.long }),
	},
	{
		id: "free",
		...state("Free: a Plus choice falls back, reason gate", "mountain-air", {
			...FREE,
			reason: reasonLine({
				hasSessionToday: true,
				sessionLocked: true,
				type: "curated",
			}),
		}),
	},
	{
		id: "resonated-kept",
		...state("Resonated and kept", "poster", {
			keptCount: 15,
			resonated: true,
			saved: true,
		}),
	},
	{
		id: "background",
		...state("Background sheet, free account", "first-light", FREE, {
			view: "themes",
		}),
	},
	{ id: "write", ...state("Write back", "poster", {}, { view: "writing" }) },
	{
		id: "daily-quote-offer",
		...state(
			"The daily quote offer, after a first resonate",
			"first-light",
			{ offerDailyQuote: true, resonated: true },
			{ view: "offer" }
		),
	},
	{
		id: "sent",
		...state(
			"Reply kept safe",
			"night",
			{ reply: REPLY },
			{
				draft: REPLY,
				view: "sent",
			}
		),
	},
	{
		id: "flagged",
		...state(
			"Reply flagged: support",
			"night",
			{ replyFlagged: true },
			{
				draft: "I can't keep doing this.",
				view: "flagged",
			}
		),
	},
	{
		id: "gate",
		...state("Keep gate (free)", "poster", FREE, { view: "gate" }),
	},
	{
		id: "gate-background",
		...state("Plus background gate (free)", "poster", FREE, {
			view: "gateBackground",
		}),
	},
	{
		id: "share",
		...state("Share a still", "first-light", {}, { view: "share" }),
	},
	{ id: "kept", ...state("Words you kept", "poster", {}, { view: "kept" }) },
	{
		id: "kept-empty",
		...state(
			"Words you kept, empty",
			"poster",
			{
				kept: [],
				keptCount: 0,
			},
			{ view: "kept" }
		),
	},
	{ id: "clear", ...state("Clear view", "dunes", {}, { clear: true }) },
	{
		id: "loading",
		...state("Loading today's words", "poster", {
			quote: null,
			status: "loading",
		}),
	},
	{
		id: "error",
		...state("Today's words didn't arrive", "poster", {
			quote: null,
			status: "error",
		}),
	},
];
