import type { ChannelEntry } from "@/features/reach-me-on/reach-view";

/** The follow-up answers the offer can follow, as the check-in screen names them. */
type OfferAnswer = "lighter" | "still_here";

export type OfferContext = {
	/** The answer just given in the app; null before one. */
	answer: OfferAnswer | "heavier" | "processed" | "vent" | null;
	/** From the route: missing if it was restored or deep-linked without it. */
	tier: "acute" | "elevated" | "standard" | undefined;
	escalationDerived: boolean;
	/** The `reach-me-on` flag: undefined until PostHog has loaded flags. */
	flagOn: boolean | undefined;
	/** "Not now" was tapped once, on this account. */
	dismissed: boolean;
	/** `listChannels`; undefined while loading. */
	channels: readonly ChannelEntry[] | undefined;
};

/** The moment allows the offer, before asking whether Telegram is open to this person. */
export function offerMoment(ctx: Omit<OfferContext, "channels">): boolean {
	return (
		(ctx.answer === "lighter" || ctx.answer === "still_here") &&
		// Fails closed: a missing tier might be acute.
		(ctx.tier === "standard" || ctx.tier === "elevated") &&
		!ctx.escalationDerived &&
		ctx.flagOn === true &&
		!ctx.dismissed
	);
}

/**
 * The one-time "Want the next check-in on Telegram?" offer (#777): only after a
 * lighter or still-with-it answer, never on an acute or crisis card, and only
 * while Telegram is offered, open to this person and never linked.
 */
export function telegramOfferVisible(ctx: OfferContext): boolean {
	if (!offerMoment(ctx)) {
		return false;
	}
	const telegram = ctx.channels?.find((c) => c.channel === "telegram");
	// Only someone who never linked: a past link (unlinked, /stop, blocked)
	// reads as disconnected, and it was often a choice. 30 days on the row is
	// purged and reads not_linked, so `everLinked` decides; absent (an older
	// backend) counts as linked, since missing an offer costs less than
	// re-offering to someone who left.
	return (
		telegram?.status === "not_linked" &&
		telegram.available &&
		telegram.everLinked === false
	);
}
