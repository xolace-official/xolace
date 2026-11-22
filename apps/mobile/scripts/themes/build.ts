import { FONT_PAIRS, FONT_ROLES } from "../../src/design/font-pairs";
import {
	type Palette,
	THEME_BY_ID,
	type ThemeEntry,
	type ThemeMode,
	VARIANTS,
} from "../../src/design/themes";
import { alpha, mix } from "./color";

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

export function renderThemeNames(): string {
	const names = VARIANTS.map((v) => v.name).filter(
		(n) => n !== "light" && n !== "dark"
	);
	return `${JSON.stringify(names, null, "\t")}\n`;
}
