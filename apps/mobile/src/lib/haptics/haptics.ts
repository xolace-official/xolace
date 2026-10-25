// Cross-platform haptics via react-native-pulsar (Android + web).
// iOS uses CoreHaptics via haptics.ios.ts (Expo platform extension).
import { useCallback } from "react";
import type { Pattern } from "react-native-pulsar";
import { Presets, usePatternComposer } from "react-native-pulsar";
import type { BreathPhase, HapticName } from "./haptics.types";

export type { BreathPhase, HapticName };

const isWeb = process.env.EXPO_OS === "web";

function run(fn: () => void): void {
	if (!isWeb) {
		fn();
	}
}

// ── Generic tap ──────────────────────────────────────────────────────

export function tap(_intensity?: number, _sharpness?: number): void {
	run(() => Presets.flick());
}

// ── Named pattern functions ──────────────────────────────────────────

export function playProcessingBreath(): void {
	run(() => Presets.breath());
}

// Android's `Presets.breath()` is a fixed preset with no intensity parameter,
// and lands far heavier than the iOS CoreHaptics envelope (which peaks at
// intensity 0.6 and decays to zero). Processing is ambient, not an event — it
// should register as presence, not as an alert.
//
// Duration carries most of the reduction here, deliberately. Pulsar's Android
// tiers degrade: ADVANCED_SUPPORT (API 36+) renders both envelopes,
// STANDARD_SUPPORT amplitude only, and LIMITED_SUPPORT (API 26+) is
// timing-based waveform with no amplitude modulation at all — there this
// collapses to a flat buzz for however long it runs. Shortening the pattern is
// the only lever that quiets it at every tier.
//
// The ceiling stays well clear of silence on purpose: per the Sonar note in
// AppearanceScreen, this team measured ~0.35 amplitude sitting under most LRAs'
// perceptual floor (our observation, not a documented Pulsar threshold).
// Undershooting reads as "broken", not "gentle".
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

/**
 * Processing-state breath, amplitude-controlled. Returns a `play` callback so
 * the pattern is parsed once on mount rather than per call — `playProcessingBreath`
 * stays exported for any non-component caller.
 */
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

// ── Breath phase haptics ─────────────────────────────────────────────
// Best-effort preset approximations. Duration-matched continuous envelopes
// (matching the iOS CoreHaptics implementation) are a planned Phase 2 upgrade
// using usePatternComposer inside BreathBeat.

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

// ── Dynamic play-by-name ─────────────────────────────────────────────

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

export function playHaptic(name: HapticName): void {
	handlerMap[name]();
}
