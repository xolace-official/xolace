import { Presets } from "react-native-pulsar";
import {
	affirmativePress,
	breathExhalePattern,
	breathInhalePattern,
	breathTopHold,
	compassionateHold,
	errorNotice,
	gentlePresence,
	homeEntrance,
	mirrorArrival,
	onboardingEntrance,
	pathChoice,
	processingBreath,
	resonanceToggle,
	sessionComplete,
	softenPulse,
	softPress,
	textureSelect,
	typingBegin,
} from "@/lib/haptics/haptics-patterns.ios";
import type { HapticPatternData } from "@/modules/native-core-haptics";
import CoreHaptics from "@/modules/native-core-haptics";
import type { BreathPhase, HapticName } from "./haptics.types";

// ── Generic helpers ──────────────────────────────────────────────────

function play(pattern: HapticPatternData): void {
	CoreHaptics.playPattern(pattern).catch((e: unknown) => {
		console.warn("[haptics] playPattern failed:", e);
	});
}

export function tap(intensity = 0.5, sharpness = 0.3): void {
	CoreHaptics.impact(sharpness, intensity).catch((e: unknown) => {
		console.warn("[haptics] impact failed:", e);
	});
}

// ── Named pattern functions ──────────────────────────────────────────

export function playProcessingBreath(): void {
	play(processingBreath);
}

/**
 * Platform-parity counterpart to the Android composer hook. iOS already has an
 * amplitude-controlled envelope in `processingBreath`, so this just wraps it.
 */
export function useProcessingBreathHaptic(): () => void {
	return playProcessingBreath;
}

export function playGentlePresence(): void {
	play(gentlePresence);
}

export function playMirrorArrival(): void {
	play(mirrorArrival);
}

export function playSessionComplete(): void {
	play(sessionComplete);
}

export function playResonanceToggle(): void {
	play(resonanceToggle);
}

export function playPathChoice(): void {
	play(pathChoice);
}

export function playTextureSelect(): void {
	play(textureSelect);
}

export function playTypingBegin(): void {
	play(typingBegin);
}

export function playSoftPress(): void {
	play(softPress);
}

export function playAffirmativePress(): void {
	play(affirmativePress);
}

export function playErrorNotice(): void {
	play(errorNotice);
}

export function playCompassionateHold(): void {
	play(compassionateHold);
}

export function playSoftenPulse(): void {
	play(softenPulse);
}

export function playOnboardingEntrance(): void {
	play(onboardingEntrance);
}

export function playHomeEntrance(): void {
	play(homeEntrance);
}

// The one iOS haptic backed by a Pulsar preset rather than a CoreHaptics
// pattern — `bellToll` is used as-is on both platforms (#499).
export function playFollowUpEntrance(): void {
	Presets.bellToll();
}

// ── Breath phase haptics ─────────────────────────────────────────────
// Called per PacedOrb phase transition. The continuous patterns breathe
// *with* the orb rather than ticking at boundaries.

/** @public Not wired yet: kept in step with haptics.ts for the PacedOrb runner. */
export function playBreathPhase(phase: BreathPhase, durationMs: number): void {
	const seconds = durationMs / 1000;
	switch (phase) {
		case "inhale":
			play(breathInhalePattern(seconds));
			return;
		case "top":
			play(breathTopHold);
			return;
		case "exhale":
			play(breathExhalePattern(seconds));
			return;
	}
}

// ── Dynamic play-by-name ─────────────────────────────────────────────

const patternMap: Record<
	Exclude<HapticName, "followUpEntrance">,
	HapticPatternData
> = {
	affirmativePress,
	compassionateHold,
	errorNotice,
	gentlePresence,
	homeEntrance,
	mirrorArrival,
	onboardingEntrance,
	pathChoice,
	processingBreath,
	resonanceToggle,
	sessionComplete,
	softenPulse,
	softPress,
	textureSelect,
	typingBegin,
};

/** @public Not wired yet: kept in step with haptics.ts for the PacedOrb runner. */
export function playHaptic(name: HapticName): void {
	if (name === "followUpEntrance") {
		return playFollowUpEntrance();
	}
	play(patternMap[name]);
}
