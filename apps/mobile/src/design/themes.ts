import type { ThemeName } from "uniwind";
import { DEFAULT_FONT_PAIR, type FontPairId } from "./font-pairs";
import { PRODUCTION_PALETTES } from "./theme-values";

export type ThemeMode = "light" | "dark";
export type ThemeTier = "free" | "premium";

export type Palette = Record<string, string>;
export type ThemePalettes = { light: Palette; dark: Palette };

export type ThemeEntry = {
	id: string;
	name: string;
	tier: ThemeTier;
	fonts: FontPairId;
	light?: Palette;
	dark?: Palette;
	hiddenFromPicker?: boolean;
};

const DEFAULT: ThemePalettes = {
	dark: {
		accent: "#b7a3ff",
		"accent-foreground": "#0e0c15",
		"accent-ink": "#c9baff",
		"accent-wash": "#2a2440",
		backdrop: "rgba(0, 0, 0, 0.4)",
		background: "#0e0c15",
		border: "rgba(255, 255, 255, 0.08)",
		danger: "#ec7a66",
		"danger-foreground": "#0e0c15",
		"danger-ink": "#ec7a66",
		"danger-wash": "rgba(236, 122, 102, 0.14)",
		default: "#201c2b",
		"default-foreground": "#f3f0fa",
		eink: "#f5b04f",
		ember: "#f5b04f",
		"ember-ink": "#f5b04f",
		"ember-wash": "rgba(245, 176, 79, 0.14)",
		"field-background": "#201c2b",
		"field-foreground": "#f3f0fa",
		"field-shadow": "0 0 0 0 transparent inset",
		focus: "#b7a3ff",
		foreground: "#f3f0fa",
		frost: "#7fb0e8",
		"frost-text": "#7fb0e8",
		glass: "rgba(34, 30, 46, 0.62)",
		"glass-edge": "rgba(255, 255, 255, 0.14)",
		link: "#c9baff",
		mk: "rgba(245, 176, 79, 0.22)",
		muted: "#b0a9c2",
		overlay: "#17141f",
		"overlay-foreground": "#f3f0fa",
		"overlay-shadow": "0 0 1px 0 rgba(184, 169, 232, 0.08) inset",
		segment: "#201c2b",
		"segment-foreground": "#f3f0fa",
		separator: "rgba(255, 255, 255, 0.08)",
		subtle: "#8c85a0",
		success: "#5cc9a7",
		"success-foreground": "#0e0c15",
		"success-ink": "#5cc9a7",
		"success-wash": "rgba(92, 201, 167, 0.16)",
		surface: "#17141f",
		"surface-foreground": "#f3f0fa",
		"surface-secondary": "#201c2b",
		"surface-secondary-foreground": "#f3f0fa",
		"surface-shadow": "0 0 0 0 transparent inset",
		"surface-tertiary": "#29243a",
		"surface-tertiary-foreground": "#f3f0fa",
		"tab-on": "rgba(183, 163, 255, 0.16)",
		warning: "#f5b04f",
		"warning-foreground": "#0e0c15",
	},
	light: {
		accent: "#6b4ee6",
		"accent-foreground": "#ffffff",
		"accent-ink": "#4b32c2",
		"accent-wash": "#ece7ff",
		backdrop: "rgba(25, 21, 36, 0.18)",
		background: "#f7f5fb",
		border: "rgba(25, 21, 36, 0.09)",
		danger: "#d2533f",
		"danger-foreground": "#ffffff",
		"danger-ink": "#b8452f",
		"danger-wash": "#fcede8",
		default: "#f0edf7",
		"default-foreground": "#191524",
		eink: "#b8621e",
		ember: "#f2a33a",
		"ember-ink": "#8f5000",
		"ember-wash": "#fff1dc",
		"field-background": "#ffffff",
		"field-foreground": "#191524",
		"field-shadow":
			"0 1px 3px 0 rgba(60, 40, 80, 0.04), 0 0 1px 0 rgba(60, 40, 80, 0.06)",
		focus: "#6b4ee6",
		foreground: "#191524",
		frost: "#3f7cc4",
		"frost-text": "#3f7cc4",
		glass: "rgba(255, 255, 255, 0.66)",
		"glass-edge": "rgba(255, 255, 255, 0.95)",
		link: "#4b32c2",
		mk: "rgba(242, 163, 58, 0.26)",
		muted: "#5d576e",
		overlay: "#ffffff",
		"overlay-foreground": "#191524",
		"overlay-shadow":
			"0 4px 16px 0 rgba(60, 40, 80, 0.06), 0 -2px 8px 0 rgba(60, 40, 80, 0.02), 0 12px 24px 0 rgba(60, 40, 80, 0.04)",
		segment: "#ffffff",
		"segment-foreground": "#191524",
		separator: "rgba(25, 21, 36, 0.09)",
		subtle: "#6e6880",
		success: "#2f9e7e",
		"success-foreground": "#ffffff",
		"success-ink": "#1e7a61",
		"success-wash": "#e0f4ec",
		surface: "#ffffff",
		"surface-foreground": "#191524",
		"surface-secondary": "#f0edf7",
		"surface-secondary-foreground": "#191524",
		"surface-shadow":
			"0 2px 4px 0 rgba(60, 40, 80, 0.04), 0 1px 2px 0 rgba(60, 40, 80, 0.05), 0 0 1px 0 rgba(60, 40, 80, 0.05)",
		"surface-tertiary": "#e8e4f1",
		"surface-tertiary-foreground": "#191524",
		"tab-on": "rgba(107, 78, 230, 0.12)",
		warning: "#f2a33a",
		"warning-foreground": "#191524",
	},
};

const P = PRODUCTION_PALETTES;

export const THEMES: readonly ThemeEntry[] = [
	{
		fonts: "warm",
		id: "default",
		name: "Default",
		tier: "free",
		...DEFAULT,
	},
	{
		fonts: "clear",
		id: "quiet",
		name: "Quiet Space",
		tier: "free",
		...P.quiet,
	},
	{
		fonts: "warm",
		id: "reverie",
		name: "Reverie",
		tier: "free",
		...P.reverie,
	},
	{
		fonts: "warm",
		id: "human",
		name: "Human Connection",
		tier: "free",
		...P.human,
	},
	{
		fonts: "clear",
		id: "emerald",
		name: "Emerald",
		tier: "premium",
		...P.emerald,
	},
	{ fonts: "warm", id: "rose", name: "Rosé", tier: "premium", ...P.rose },
	{
		fonts: "clear",
		id: "platinum",
		name: "Platinum",
		tier: "premium",
		...P.platinum,
	},
	{
		fonts: "warm",
		id: "velvet",
		name: "Velvet",
		tier: "premium",
		...P.velvet,
	},
	{ fonts: "clear", id: "noir", name: "Noir", tier: "premium", ...P.noir },
	{
		fonts: "playful",
		id: "playful",
		name: "Playful",
		tier: "premium",
		...P.playful,
	},
	{
		dark: DEFAULT.dark,
		fonts: "warm",
		hiddenFromPicker: true,
		id: "nightly",
		light: P.nightly.light,
		name: "Night",
		tier: "free",
	},
];

export const THEME_BY_ID: Readonly<Record<string, ThemeEntry>> =
	Object.fromEntries(THEMES.map((t) => [t.id, t]));

export const FREE_THEMES = THEMES.filter(
	(t) => t.tier === "free" && !t.hiddenFromPicker
);
export const PREMIUM_THEMES = THEMES.filter((t) => t.tier === "premium");

export type ThemeVariant = {
	name: ThemeName;
	themeId: string;
	base: ThemeMode;
};

const MODES = ["light", "dark"] as const;

function variantName(id: string, mode: ThemeMode): string {
	return id === "default" ? mode : `${id}-${mode}`;
}

export const VARIANTS: readonly ThemeVariant[] = THEMES.flatMap((t) =>
	MODES.filter((mode) => t[mode]).map((mode) => ({
		base: mode,
		name: variantName(t.id, mode) as ThemeName,
		themeId: t.id,
	}))
);

const VARIANT_BY_NAME: Readonly<Record<string, ThemeVariant>> =
	Object.fromEntries(VARIANTS.map((v) => [v.name, v]));

export function findVariant(name: string | null): ThemeVariant | undefined {
	return name ? VARIANT_BY_NAME[name] : undefined;
}

export function themeVariant(id: string, mode: ThemeMode): ThemeName {
	return (
		findVariant(variantName(id, mode)) ??
		VARIANT_BY_NAME[variantName("default", mode)]
	).name;
}

export function oppositeVariant(name: ThemeName): ThemeName {
	const variant = findVariant(name);
	if (!variant) {
		return name;
	}
	const other = findVariant(
		variantName(variant.themeId, variant.base === "light" ? "dark" : "light")
	);
	return other?.name ?? name;
}

export const NIGHT_VARIANT: ThemeName = themeVariant("nightly", "dark");

export function isPremiumTheme(id: string): boolean {
	return THEME_BY_ID[id]?.tier === "premium";
}

export function variantFonts(name: string | null): FontPairId {
	const variant = findVariant(name);
	return variant
		? (THEME_BY_ID[variant.themeId]?.fonts ?? DEFAULT_FONT_PAIR)
		: DEFAULT_FONT_PAIR;
}
