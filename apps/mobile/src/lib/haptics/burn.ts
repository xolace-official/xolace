import { useState } from "react";
import { type Pattern, usePatternComposer } from "react-native-pulsar";

/**
 * Vent's burn as one Pulsar pattern (handoff `vent.md` §7, §14), played at the release rather
 * than as per-frame calls into JS: ticks that speed up through the gather (native-cook
 * flare-notifications), one heavy transient at the flash, then a crackle that slows and fades
 * with the sparks. The same pattern on iOS and Android. Times in ms.
 */
type Tick = { time: number; amplitude: number; frequency: number };

const GATHER = {
	firstGap: 110,
	frequency: 0.5,
	from: 0.25,
	ratio: 0.85,
	to: 0.6,
} as const;
const FLASH = { amplitude: 1, frequency: 0.3 } as const;
const CRACKLE = {
	amplitude: 0.55,
	firstGap: 70,
	frequency: 0.75,
	jitter: 60,
	minGap: 24,
	ratio: 1.15,
	runMs: 1400,
	seed: 740,
} as const;
const NO_CURVE = { amplitude: [], frequency: [] };
const LCG_A = 1_664_525;
const LCG_C = 1_013_904_223;
const LCG_M = 2 ** 32;

/** A seeded 0–1 sequence, so the crackle's jitter is the same every time. */
function seeded(seed: number) {
	let s = seed;
	return () => {
		s = (LCG_A * s + LCG_C) % LCG_M;
		return s / LCG_M;
	};
}

function gatherTicks(gatherMs: number): Tick[] {
	const ticks: Tick[] = [];
	for (
		let t = 0, gap: number = GATHER.firstGap;
		t < gatherMs;
		t += gap, gap *= GATHER.ratio
	) {
		const k = t / gatherMs;
		ticks.push({
			amplitude: GATHER.from + (GATHER.to - GATHER.from) * k,
			frequency: GATHER.frequency,
			time: t,
		});
	}
	return ticks;
}

/** The flash at `at`, then from the flash's end a crackle fading to nothing. */
function flashAndCrackle(at: number, flashMs: number): Tick[] {
	const ticks: Tick[] = [{ time: at, ...FLASH }];
	const rand = seeded(CRACKLE.seed);
	const from = at + flashMs;
	for (
		let t = 0, gap: number = CRACKLE.firstGap;
		t < CRACKLE.runMs;
		gap *= CRACKLE.ratio
	) {
		ticks.push({
			amplitude: CRACKLE.amplitude * (1 - t / CRACKLE.runMs),
			frequency: CRACKLE.frequency,
			time: from + t,
		});
		t += Math.max(CRACKLE.minGap, gap + (rand() * 2 - 1) * CRACKLE.jitter);
	}
	return ticks;
}

/** The whole burn: gather, flash at `gatherMs`, crackle from `gatherMs + flashMs`. */
export const burnPattern = (gatherMs: number, flashMs: number): Pattern => ({
	continuousPattern: NO_CURVE,
	discretePattern: [
		...gatherTicks(gatherMs),
		...flashAndCrackle(gatherMs, flashMs),
	],
});

/** A pinch cut the gather short: from the flash, now. */
export const burnFromFlashPattern = (flashMs: number): Pattern => ({
	continuousPattern: NO_CURVE,
	discretePattern: flashAndCrackle(0, flashMs),
});

/** The burn, built once: `play` at the release, `fromFlash` when a pinch bursts it early. */
export function useBurnHaptic(gatherMs: number, flashMs: number) {
	const [patterns] = useState(() => ({
		full: burnPattern(gatherMs, flashMs),
		pinched: burnFromFlashPattern(flashMs),
	}));
	const full = usePatternComposer(patterns.full);
	const pinched = usePatternComposer(patterns.pinched);
	return {
		fromFlash: () => {
			full.stop();
			pinched.play();
		},
		play: full.play,
	};
}
