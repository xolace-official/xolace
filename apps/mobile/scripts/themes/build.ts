/**
 * Builds the theme CSS and the Metro theme list from the registry
 * (src/design/themes.ts). Pure: scripts/gen-themes.ts writes the files, and
 * build.test.ts checks the committed ones are what this builds.
 *
 * Each variant is built in three layers: SHARED (production's values that are
 * the same in most themes) → the theme's own values → DERIVED (the redesign's
 * extras a theme doesn't set, worked out from its own colours). It throws if a
 * variant misses a variable or sets one nobody declared.
 */
import { FONT_PAIRS, FONT_ROLES } from "../../src/design/font-pairs";
import {
	type Palette,
	THEME_BY_ID,
	type ThemeEntry,
	type ThemeMode,
	VARIANTS,
} from "../../src/design/themes";
import { alpha, mix } from "./color";

/** HeroUI Native's variables (node_modules/heroui-native/src/styles/variables.css). */
export const HEROUI = [
	"background",
	"foreground",
	"surface",
	"surface-foreground",
	"surface-secondary",
	"surface-secondary-foreground",
	"surface-tertiary",
	"surface-tertiary-foreground",
	"overlay",
	"overlay-foreground",
	"muted",
	"default",
	"default-foreground",
	"accent",
	"accent-foreground",
	"field-background",
	"field-foreground",
	"field-placeholder",
	"field-border",
	"field-border-width",
	"success",
	"success-foreground",
	"warning",
	"warning-foreground",
	"danger",
	"danger-foreground",
	"segment",
	"segment-foreground",
	"border",
	"separator",
	"focus",
	"link",
	"backdrop",
	"surface-shadow",
	"overlay-shadow",
	"field-shadow",
	"radius",
] as const;

/** Production's own extras, from before the generator. */
const PRODUCTION = [
	"ember",
	"frost-text",
	"offer-ink",
	"tone-poetic",
	"tone-gentle",
	"tone-direct",
	"tone-witnessed",
	"tone-poetic-text",
	"tone-gentle-text",
	"tone-direct-text",
	"tone-witnessed-text",
	"browse-audio",
	"browse-audio-foreground",
	"browse-music",
	"browse-music-foreground",
	"browse-topics",
	"browse-topics-foreground",
	// Playful's lip and stroke; off everywhere else (playful-components.css reads them).
	"playful-lip",
	"playful-lip-chip",
	"playful-stroke",
	"outline-stroke",
	"outline-lip",
	"accent-lip",
	"default-lip",
	"danger-lip",
	"warning-lip",
	"surface-stroke",
	"surface-stroke-color",
] as const;

/** The redesign's extras: colours two or more screens need that HeroUI has no name for. */
const XOLACE = [
	"subtle",
	"accent-ink",
	"accent-wash",
	"success-ink",
	"success-wash",
	"danger-ink",
	"danger-wash",
	"ember-ink",
	"ember-wash",
	"heavy-wash",
	"heavy-ink",
	"frost",
	"glass",
	"glass-edge",
	"tab-on",
	"eink",
	"mk",
] as const;

export const REQUIRED: readonly string[] = [
	...HEROUI,
	...PRODUCTION,
	...XOLACE,
];

const PLAYFUL_OFF: Palette = {
	"accent-lip": "transparent",
	"danger-lip": "transparent",
	"default-lip": "transparent",
	"outline-lip": "1px",
	"outline-stroke": "1px",
	"playful-lip": "0px",
	"playful-lip-chip": "0px",
	"playful-stroke": "0px",
	"surface-stroke": "1px",
	"surface-stroke-color": "color-mix(in oklab, var(--border) 65%, transparent)",
	"warning-lip": "transparent",
};

/** Production's base light/dark values for the variables most themes share. */
const SHARED: Record<ThemeMode, Palette> = {
	dark: {
		backdrop: "oklch(0% 0 0 / 20%)",
		"browse-audio": "oklch(74% 0.15 25 / 14%)",
		"browse-audio-foreground": "oklch(74% 0.15 25)",
		"browse-music": "oklch(72% 0.12 200 / 14%)",
		"browse-music-foreground": "oklch(72% 0.12 200)",
		"browse-topics": "oklch(76% 0.13 130 / 14%)",
		"browse-topics-foreground": "oklch(76% 0.13 130)",
		"field-border": "transparent",
		"field-border-width": "0px",
		"field-placeholder": "var(--muted)",
		"frost-text": "oklch(72% 0.12 240)",
		"offer-ink": "oklch(18% 0.02 285)",
		radius: "0.625rem",
		"tone-direct": "oklch(72% 0.15 225)",
		"tone-direct-text": "var(--tone-direct)",
		"tone-gentle": "oklch(72% 0.17 15)",
		"tone-gentle-text": "var(--tone-gentle)",
		"tone-poetic": "oklch(74% 0.18 305)",
		"tone-poetic-text": "var(--tone-poetic)",
		"tone-witnessed": "oklch(76% 0.15 75)",
		"tone-witnessed-text": "var(--tone-witnessed)",
		...PLAYFUL_OFF,
	},
	light: {
		backdrop: "oklch(0% 0 0 / 20%)",
		"browse-audio": "oklch(70% 0.15 25 / 16%)",
		"browse-audio-foreground": "oklch(70% 0.15 25)",
		"browse-music": "oklch(68% 0.12 200 / 16%)",
		"browse-music-foreground": "oklch(68% 0.12 200)",
		"browse-topics": "oklch(72% 0.13 130 / 16%)",
		"browse-topics-foreground": "oklch(72% 0.13 130)",
		"field-border": "transparent",
		"field-border-width": "0px",
		"field-placeholder": "var(--muted)",
		"frost-text": "oklch(52% 0.12 240)",
		"offer-ink": "oklch(18% 0.02 285)",
		radius: "0.625rem",
		"tone-direct": "oklch(68% 0.15 225)",
		"tone-direct-text": "oklch(46% 0.15 225)",
		"tone-gentle": "oklch(68% 0.17 15)",
		"tone-gentle-text": "oklch(46% 0.17 15)",
		"tone-poetic": "oklch(70% 0.18 305)",
		"tone-poetic-text": "oklch(48% 0.18 305)",
		"tone-witnessed": "oklch(72% 0.15 75)",
		"tone-witnessed-text": "oklch(48% 0.15 75)",
		...PLAYFUL_OFF,
	},
};

const LIGHT_INK_DARKEN = 0.25;
const DARK_INK_LIFT = 0.2;
const LIGHT_WASH = 0.12;
const DARK_WASH = 0.18;
const SUBTLE_FADE = 0.12;

/**
 * How a theme gets the redesign's extras it doesn't set. Tuned so Default's own
 * values come out close to these rules; the other themes haven't been reviewed
 * by a designer with them yet.
 *
 * - subtle: muted, 12% of the way to the background (the third text step).
 * - *-ink (coloured text on the page): light, the colour 25% toward black;
 *   dark, 20% toward the foreground.
 * - *-wash (a tinted ground): light, 12% of the colour in the card; dark, 18% in the page.
 * - heavy-wash / heavy-ink: one calm violet in every theme (the "Got heavier"
 *   answer), so a heavy answer never takes a theme's accent (red in Velvet,
 *   green in Emerald). Light #E6DEFF / #4B32C2 (6.4:1), dark #2A2440 / #C9BAFF
 *   (8.4:1). Opaque, so it can sit on stacked cards.
 * - frost: the theme's frost-text.
 * - glass: the card at 66% (light), the second surface at 62% (dark).
 * - glass-edge: white at 95% / 14%.
 * - tab-on: accent at 12% / 16%.
 * - eink: ember, 20% toward the foreground in light; ember in dark.
 * - mk: ember at 26% / 22%.
 */
function derive(mode: ThemeMode, v: (name: string) => string): Palette {
	const light = mode === "light";
	const ink = (c: string) =>
		light
			? mix(v(c), "#000000", LIGHT_INK_DARKEN)
			: mix(v(c), v("foreground"), DARK_INK_LIFT);
	const wash = (c: string) =>
		light
			? mix(v("surface"), v(c), LIGHT_WASH)
			: mix(v("background"), v(c), DARK_WASH);
	return {
		"accent-ink": ink("accent"),
		"accent-wash": wash("accent"),
		"danger-ink": ink("danger"),
		"danger-wash": wash("danger"),
		eink: light ? mix(v("ember"), v("foreground"), DARK_INK_LIFT) : v("ember"),
		"ember-ink": ink("ember"),
		"ember-wash": wash("ember"),
		frost: v("frost-text"),
		glass: light
			? alpha(v("surface"), 0.66)
			: alpha(v("surface-secondary"), 0.62),
		"glass-edge": light
			? "rgba(255, 255, 255, 0.95)"
			: "rgba(255, 255, 255, 0.14)",
		"heavy-ink": light ? "#4b32c2" : "#c9baff",
		"heavy-wash": light ? "#e6deff" : "#2a2440",
		mk: alpha(v("ember"), light ? 0.26 : 0.22),
		subtle: mix(v("muted"), v("background"), SUBTLE_FADE),
		"success-ink": ink("success"),
		"success-wash": wash("success"),
		"tab-on": alpha(v("accent"), light ? 0.12 : 0.16),
	};
}

const VAR_REF = /^var\(--([a-z0-9-]+)\)$/;

/** One variant's full palette: SHARED, then the theme's own, then DERIVED for what's left. */
export function buildVariant(
	name: string,
	mode: ThemeMode,
	own: Palette
): Palette {
	const base: Palette = { ...SHARED[mode], ...own };
	const resolve = (key: string, seen: string[] = []): string => {
		const value = base[key];
		if (value === undefined) {
			throw new Error(`${name}: derive needs --${key}, which it doesn't set`);
		}
		const ref = value.match(VAR_REF)?.[1];
		if (!ref) {
			return value;
		}
		if (seen.includes(ref)) {
			throw new Error(`${name}: var() loop at --${key}`);
		}
		return resolve(ref, [...seen, key]);
	};
	const full: Palette = { ...base };
	for (const [key, value] of Object.entries(derive(mode, (k) => resolve(k)))) {
		full[key] ??= value;
	}

	const missing = REQUIRED.filter((k) => full[k] === undefined);
	const unknown = Object.keys(full).filter((k) => !REQUIRED.includes(k));
	if (missing.length > 0) {
		throw new Error(
			`${name}: missing ${missing.map((k) => `--${k}`).join(", ")}`
		);
	}
	if (unknown.length > 0) {
		throw new Error(
			`${name}: unknown ${unknown.map((k) => `--${k}`).join(", ")}`
		);
	}
	return full;
}

function themeOf(id: string): ThemeEntry {
	const theme = THEME_BY_ID[id];
	if (!theme) {
		throw new Error(`themes: no theme "${id}"`);
	}
	return theme;
}

/** Every variant's palette, by Uniwind theme name. */
export function buildPalettes(): Record<string, Palette> {
	const out: Record<string, Palette> = {};
	for (const variant of VARIANTS) {
		const own = themeOf(variant.themeId)[variant.base];
		if (!own) {
			throw new Error(`${variant.name}: no ${variant.base} palette`);
		}
		out[variant.name] = buildVariant(variant.name, variant.base, own);
	}
	return out;
}

const THEMES_CSS_HEADER =
	"/* Generated by scripts/gen-themes.ts from src/design/themes.ts. Don't edit; run `bun run themes`. */";

/** src/themes/themes.generated.css: one `@variant` per theme and mode. */
export function renderThemesCss(): string {
	const palettes = buildPalettes();
	const blocks = VARIANTS.map((variant) => {
		const theme = themeOf(variant.themeId);
		const faces = FONT_PAIRS[theme.fonts];
		const lines = [
			...FONT_ROLES.map((r) => `\t\t\t--font-${r}: "${faces[r]}";`),
			...REQUIRED.map((k) => `\t\t\t--${k}: ${palettes[variant.name][k]};`),
		];
		return `\t\t/* ${theme.name}, ${variant.base} */\n\t\t@variant ${variant.name} {\n${lines.join("\n")}\n\t\t}`;
	});
	return `${THEMES_CSS_HEADER}\n@layer theme {\n\t:root {\n${blocks.join("\n\n")}\n\t}\n}\n`;
}

/** What Metro registers (`extraThemes`): every variant except Uniwind's own light and dark. */
export function renderThemeNames(): string {
	const names = VARIANTS.map((v) => v.name).filter(
		(n) => n !== "light" && n !== "dark"
	);
	return `${JSON.stringify(names, null, "\t")}\n`;
}
