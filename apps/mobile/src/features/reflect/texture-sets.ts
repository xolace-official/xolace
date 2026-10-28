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

/**
 * The four hue families, borrowed from the mirror tone badges (`--tone-*`).
 */
export type TextureHue = "violet" | "rose" | "blue" | "amber";

/** Colour groups words by what they feel like; a word keeps its family wherever it appears. */
const HUE_BY_WORD: Record<string, TextureHue> = {
	aching: "rose",
	bereft: "violet",
	bracing: "blue",
	buzzing: "rose",
	"can't turn it off": "blue",
	clear: "blue",
	"closing off": "blue",
	empty: "amber",
	foggy: "violet",
	full: "rose",
	glowing: "amber",
	grateful: "rose",
	grinding: "violet",
	heavy: "blue",
	"heavy-hearted": "rose",
	hollow: "violet",
	hopeful: "violet",
	lifted: "violet",
	longing: "amber",
	numb: "amber",
	"on-edge": "amber",
	open: "blue",
	pressed: "blue",

	racing: "rose",
	raw: "rose",
	"replaying it": "violet",
	restless: "amber",
	scattered: "violet",
	"something happened": "rose",
	spinning: "rose",
	spiraling: "violet",
	tender: "amber",
	tight: "blue",
	"too much": "rose",

	warm: "amber",
	"weeping inside": "blue",

	"wide awake": "blue",
	"wound up": "violet",
};

export const textureHue = (word: string): TextureHue =>
	HUE_BY_WORD[word] ?? "violet";

/**
 * Pill skins per hue, written out because Tailwind only sees class names that appear literally.
 */
export const TEXTURE_PILL: Record<
	TextureHue,
	{ rest: string; selected: string; label: string; echo: string }
> = {
	amber: {
		echo: "bg-tone-witnessed/18",
		label: "text-tone-witnessed-text",
		rest: "bg-tone-witnessed/10 border-tone-witnessed/25",
		selected: "bg-tone-witnessed/25 border-tone-witnessed/55",
	},
	blue: {
		echo: "bg-tone-direct/18",
		label: "text-tone-direct-text",
		rest: "bg-tone-direct/10 border-tone-direct/25",
		selected: "bg-tone-direct/25 border-tone-direct/55",
	},
	rose: {
		echo: "bg-tone-gentle/18",
		label: "text-tone-gentle-text",
		rest: "bg-tone-gentle/10 border-tone-gentle/25",
		selected: "bg-tone-gentle/25 border-tone-gentle/55",
	},
	violet: {
		echo: "bg-tone-poetic/18",
		label: "text-tone-poetic-text",
		rest: "bg-tone-poetic/10 border-tone-poetic/25",
		selected: "bg-tone-poetic/25 border-tone-poetic/55",
	},
};

export function resolveTextureSetId(value: unknown): TextureSetId {
	if (
		typeof value === "string" &&
		TEXTURE_SET_IDS.includes(value as TextureSetId)
	) {
		return value as TextureSetId;
	}
	return "flat";
}
