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
 * device (absent on the server: never on, never answered), if this device hasn't shown it
 * already, and if the phone hasn't denied notifications. `chosen` and `blocked` are undefined
 * while they load.
 */
export const mayOfferDailyQuote = (o: {
	chosen: boolean | undefined;
	seen: boolean;
	blocked: boolean | undefined;
}) => o.chosen === false && !o.seen && o.blocked === false;

/** What raises it: the first resonate, keep or share, whichever comes first. */
export type OfferTrigger = "resonate" | "keep" | "share";

/**
 * How long after its trigger the card rises: past the heart's burst and its toast, or a beat
 * after the share sheet has closed so it doesn't chase the share.
 */
const OFFER_AFTER_MS: Record<OfferTrigger, number> = {
	keep: 900,
	resonate: 900,
	share: 700,
};

/** When this trigger raises the card, in ms; null when it may not show. */
export const offerRisesAfter = (trigger: OfferTrigger, offerable: boolean) =>
	offerable ? OFFER_AFTER_MS[trigger] : null;

/**
 * What an answer writes: a time turns it on; Not now (null) records it off, so no device asks
 * again. Either way the server holds the choice.
 */
export const offerAnswer = (slot: DailyQuoteSlot | null) => ({
	enabled: slot !== null,
	slot: slot ?? OFFER_SLOT,
});
