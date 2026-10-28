/**
 * Single source of truth for all available themes.
 * Used by the Appearance screen, preview cards, and SessionModeProvider.
 */

import type { ThemeName } from "uniwind";

export type ThemeTier = "free" | "premium";

export type ThemeEntry = {
	id: string;
	name: string;
	tier: ThemeTier;
	/** Uniwind theme names; preview cards render inside a ScopedTheme of `dark`. */
	variants: { light: ThemeName; dark: ThemeName };
	/** Hidden from the picker (e.g. nightly — controlled by SessionModeProvider). */
	hiddenFromPicker?: boolean;
	/** false for premium stubs that have no CSS file yet. */
	available?: boolean;
};

const THEMES: ThemeEntry[] = [
	{
		id: "default",
		name: "Default",
		tier: "free",
		variants: { dark: "dark", light: "light" },
	},
	{
		id: "quiet",
		name: "Quiet Space",
		tier: "free",
		variants: { dark: "quiet-dark", light: "quiet-light" },
	},
	{
		id: "reverie",
		name: "Reverie",
		tier: "free",
		variants: { dark: "reverie-dark", light: "reverie-light" },
	},
	{
		id: "human",
		name: "Human Connection",
		tier: "free",
		variants: { dark: "human-dark", light: "human-light" },
	},
	{
		hiddenFromPicker: true,
		id: "nightly",
		name: "Nightly",
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
		tier: "premium",
		variants: { dark: "emerald-dark", light: "emerald-light" },
	},
	{
		id: "rose",
		name: "Rosé",
		tier: "premium",
		variants: { dark: "rose-dark", light: "rose-light" },
	},
	{
		id: "platinum",
		name: "Platinum",
		tier: "premium",
		variants: { dark: "platinum-dark", light: "platinum-light" },
	},
	{
		id: "velvet",
		name: "Velvet",
		tier: "premium",
		variants: { dark: "velvet-dark", light: "velvet-light" },
	},
	{
		id: "noir",
		name: "Noir",
		tier: "premium",
		variants: { dark: "noir-dark", light: "noir-light" },
	},
	{
		id: "playful",
		name: "Playful",
		tier: "premium",
		variants: { dark: "playful-dark", light: "playful-light" },
	},
];

export const FREE_THEMES = THEMES.filter(
	(t) => t.tier === "free" && !t.hiddenFromPicker
);
export const PREMIUM_THEMES = THEMES.filter((t) => t.tier === "premium");
export const THEME_BY_ID: Record<string, ThemeEntry> = Object.fromEntries(
	THEMES.map((t) => [t.id, t])
);
