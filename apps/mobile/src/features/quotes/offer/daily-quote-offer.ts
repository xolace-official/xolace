import type { Doc } from "@xolace/backend/dataModel";

export type DailyQuoteSlot = NonNullable<
	Doc<"preferences">["notifications"]["dailyQuote"]
>["slot"];
export const OFFER_SLOTS: readonly DailyQuoteSlot[] = [
	"morning",
	"afternoon",
	"evening",
];
export const OFFER_SLOT: DailyQuoteSlot = "morning";

export const mayOfferDailyQuote = (o: {
	chosen: boolean | undefined;
	seen: boolean;
	blocked: boolean | undefined;
}) => o.chosen === false && !o.seen && o.blocked === false;

export type OfferTrigger = "resonate" | "keep" | "share";

const OFFER_AFTER_MS: Record<OfferTrigger, number> = {
	keep: 900,
	resonate: 900,
	share: 700,
};

export const offerRisesAfter = (trigger: OfferTrigger, offerable: boolean) =>
	offerable ? OFFER_AFTER_MS[trigger] : null;

export const offerAnswer = (slot: DailyQuoteSlot | null) => ({
	enabled: slot !== null,
	slot: slot ?? OFFER_SLOT,
});
