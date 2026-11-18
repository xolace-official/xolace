/** What a player shows (the listener's own volume and Repeat) and what the native player is
 * set to, once a caller's options apply. Pure, so `usePlayback` and its test share it. */
export type PlaybackLevels = {
	/** The volume slider and the Repeat toggle: the listener's choices, never moved. */
	shown: { volume: number; loop: boolean };
	/** What the native player plays at. */
	native: { volume: number; loop: boolean };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * `gain` (the sleep timer's fade) scales the sound without moving the slider; `stopAtEnd`
 * (End of track) stops this play at its end even with Repeat on, without turning Repeat off.
 */
export function playbackLevels(
	listener: { volume: number; loop: boolean },
	options: { gain?: number; stopAtEnd?: boolean } = {}
): PlaybackLevels {
	const { gain = 1, stopAtEnd = false } = options;
	return {
		native: {
			loop: listener.loop && !stopAtEnd,
			volume: clamp01(listener.volume) * clamp01(gain),
		},
		shown: { loop: listener.loop, volume: clamp01(listener.volume) },
	};
}
