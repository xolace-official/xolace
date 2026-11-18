import { findVariant, isPremiumTheme } from "@/design/themes";

export type PremiumThemeReset = {
	/** Drop the premium theme night mode stashed in `previousTheme`. */
	clearPreviousTheme: boolean;
	/** Base theme to re-apply, or null to leave the live theme alone. */
	applyBaseTheme: string | null;
};

/** True for a variant like `velvet-dark` whose theme is premium. */
function isPremiumVariant(variant: string | null): boolean {
	const theme = findVariant(variant)?.themeId;
	return theme !== undefined && isPremiumTheme(theme);
}

/** Pure decision for dropping a lapsed subscriber off a premium theme. Null
 * means do nothing (entitlement unresolved, still Plus, or not on a premium theme). */
export function planPremiumThemeReset(input: {
	isPlus: boolean;
	isResolved: boolean;
	colorThemeId: string;
	previousTheme: string | null;
	currentTheme: string;
	storedTheme: string;
}): PremiumThemeReset | null {
	// isPlus=false before the entitlement resolves is a loading default, not a lapse.
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
