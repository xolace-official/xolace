// Flux for intake v2, still for now (#707): the Xolace face held in one pose with its clock
// stopped. "Live Flux" animates it later; callers already name the mood each step wants.
import { PRESETS } from "@/features/xolace-face/pose";
import { useFace } from "@/features/xolace-face/use-face";
import { XolaceFace } from "@/features/xolace-face/xolace-face";

/** The intake moods (README § Live Flux), on the face's existing poses. */
const MOOD_POSES = {
	happy: PRESETS.glad,
	idle: PRESETS.neutral,
	talking: PRESETS.speaking,
} as const;

export type FluxMood = keyof typeof MOOD_POSES;

export function FluxStill({ mood, size }: { mood: FluxMood; size: number }) {
	// Keyed by the caller per step, so a new mood mounts a new face rather than tweening.
	const face = useFace(MOOD_POSES[mood], false);
	return <XolaceFace face={face} size={size} />;
}
