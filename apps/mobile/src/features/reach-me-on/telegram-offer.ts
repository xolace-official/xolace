import type { ChannelEntry } from "@/features/reach-me-on/reach-view";

type OfferAnswer = "lighter" | "still_here";

export type OfferContext = {
	answer: OfferAnswer | "heavier" | "processed" | "vent" | null;
	tier: "acute" | "elevated" | "standard" | undefined;
	escalationDerived: boolean;
	flagOn: boolean | undefined;
	dismissed: boolean;
	channels: readonly ChannelEntry[] | undefined;
};

export function offerMoment(ctx: Omit<OfferContext, "channels">): boolean {
	return (
		(ctx.answer === "lighter" || ctx.answer === "still_here") &&
		(ctx.tier === "standard" || ctx.tier === "elevated") &&
		!ctx.escalationDerived &&
		ctx.flagOn === true &&
		!ctx.dismissed
	);
}

export function telegramOfferVisible(ctx: OfferContext): boolean {
	if (!offerMoment(ctx)) {
		return false;
	}
	const telegram = ctx.channels?.find((c) => c.channel === "telegram");
	return (
		telegram?.status === "not_linked" &&
		telegram.available &&
		telegram.everLinked === false
	);
}
