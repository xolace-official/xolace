/**
 * Linking Telegram, three steps inside its card (#733): the disclosure, then
 * "Tap Start in Telegram" until `listChannels` says the chat is linked, then a
 * short confirmation. No client "link completed": the backend decides.
 */
export type LinkStep = "idle" | "disclose" | "waiting" | "linked";

export type LinkEvent =
	| { type: "start" }
	/** The link was opened in Telegram or copied for another device. */
	| { type: "link_handed_off" }
	/** `listChannels` changed: is Telegram linked now? */
	| { type: "channel_changed"; linked: boolean }
	| { type: "cancel" }
	| { type: "dismiss" };

/** Mid-flow: leaving now abandons the link. */
export function isLinking(step: LinkStep): step is "disclose" | "waiting" {
	return step === "disclose" || step === "waiting";
}

export function linkFlow(step: LinkStep, event: LinkEvent): LinkStep {
	switch (event.type) {
		case "start":
			return "disclose";
		case "link_handed_off":
			// Only mid-link: the chat may have linked before the handoff finished.
			return isLinking(step) ? "waiting" : step;
		case "channel_changed":
			return isLinking(step) && event.linked ? "linked" : step;
		default:
			return "idle";
	}
}
