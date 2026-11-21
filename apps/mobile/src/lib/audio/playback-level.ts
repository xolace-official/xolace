export type PlaybackLevels = {
	shown: { volume: number; loop: boolean };
	native: { volume: number; loop: boolean };
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function playbackLevels(
	listener: { volume: number; loop: boolean },
	options: { gain?: number; stopAtEnd?: boolean } = {}
): PlaybackLevels {
	const { gain = 1, stopAtEnd = false } = options;
	return {
		native: {
			loop: nativeLoop(listener.loop, stopAtEnd),
			volume: nativeVolume(listener.volume, gain),
		},
		shown: { loop: listener.loop, volume: clamp01(listener.volume) },
	};
}

export const nativeVolume = (volume: number, gain = 1) =>
	clamp01(volume) * clamp01(gain);

export const nativeLoop = (loop: boolean, stopAtEnd = false) =>
	loop && !stopAtEnd;
