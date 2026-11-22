import { REFLECTION_MAX_TEXTURES } from "@xolace/backend/shared";

export type TextureSetId = "flat" | "tender" | "bright" | "charged";

export const TEXTURE_SET_IDS: readonly TextureSetId[] = [
	"flat",
	"tender",
	"bright",
	"charged",
];

/** The server refuses more (B10), so the picker stops here too. */
export const MAX_TEXTURES = REFLECTION_MAX_TEXTURES;

export const TEXTURE_SETS: Record<TextureSetId, readonly string[]> = {
	bright: [
		"warm",
		"open",
		"grateful",
		"hopeful",
		"full",
		"glowing",
		"clear",
		"lifted",
	],
	charged: [
		"racing",
		"bracing",
		"on-edge",
		"restless",
		"wound up",
		"grinding",
		"spinning",
		"pressed",
	],
	flat: [
		"heavy",
		"tight",
		"foggy",
		"buzzing",
		"empty",
		"scattered",
		"numb",
		"raw",
	],
	tender: [
		"aching",
		"hollow",
		"longing",
		"bereft",
		"weeping inside",
		"closing off",
		"tender",
		"heavy-hearted",
	],
};

export const TEXTURE_SET_LABELS: Record<TextureSetId, string> = {
	bright: "Bright",
	charged: "Charged",
	flat: "Flat",
	tender: "Tender",
};
