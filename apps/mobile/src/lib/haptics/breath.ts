import { useEffect, useRef, useState } from "react";
import {
	type Pattern,
	Settings,
	usePatternComposer,
} from "react-native-pulsar";

/**
 * Sit with this's breath, felt (production's breath beat, unchanged): the
 * inhale swells .35 → .9 at 70% → 1.0 at frequency .15, the top is one hit at
 * .5 / .3, the exhale falls 1.0 → .5 at 50% → 0 at .12. Each is as long as its
 * phase, so there is one composer per phase length (4 s or 3 s in, 8 s or 6 s
 * out). The same patterns on iOS and Android. Times in ms.
 */
const INHALE_RISE = 0.7;
const EXHALE_FALL = 0.5;

function inhale(ms: number): Pattern {
	return {
		continuousPattern: {
			amplitude: [
				{ time: 0, value: 0.35 },
				{ time: ms * INHALE_RISE, value: 0.9 },
				{ time: ms, value: 1.0 },
			],
			frequency: [
				{ time: 0, value: 0.15 },
				{ time: ms, value: 0.15 },
			],
		},
		discretePattern: [],
	};
}

function exhale(ms: number): Pattern {
	return {
		continuousPattern: {
			amplitude: [
				{ time: 0, value: 1.0 },
				{ time: ms * EXHALE_FALL, value: 0.5 },
				{ time: ms, value: 0.0 },
			],
			frequency: [
				{ time: 0, value: 0.12 },
				{ time: ms, value: 0.12 },
			],
		},
		discretePattern: [],
	};
}

const TOP: Pattern = {
	continuousPattern: { amplitude: [], frequency: [] },
	discretePattern: [{ amplitude: 0.5, frequency: 0.3, time: 0 }],
};

const SHORT_IN_MS = 3000;
const SHORT_OUT_MS = 6000;
// Module constants: `usePatternComposer` re-parses whenever its pattern object changes.
const IN_LONG = inhale(4000);
const IN_SHORT = inhale(SHORT_IN_MS);
const OUT_LONG = exhale(8000);
const OUT_SHORT = exhale(SHORT_OUT_MS);

export type BreathStep = "in" | "top" | "out";

type Composer = { play: () => void; stop: () => void };
/** The breath's five composers, by phase and length. */
export type BreathComposers = {
	inLong: Composer;
	inShort: Composer;
	outLong: Composer;
	outShort: Composer;
	top: Composer;
};

/**
 * `play` a phase as long as it lasts; `stop` everything that's playing (each
 * continuous composer, then Pulsar's own queue). Reads the composers through
 * `get`, so the two functions never change.
 */
export function breathPlayer(get: () => BreathComposers) {
	return {
		play: (step: BreathStep, ms: number) => {
			const c = get();
			try {
				if (step === "in") {
					(ms <= SHORT_IN_MS ? c.inShort : c.inLong).play();
				} else if (step === "top") {
					c.top.play();
				} else {
					(ms <= SHORT_OUT_MS ? c.outShort : c.outLong).play();
				}
			} catch {
				// Pulsar unavailable.
			}
		},
		stop: () => {
			const c = get();
			try {
				for (const composer of [c.inLong, c.inShort, c.outLong, c.outShort]) {
					composer.stop();
				}
				Settings.stopHaptics();
			} catch {
				// Pulsar unavailable: nothing is playing.
			}
		},
	};
}

/**
 * The breath's composers as a player whose `play` and `stop` stay the same
 * for the screen's life, so a cleanup that stops it runs only when it should.
 */
export function useBreathHaptics() {
	const composers: BreathComposers = {
		inLong: usePatternComposer(IN_LONG),
		inShort: usePatternComposer(IN_SHORT),
		outLong: usePatternComposer(OUT_LONG),
		outShort: usePatternComposer(OUT_SHORT),
		top: usePatternComposer(TOP),
	};
	const latest = useRef(composers);
	useEffect(() => {
		latest.current = composers;
	});
	const [player] = useState(() => breathPlayer(() => latest.current));
	return player;
}
