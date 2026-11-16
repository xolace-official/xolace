import { type Pattern, usePatternComposer } from "react-native-pulsar";
import {
	COMPRESS_MS,
	FLASH_MS,
	mulberry32,
} from "@/features/vent/field/particle-config";
import {
	playAffirmativePress,
	playErrorNotice,
	playGentlePresence,
	playSoftPress,
} from "@/lib/haptics";

/**
 * The vent's haptics (handoff §14). Production's patterns for the presses; v2's burn is one
 * pattern built ahead of time and played at the release, not per-frame calls into JS:
 * ticks that speed up through the gather (native-cook flare-notifications), one heavy transient at
 * the flash, then a crackle that slows and fades with the sparks. Times in ms.
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

function gatherTicks(): Tick[] {
	const ticks: Tick[] = [];
	for (
		let t = 0, gap: number = GATHER.firstGap;
		t < COMPRESS_MS;
		t += gap, gap *= GATHER.ratio
	) {
		const k = t / COMPRESS_MS;
		ticks.push({
			amplitude: GATHER.from + (GATHER.to - GATHER.from) * k,
			frequency: GATHER.frequency,
			time: t,
		});
	}
	return ticks;
}

/** The flash at `at`, then the crackle from the scatter (the flash's end), fading to nothing. */
function flashAndCrackle(at: number): Tick[] {
	const ticks: Tick[] = [{ time: at, ...FLASH }];
	const rand = mulberry32(CRACKLE.seed);
	const from = at + FLASH_MS;
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

const NO_CURVE = { amplitude: [], frequency: [] };
const BURN: Pattern = {
	continuousPattern: NO_CURVE,
	discretePattern: [...gatherTicks(), ...flashAndCrackle(COMPRESS_MS)],
};
/** A pinch shortens the gather: the pattern from the flash instead. */
const BURN_FROM_FLASH: Pattern = {
	continuousPattern: NO_CURVE,
	discretePattern: flashAndCrackle(0),
};

export function useVentHaptics() {
	// The burn is the vent's own pattern, played straight through Pulsar on both platforms.
	const burn = usePatternComposer(BURN);
	const fromFlash = usePatternComposer(BURN_FROM_FLASH);
	return {
		/** Recording really started. */
		affirmativePress: playAffirmativePress,
		/** The release: gather, flash, crackle. */
		burn: burn.play,
		/** A pinch cut the gather: stop the ticks, flash now. */
		burst: () => {
			burn.stop();
			fromFlash.play();
		},
		/** The mic is off and was tapped. */
		errorNotice: playErrorNotice,
		/** 10 s before it lets go on its own. */
		gentlePresence: playGentlePresence,
		/** I understand, Let it go, dropped mid-vent. */
		softPress: playSoftPress,
	};
}
