import { TELEGRAM_LINK_TTL_MS } from "@xolace/backend/shared";
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
			return isLinking(step) ? "waiting" : step;
		case "link_expired":
			return step === "waiting" ? "expired" : step;
		case "channel_changed":
			return isLinking(step) && event.linked ? "linked" : step;
		default:
			return "idle";
	}
}

const MINUTE_MS = 60_000;
export const LINK_LIFETIME_MINUTES = TELEGRAM_LINK_TTL_MS / MINUTE_MS;
const REUSE_MARGIN_MS = 5 * MINUTE_MS;

export function linkMsLeft(mintedAt: number, now: number): number {
	return mintedAt + TELEGRAM_LINK_TTL_MS - now;
}

export function canReuseLink(mintedAt: number, now: number): boolean {
	return linkMsLeft(mintedAt, now) >= REUSE_MARGIN_MS;
}

export async function shareInFlight<T>(
	slot: { current: Promise<T> | null },
	run: () => Promise<T>
): Promise<T> {
	if (slot.current) {
		return slot.current;
	}
	const pending = run();
	slot.current = pending;
	try {
		return await pending;
	} finally {
		slot.current = null;
	}
}
