export type TextureSetId = "flat" | "tender" | "bright" | "charged";

export const TEXTURE_SET_IDS: readonly TextureSetId[] = [
	"flat",
	"tender",
	"bright",
	"charged",
];

/**
 * How many words one answer can hold.
 *
 * Nobody is feeling eight things at once — past four it stops being an answer
 * and starts being a shopping list, and the card can't hold it either.
 */
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
 * The four hue families, borrowed from the mirror tone badges.
 *
 * Every theme already defines these four (`--tone-poetic` violet,
 * `--tone-gentle` rose, `--tone-direct` blue, `--tone-witnessed` amber) and
 * they are tuned per theme for light and dark — so they are the app's hue
 * families, not the badge's private colours. Retuning one there retunes the
 * pills here, which is the intent.
 */
export type TextureHue = "violet" | "rose" | "blue" | "amber";

/**
 * Which words are kin.
 *
 * Colour groups words by what they actually feel like — weight, absence,
 * unclarity, exposure — so the grid reads as a handful of related moods rather
 * than eight equal options. Two or three to a family; a word keeps its family
 * wherever it appears (`aching` is the same ache in Tender and at 3am).
 */
const HUE_BY_WORD: Record<string, TextureHue> = {
	// tender — hurt, yearning, loss, withdrawal
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
	// flat — weight, unclarity, absence, exposure
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

	// charged — speed, edge, pressure, tension
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

	// bright — warmth, fullness, lift, clarity
	warm: "amber",
	"weeping inside": "blue",

	// night — the 3am set runs cool; no amber here on purpose
	"wide awake": "blue",
	"wound up": "violet",
};

export const textureHue = (word: string): TextureHue =>
	HUE_BY_WORD[word] ?? "violet";

/**
 * Pill skins per hue. Written out rather than composed, because Tailwind can
 * only see class names that appear literally in the source.
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
