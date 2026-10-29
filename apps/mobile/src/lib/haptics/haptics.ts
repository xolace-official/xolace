// Cross-platform haptics via react-native-pulsar (Android + web).
// iOS uses CoreHaptics via haptics.ios.ts (Expo platform extension).
import { useCallback } from "react";
import type { Pattern } from "react-native-pulsar";
import { Presets, usePatternComposer } from "react-native-pulsar";
import type { BreathPhase, HapticName } from "./haptics.types";

const isWeb = process.env.EXPO_OS === "web";

function run(fn: () => void): void {
	if (!isWeb) {
		fn();
	}
}

export function tap(_intensity?: number, _sharpness?: number): void {
	run(() => Presets.flick());
}

/** @public Not wired yet: kept in step with haptics.ios.ts for the PacedOrb runner. */
export function playProcessingBreath(): void {
	run(() => Presets.breath());
}

// Android's `Presets.breath()` is far heavier than the iOS envelope, and Pulsar's LIMITED_SUPPORT tier
// (API 26+) ignores amplitude, so duration is the only lever that quiets it at every tier. Amplitude
// stays above ~0.35: under most LRAs' perceptual floor it reads as "broken", not "gentle".
const PROCESSING_BREATH_MS = 1600;

const PROCESSING_BREATH_PATTERN: Pattern = {
	continuousPattern: {
		amplitude: [
			{ time: 0, value: 0.3 },
			{ time: PROCESSING_BREATH_MS * 0.45, value: 0.55 },
			{ time: PROCESSING_BREATH_MS * 0.65, value: 0.5 },
			{ time: PROCESSING_BREATH_MS, value: 0.0 },
		],
		// Rendered on iOS and Android API 36+ only; ignored on the amplitude-only
		// and waveform tiers, so no part of the intended feel may depend on it.
		frequency: [
			{ time: 0, value: 0.15 },
			{ time: PROCESSING_BREATH_MS, value: 0.15 },
		],
	},
	discretePattern: [],
};

/** Processing-state breath. Returns a `play` callback so the pattern is parsed once on mount. */
export function useProcessingBreathHaptic(): () => void {
	// Passing `undefined` on web skips Pulsar's parse effect — there is no
	// native module to parse against, and `run()` would no-op the playback anyway.
	const { play } = usePatternComposer(
		isWeb ? undefined : PROCESSING_BREATH_PATTERN
	);
	// useCallback, not the compiler: the consumer holds this in a `deps: []`
	// effect, so identity stability is correctness here, not an optimization.
	// `play` is itself a `useCallback(..., [])` inside Pulsar.
	return useCallback(() => run(() => play()), [play]);
}

export function playGentlePresence(): void {
	run(() => Presets.feather());
}

export function playMirrorArrival(): void {
	run(() => Presets.herald());
}

export function playSessionComplete(): void {
	run(() => Presets.bloom());
}

export function playResonanceToggle(): void {
	run(() => Presets.chirp());
}

export function playPathChoice(): void {
	run(() => Presets.cadence());
}

export function playTextureSelect(): void {
	run(() => Presets.flick());
}

export function playTypingBegin(): void {
	run(() => Presets.thud());
}

export function playSoftPress(): void {
	run(() => Presets.push());
}

export function playAffirmativePress(): void {
	run(() => Presets.strike());
}

export function playErrorNotice(): void {
	run(() => Presets.wobble());
}

export function playCompassionateHold(): void {
	run(() => Presets.pendulum());
}

export function playSoftenPulse(): void {
	run(() => Presets.sway());
}

export function playOnboardingEntrance(): void {
	run(() => Presets.cascade());
}

export function playHomeEntrance(): void {
	run(() => Presets.thud());
}

export function playFollowUpEntrance(): void {
	run(() => Presets.bellToll());
}

// Best-effort preset approximations of the iOS duration-matched envelopes.

/** @public Not wired yet: kept in step with haptics.ios.ts for the PacedOrb runner. */
export function playBreathPhase(phase: BreathPhase, _durationMs: number): void {
	run(() => {
		switch (phase) {
			case "inhale":
				Presets.breath();
				return;
			case "top":
				Presets.pip();
				return;
			case "exhale":
				Presets.wave();
				return;
		}
	});
}

const handlerMap: Record<HapticName, () => void> = {
	affirmativePress: playAffirmativePress,
	compassionateHold: playCompassionateHold,
	errorNotice: playErrorNotice,
	followUpEntrance: playFollowUpEntrance,
	gentlePresence: playGentlePresence,
	homeEntrance: playHomeEntrance,
	mirrorArrival: playMirrorArrival,
	onboardingEntrance: playOnboardingEntrance,
	pathChoice: playPathChoice,
	processingBreath: playProcessingBreath,
	resonanceToggle: playResonanceToggle,
	sessionComplete: playSessionComplete,
	softenPulse: playSoftenPulse,
	softPress: playSoftPress,
	textureSelect: playTextureSelect,
	typingBegin: playTypingBegin,
};

/** @public Not wired yet: kept in step with haptics.ios.ts for the PacedOrb runner. */
export function playHaptic(name: HapticName): void {
	handlerMap[name]();
}
