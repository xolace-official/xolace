/** What `Loading` last drew, and whether it has spoken: one announcement per loading wait. */
export type CantLoadSpeech = {
	last: "none" | "placeholder" | "message";
	announced: boolean;
};

export const cantLoadStart: CantLoadSpeech = { announced: false, last: "none" };

/**
 * The message is read out once, when it replaces a placeholder on the screen in front. A screen
 * that opens already unable to load, or one behind another, is read when someone gets to it.
 */
export function cantLoadStep(
	speech: CantLoadSpeech,
	now: { stalled: boolean; focused: boolean }
): { next: CantLoadSpeech; announce: boolean } {
	const announce =
		now.stalled &&
		now.focused &&
		speech.last === "placeholder" &&
		!speech.announced;
	return {
		announce,
		next: {
			announced: speech.announced || announce,
			last: now.stalled ? "message" : "placeholder",
		},
	};
}
