import type { ThemeName } from "uniwind";
import {
	FREE_THEMES,
	PREMIUM_THEMES,
	type ThemeMode as Scheme,
	THEME_BY_ID,
	themeVariant,
} from "@/design/themes";
import type { PlusStatus } from "@/features/purchases/plus-status";
import { APPEARANCE_COPY as C } from "@/features/settings/appearance/copy";
import type { MotionPreference } from "@/lib/motion/use-effective-reduced-motion";
import type { ProfileCardId } from "@/store/store";

export type ThemeMode = "system" | "light" | "dark";

export function modeNote(mode: ThemeMode, osDark: boolean): string {
	return mode === "system" ? C.modeNote.system(osDark) : C.modeNote[mode];
}

export function modeTheme(
	mode: ThemeMode,
	colorThemeId: string
): ThemeName | "system" {
	return mode === "system" ? "system" : themeVariant(colorThemeId, mode);
}

export const pickMode = (mode: ThemeMode, scheme: Scheme): Scheme =>
	mode === "system" ? scheme : mode;

export function motionNote(pref: MotionPreference, osReduce: boolean): string {
	const lead = pref === "system" ? C.motionLead(osReduce) : "";
	const calmed = pref === "system" ? osReduce : pref === "reduced";
	if (calmed) {
		return lead + C.motionCalm;
	}
	return lead + (pref === "full" && osReduce ? C.motionOverride : C.motionFull);
}

export const PICKER_THEMES = [...FREE_THEMES, ...PREMIUM_THEMES];
const FIRST_PLUS = FREE_THEMES.length;

export type ThemeTap = "pick" | "locked" | "wait";

export function themeTap(id: string, plus: PlusStatus): ThemeTap {
	if (THEME_BY_ID[id]?.tier !== "premium" || plus === "plus") {
		return "pick";
	}
	return plus === "free" ? "locked" : "wait";
}

export type ThemeCard = {
	id: string;
	name: string;
	active: boolean;
	locked: boolean;
	tap: ThemeTap;
	firstPlus: boolean;
	a11y: string;
};

export function themeCards(activeId: string, plus: PlusStatus): ThemeCard[] {
	return PICKER_THEMES.map((t, i) => {
		const premium = t.tier === "premium";
		const tap = themeTap(t.id, plus);
		const locked = tap === "locked";
		return {
			a11y: C.themeA11y(t.name, premium, locked),
			active: t.id === activeId,
			firstPlus: i === FIRST_PLUS,
			id: t.id,
			locked,
			name: t.name,
			tap,
		};
	});
}

export function themeNote(activeId: string, plus: PlusStatus): string {
	if (plus === "free") {
		return C.themeNoteFree;
	}
	const theme = THEME_BY_ID[activeId] ?? THEME_BY_ID.default;
	return C.themeNote(theme.name, theme.tier === "premium");
}

export const STRIP = {
	cardH: 132,
	cardW: 112,
	divider: 20,
	gap: 12,
	inset: 16,
};
const PEEK = 30;
const IN_VIEW = 3;

export function stripStart(activeId: string): number {
	const i = PICKER_THEMES.findIndex((t) => t.id === activeId);
	if (i < IN_VIEW) {
		return 0;
	}
	const divider = i >= FIRST_PLUS ? STRIP.divider + STRIP.gap : 0;
	return STRIP.inset + i * (STRIP.cardW + STRIP.gap) + divider - PEEK;
}

export const hiddenCards = (
	server: readonly ProfileCardId[] | undefined,
	device: readonly ProfileCardId[]
): ProfileCardId[] => [...new Set([...(server ?? []), ...device])];

export type ProfileRow = { id: ProfileCardId; label: string; shown: boolean };

export const profileRows = (hidden: readonly ProfileCardId[]): ProfileRow[] =>
	C.cards.map((c) => ({ ...c, shown: !hidden.includes(c.id) }));

export const cardFlip = (
	id: ProfileCardId,
	show: boolean,
	device: readonly ProfileCardId[]
) => ({ forgetOnDevice: device.includes(id), hidden: !show });
