/** Settings › Appearance: what each section says and what a tap does. Pure. */
import type { ThemeName } from "uniwind";
import {
	FREE_THEMES,
	PREMIUM_THEMES,
	type ThemeMode as Scheme,
	THEME_BY_ID,
	themeVariant,
} from "@/design/themes";
import { APPEARANCE_COPY as C } from "@/features/settings/appearance/copy";
import type { MotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import type { ProfileCardId } from "@/store/store";

/** The store's `theme`: the Mode choice. */
export type ThemeMode = "system" | "light" | "dark";

export function modeNote(mode: ThemeMode, osDark: boolean): string {
	return mode === "system" ? C.modeNote.system(osDark) : C.modeNote[mode];
}

/**
 * What Uniwind should draw for a Mode pick: System hands Uniwind "system"; Light or Dark draws
 * the saved colour theme in that mode. (Production read the theme on screen, so a pick made
 * while System drew Default lost the colour theme.)
 */
export function modeTheme(
	mode: ThemeMode,
	colorThemeId: string
): ThemeName | "system" {
	return mode === "system" ? "system" : themeVariant(colorThemeId, mode);
}

/** The mode a picked theme is drawn in: the stored one, or what System shows now. */
export const pickMode = (mode: ThemeMode, scheme: Scheme): Scheme =>
	mode === "system" ? scheme : mode;

/** Motion's one footnote: Match my phone leads with the phone's setting, then production's hint. */
export function motionNote(pref: MotionPreference, osReduce: boolean): string {
	const lead = pref === "system" ? C.motionLead(osReduce) : "";
	// `isReducedMotion`, whose module reaches Reanimated (no vitest here).
	const calmed = pref === "system" ? osReduce : pref === "reduced";
	if (calmed) {
		return lead + C.motionCalm;
	}
	return lead + (pref === "full" && osReduce ? C.motionOverride : C.motionFull);
}

/** The picker's themes, in the registry's order: the free ones, then the Plus ones. */
export const PICKER_THEMES = [...FREE_THEMES, ...PREMIUM_THEMES];
const FIRST_PLUS = FREE_THEMES.length;

export type ThemeCard = {
	id: string;
	name: string;
	active: boolean;
	locked: boolean;
	/** The divider with the sparkles mark goes before this card. */
	firstPlus: boolean;
	a11y: string;
};

export function themeCards(activeId: string, isPlus: boolean): ThemeCard[] {
	return PICKER_THEMES.map((t, i) => {
		const plus = t.tier === "premium";
		const locked = plus && !isPlus;
		return {
			a11y: C.themeA11y(t.name, plus, locked),
			active: t.id === activeId,
			firstPlus: i === FIRST_PLUS,
			id: t.id,
			locked,
			name: t.name,
		};
	});
}

export function themeNote(activeId: string, isPlus: boolean): string {
	if (!isPlus) {
		return C.themeNoteFree;
	}
	const theme = THEME_BY_ID[activeId] ?? THEME_BY_ID.default;
	return C.themeNote(theme.name, theme.tier === "premium");
}

/** A Plus theme on a free account opens the paywall and changes nothing. */
export const themeTap = (id: string, isPlus: boolean): "pick" | "locked" =>
	THEME_BY_ID[id]?.tier === "premium" && !isPlus ? "locked" : "pick";

/** The strip's measures (handoff §2): cards 112 wide, 12 apart, a 20 pt divider. */
export const STRIP = {
	cardH: 132,
	cardW: 112,
	divider: 20,
	gap: 12,
	inset: 16,
};
/** How far past a card's left edge the strip opens, so the one before it peeks in. */
const PEEK = 30;
/** The first three cards are in view at rest. */
const IN_VIEW = 3;

/** Opens with the active card in view (production's carousel starts on it), no measuring. */
export function stripStart(activeId: string): number {
	const i = PICKER_THEMES.findIndex((t) => t.id === activeId);
	if (i < IN_VIEW) {
		return 0;
	}
	const divider = i >= FIRST_PLUS ? STRIP.divider + STRIP.gap : 0;
	return STRIP.inset + i * (STRIP.cardW + STRIP.gap) + divider - PEEK;
}

/**
 * Hidden on the account (B7) or, from before B7, only on this device: either hides it.
 */
export const hiddenCards = (
	server: readonly ProfileCardId[] | undefined,
	device: readonly ProfileCardId[]
): ProfileCardId[] => [...new Set([...(server ?? []), ...device])];

export type ProfileRow = { id: ProfileCardId; label: string; shown: boolean };

export const profileRows = (hidden: readonly ProfileCardId[]): ProfileRow[] =>
	C.cards.map((c) => ({ ...c, shown: !hidden.includes(c.id) }));

/** Showing a card hidden only on this device clears it there too. */
export const cardFlip = (
	id: ProfileCardId,
	show: boolean,
	device: readonly ProfileCardId[]
) => ({ forgetOnDevice: device.includes(id), hidden: !show });
