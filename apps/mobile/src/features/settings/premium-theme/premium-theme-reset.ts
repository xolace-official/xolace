import { findVariant, isPremiumTheme } from "@/design/themes";

export type PremiumThemeReset = {
	clearPreviousTheme: boolean;
	applyBaseTheme: string | null;
};

function isPremiumVariant(variant: string | null): boolean {
	const theme = findVariant(variant)?.themeId;
	return theme !== undefined && isPremiumTheme(theme);
}

export function planPremiumThemeReset(input: {
	isPlus: boolean;
	isResolved: boolean;
	colorThemeId: string;
	previousTheme: string | null;
	currentTheme: string;
	storedTheme: string;
}): PremiumThemeReset | null {
	if (!input.isResolved || input.isPlus) {
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
