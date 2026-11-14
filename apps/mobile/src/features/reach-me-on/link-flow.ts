/**
 * Linking Telegram, three steps inside its card (#733): the disclosure, then
 * "Tap Start in Telegram" until `listChannels` says the chat is linked, then a
 * short confirmation. No client "link completed": the backend decides. A link
 * handed off but not redeemed within its lifetime turns the wait into
 * "expired", from where a fresh link starts the wait again.
 */
export type LinkStep = "idle" | "disclose" | "waiting" | "expired" | "linked";

export type LinkEvent =
	| { type: "start" }
	/** The link was opened in Telegram or copied for another device. */
	| { type: "link_handed_off" }
	/** The handed-off link's lifetime passed. */
	| { type: "link_expired" }
	/** `listChannels` changed: is Telegram linked now? */
	| { type: "channel_changed"; linked: boolean }
	| { type: "cancel" }
	| { type: "dismiss" };

/** Mid-flow: leaving now abandons the link. */
export function isLinking(
	step: LinkStep
): step is "disclose" | "waiting" | "expired" {
	return step === "disclose" || step === "waiting" || step === "expired";
}

export function linkFlow(step: LinkStep, event: LinkEvent): LinkStep {
	switch (event.type) {
		case "start":
			return "disclose";
		case "link_handed_off":
			// Only mid-link: the chat may have linked before the handoff finished.
			return isLinking(step) ? "waiting" : step;
		case "link_expired":
			return step === "waiting" ? "expired" : step;
		case "channel_changed":
			return isLinking(step) && event.linked ? "linked" : step;
		default:
			return "idle";
	}
}

/** How long a minted link works (`LINK_TOKEN_TTL_MS` on the backend). */
export const LINK_LIFETIME_MINUTES = 15;
const MINUTE_MS = 60_000;
const LINK_LIFETIME_MS = LINK_LIFETIME_MINUTES * MINUTE_MS;
/** A reused link keeps at least this long to reach Telegram and Start. */
const REUSE_MARGIN_MS = 5 * MINUTE_MS;

/** Milliseconds until a link minted at `mintedAt` stops working. */
export function linkMsLeft(mintedAt: number, now: number): number {
	return mintedAt + LINK_LIFETIME_MS - now;
}

/** Reuse a minted link only while it has a safe margin left. */
export function canReuseLink(mintedAt: number, now: number): boolean {
	return linkMsLeft(mintedAt, now) >= REUSE_MARGIN_MS;
}
