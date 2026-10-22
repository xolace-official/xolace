/**
 * Single source of truth for all available themes.
 * Used by the Appearance screen, preview cards, and SessionModeProvider.
 */

export type ThemeTier = "free" | "premium";

export type ThemeEntry = {
	id: string;
	name: string;
	tier: ThemeTier;
	variants: { light: string; dark: string };
	/** Hex color values for inline-style preview cards (no CSS variable resolution needed). */
	preview: {
		bg: string;
		fg: string;
		accent: string;
		surface: string;
		border: string;
	};
	/** Hidden from the picker (e.g. nightly — controlled by SessionModeProvider). */
	hiddenFromPicker?: boolean;
	/** false for premium stubs that have no CSS file yet. */
	available?: boolean;
};

export const THEMES: ThemeEntry[] = [
	{
		id: "default",
		name: "Default",
		preview: {
			accent: "#b3a0e0",
			bg: "#19151f",
			border: "#2c273c",
			fg: "#ede9f5",
			surface: "#201c2e",
		},
		tier: "free",
		variants: { dark: "dark", light: "light" },
	},
	{
		id: "quiet",
		name: "Quiet Space",
		preview: {
			accent: "#6bbfc5",
			bg: "#0d1920",
			border: "#1c2d36",
			fg: "#f7fbfb",
			surface: "#141f28",
		},
		tier: "free",
		variants: { dark: "quiet-dark", light: "quiet-light" },
	},
	{
		id: "reverie",
		name: "Reverie",
		preview: {
			accent: "#bf7de0",
			bg: "#0f0b16",
			border: "#211530",
			fg: "#f8f5ff",
			surface: "#181022",
		},
		tier: "free",
		variants: { dark: "reverie-dark", light: "reverie-light" },
	},
	{
		id: "human",
		name: "Human Connection",
		preview: {
			accent: "#e87255",
			bg: "#1a1008",
			border: "#2e1c0a",
			fg: "#fbf8f5",
			surface: "#221508",
		},
		tier: "free",
		variants: { dark: "human-dark", light: "human-light" },
	},
	{
		hiddenFromPicker: true,
		id: "nightly",
		name: "Nightly",
		preview: {
			accent: "#8b7db8",
			bg: "#090810",
			border: "#1a1826",
			fg: "#dddaec",
			surface: "#100e1a",
		},
		tier: "free",
		variants: { dark: "nightly-dark", light: "nightly-light" },
	},
	// ── xolace+ premium themes ──────────────────────────────────────
	// Preview hexes are the theme's own dark-variant oklch tokens
	// (--background / --foreground / --accent / --surface / --border)
	// converted to sRGB, so the card matches what the theme actually renders.
	{
		id: "emerald",
		name: "Emerald",
		preview: {
			accent: "#00a461",
			bg: "#000201",
			border: "#13231b",
			fg: "#e9f1eb",
			surface: "#010a05",
		},
		tier: "premium",
		variants: { dark: "emerald-dark", light: "emerald-light" },
	},
	{
		id: "rose",
		name: "Rosé",
		preview: {
			accent: "#ef87ba",
			bg: "#080305",
			border: "#312128",
			fg: "#f5ebef",
			surface: "#180b11",
		},
		tier: "premium",
		variants: { dark: "rose-dark", light: "rose-light" },
	},
	{
		id: "platinum",
		name: "Platinum",
		preview: {
			accent: "#80abc5",
			bg: "#030609",
			border: "#232a2e",
			fg: "#ebeff2",
			surface: "#0c1316",
		},
		tier: "premium",
		variants: { dark: "platinum-dark", light: "platinum-light" },
	},
	{
		id: "velvet",
		name: "Velvet",
		preview: {
			accent: "#d33949",
			bg: "#060101",
			border: "#2f1c1c",
			fg: "#f5e8e6",
			surface: "#140505",
		},
		tier: "premium",
		variants: { dark: "velvet-dark", light: "velvet-light" },
	},
	{
		id: "noir",
		name: "Noir",
		preview: {
			accent: "#f3ba25",
			bg: "#010100",
			border: "#1e1a13",
			fg: "#f3eee3",
			surface: "#060402",
		},
		tier: "premium",
		variants: { dark: "noir-dark", light: "noir-light" },
	},
];

export const FREE_THEMES = THEMES.filter(
	(t) => t.tier === "free" && !t.hiddenFromPicker
);
export const PREMIUM_THEMES = THEMES.filter((t) => t.tier === "premium");
export const THEME_BY_ID: Record<string, ThemeEntry> = Object.fromEntries(
	THEMES.map((t) => [t.id, t])
);
