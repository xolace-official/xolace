import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import type { Choice } from "@/components/shared/choice-props";
import type { Directness } from "@/lib/talk/use-talk-style";

export const PACE_OPTIONS: readonly Choice<TalkPace>[] = [
	{ id: "slower", label: "Slower" },
	{ id: "normal", label: "Normal" },
];

export const DIRECTNESS_OPTIONS: readonly Choice<Directness>[] = [
	{ id: "gentle", label: "Gentle" },
	{ id: "balanced", label: "In between" },
	{ id: "straight", label: "Straight" },
];
