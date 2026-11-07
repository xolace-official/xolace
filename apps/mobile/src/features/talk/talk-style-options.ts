// The talk's pace and directness choices, shared by settings and the voice-and-look sheet.

import type { TalkPace } from "@xolace/backend/convex/lib/voices";
import type { Chip } from "@/features/talk/talk-chips";
import type { Directness } from "@/features/talk/use-talk-style";

export const PACE_OPTIONS: Chip<TalkPace>[] = [
	{ label: "Slower", value: "slower" },
	{ label: "Normal", value: "normal" },
];

export const DIRECTNESS_OPTIONS: Chip<Directness>[] = [
	{ label: "Gentle", value: "gentle" },
	{ label: "In between", value: "balanced" },
	{ label: "Straight", value: "straight" },
];
