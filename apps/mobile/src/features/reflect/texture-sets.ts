export type TextureSetId = "flat" | "tender" | "bright" | "charged";

export const TEXTURE_SET_IDS: readonly TextureSetId[] = [
	"flat",
	"tender",
	"bright",
	"charged",
];

/** How many words one answer can hold; the card can't hold more. */
export const MAX_TEXTURES = 4;

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
