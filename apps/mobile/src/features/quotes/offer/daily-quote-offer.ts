/** The one-time daily quote offer (B19): when it may show, and what an answer writes. Pure. */
import type { Doc } from "@xolace/backend/dataModel";

export type DailyQuoteSlot = NonNullable<
	Doc<"preferences">["notifications"]["dailyQuote"]
>["slot"];
export const OFFER_SLOTS: readonly DailyQuoteSlot[] = [
	"morning",
	"afternoon",
	"evening",
];
/** "Yes" without choosing: the offer asks about mornings. */
export const OFFER_SLOT: DailyQuoteSlot = "morning";

/**
 * The offer may show once preferences have loaded, while the daily quote was never chosen on any
 * device (absent on the server), and if this device hasn't shown it already. `chosen` is
 * undefined while preferences load.
 */
export const mayOfferDailyQuote = (o: {
	chosen: boolean | undefined;
	seen: boolean;
}) => o.chosen === false && !o.seen;

/**
 * What an answer writes: a time turns it on; Not now (null) records it off, so no device asks
 * again. Either way the server holds the choice.
 */
export const offerAnswer = (slot: DailyQuoteSlot | null) => ({
	enabled: slot !== null,
	slot: slot ?? OFFER_SLOT,
});
