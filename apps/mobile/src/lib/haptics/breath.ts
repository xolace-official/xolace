import { useEffect, useRef, useState } from "react";
import {
	type Pattern,
	Settings,
	usePatternComposer,
} from "react-native-pulsar";

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
export type BreathComposers = {
	inLong: Composer;
	inShort: Composer;
	outLong: Composer;
	outShort: Composer;
	top: Composer;
};

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
			} catch {}
		},
		stop: () => {
			const c = get();
			try {
				for (const composer of [c.inLong, c.inShort, c.outLong, c.outShort]) {
					composer.stop();
				}
				Settings.stopHaptics();
			} catch {}
		},
	};
}

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
