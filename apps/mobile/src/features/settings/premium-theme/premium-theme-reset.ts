import { findVariant, isPremiumTheme } from "@/design/themes";
import type { PlusStatus } from "@/features/purchases/plus-status";

export type PremiumThemeReset = {
	clearPreviousTheme: boolean;
	applyBaseTheme: string | null;
};

function isPremiumVariant(variant: string | null): boolean {
	const theme = findVariant(variant)?.themeId;
	return theme !== undefined && isPremiumTheme(theme);
}

export function planPremiumThemeReset(input: {
	plus: PlusStatus;
	colorThemeId: string;
	previousTheme: string | null;
	currentTheme: string;
	storedTheme: string;
}): PremiumThemeReset | null {
	if (input.plus !== "free") {
		return null;
	}
	if (!isPremiumTheme(input.colorThemeId)) {
		return null;
	}

	return {
		applyBaseTheme: isPremiumVariant(input.currentTheme)
			? input.storedTheme
			: null,
		clearPreviousTheme: isPremiumVariant(input.previousTheme),
	};
}
