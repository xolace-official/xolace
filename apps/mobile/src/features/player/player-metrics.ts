import { Easing, type WithSpringConfig } from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";

/**
 * The board's geometry and motion (`design/boards/PlayerAlive.dc.html`, handoff `player.md`
 * §1–3). Tops are the board's, on its 390 × 844 phone; the screen offsets them by the safe area
 * and splits any extra height above the cover and below the volume.
 */
export const P = {
	boardBottomInset: 34,
	boardH: 844,
	boardTopInset: 50,
	cover: 288,
	coverPaused: 0.88,
	coverRadius: 26,
	coverTop: 122,
	ctrlTop: 630,
	footTop: 776,
	glass: 44,
	glassSide: 16,
	/** Close and the moon sit 4 pt under the safe area (the board's 54). */
	glassTop: 4,
	labelTop: 438,
	lineH: 40,
	lineTop: 528,
	side: 24,
	timeTop: 584,
	volTop: 730,
	waveH: 56,
	waveTop: 520,
} as const;

/** Tops inside the stage, which starts at the cover. */
export const fromCover = (top: number) => top - P.coverTop;

/** `cubic-bezier(.23, 1, .32, 1)`: the strip's grow and the pill's widening. */
export const OUT = Easing.bezier(0.23, 1, 0.32, 1);

/** Opacities on the fixed white ink (`--color-player-ink`), from the board. */
export const INK = {
	barRest: 0.3,
	elapsed: 0.72,
	err: 0.75,
	foot: 0.55,
	label: 0.62,
	left: 0.5,
	link: 0.92,
	quiet: 0.6,
	sleepFading: 0.75,
} as const;

export const MOTION = {
	/** Swipe down: closes past 120 pt or a flick over 800 pt/s. */
	closeAt: 120,
	closeFlick: 800,
	cover: {
		dampingRatio: 0.74,
		duration: 560,
		...PLAY_AS_CHOSEN,
	} satisfies WithSpringConfig,
	dim: 0.55,
	discBack: {
		dampingRatio: 0.6,
		duration: 320,
		...PLAY_AS_CHOSEN,
	} satisfies WithSpringConfig,
	discIn: 110,
	glyph: {
		dampingRatio: 0.6,
		duration: 420,
		...PLAY_AS_CHOSEN,
	} satisfies WithSpringConfig,
	glyphFade: 200,
	grow: 200,
	/** native-cook's snap (stiffness 170, damping 19). */
	snap: {
		damping: 19,
		stiffness: 170,
		...PLAY_AS_CHOSEN,
	} satisfies WithSpringConfig,
	/** The 15 s arc: out to 26° in 175 ms, home on an overshoot. */
	turn: 26,
	turnBack: {
		dampingRatio: 0.5,
		duration: 380,
		...PLAY_AS_CHOSEN,
	} satisfies WithSpringConfig,
	turnOut: 175,
	widen: 320,
} as const;

/** The waveform (§2): rest 4 + peak × 28, touched 4 + peak × 36, the loupe within ~30 pt. */
export const WAVE = {
	base: 4,
	gap: 2.5,
	pillAboveLine: 22,
	pillAboveWave: 30,
	pillH: 26,
	pillInset: 26,
	rest: 28,
	sigma: 12,
	swell: 0.35,
	tickEvery: 30,
	touched: 36,
} as const;
