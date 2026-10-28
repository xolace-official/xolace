import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import type { CrossPlatformSymbol } from "@/lib/cross-platform-symbol";

/** Client mirror of the custom-voice catalog (convex/lib/voices.ts,
 * docs/voice-naming.md). "auto" is the free default; every named voice is Plus-only. */
export type VoiceValue = VoiceSlug | "auto";

export type VoiceOption = {
	value: VoiceValue;
	label: string;
	description: string;
	symbol: CrossPlatformSymbol;
	premium?: boolean;
};

export const VOICE_OPTIONS: VoiceOption[] = [
	{
		description: "Matches your mirror tone",
		label: "Auto",
		symbol: {
			android: "auto_awesome",
			ios: "wand.and.stars",
			web: "auto_awesome",
		},
		value: "auto",
	},
	{
		description:
			"Older and unhurried. Like someone who's heard a lot and isn't in a rush.",
		label: "Sage",
		premium: true,
		symbol: { android: "eco", ios: "leaf.fill", web: "eco" },
		value: "sage",
	},
	{
		description: "Soft-spoken, with a gentle lilt. Easy to sit with.",
		label: "Wren",
		premium: true,
		symbol: { android: "flutter_dash", ios: "bird.fill", web: "flutter_dash" },
		value: "wren",
	},
	{
		description: "Calm and steady. Holds the ground when your thoughts won't.",
		label: "Vesper",
		premium: true,
		symbol: {
			android: "nights_stay",
			ios: "moon.stars.fill",
			web: "nights_stay",
		},
		value: "vesper",
	},
	{
		description:
			"Low and gravelly. Close, like someone leaning in across the fire.",
		label: "Ash",
		premium: true,
		symbol: {
			android: "local_fire_department",
			ios: "flame.fill",
			web: "local_fire_department",
		},
		value: "ash",
	},
];

/** Static require map for bundled preview clips (dynamic paths don't bundle in
 * Metro). Regenerate with scratchpad/generate-voice-previews.mjs. */
export const VOICE_PREVIEWS: Record<VoiceSlug, number> = {
	ash: require("@/assets/sounds/voice-previews/ash.mp3"),
	sage: require("@/assets/sounds/voice-previews/sage.mp3"),
	vesper: require("@/assets/sounds/voice-previews/vesper.mp3"),
	wren: require("@/assets/sounds/voice-previews/wren.mp3"),
};
