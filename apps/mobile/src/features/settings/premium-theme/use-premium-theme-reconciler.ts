import { useEffect } from "react";
import type { ThemeName } from "uniwind";
import { setThemeWithFonts, targetTheme } from "@/design/fonts";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { planPremiumThemeReset } from "@/features/settings/premium-theme/premium-theme-reset";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useAppStore } from "@/store/store";

/** Drops a lapsed subscriber off a premium theme. `colorThemeId` is re-applied
 * on cold start before the entitlement is known; `planPremiumThemeReset` decides. */
export function usePremiumThemeReconciler() {
	const { isPlus, isResolved } = usePlusEntitlement();
	const colorThemeId = useAppStore((s) => s.colorThemeId);
	const updatePreferences = usePreferenceMutation();

	useEffect(() => {
		const {
			theme: storedTheme,
			previousTheme,
			setColorThemeId,
			setPreviousTheme,
		} = useAppStore.getState();

		const plan = planPremiumThemeReset({
			colorThemeId,
			currentTheme: targetTheme(),
			isPlus,
			isResolved,
			previousTheme,
			storedTheme,
		});
		if (!plan) {
			return;
		}

		setColorThemeId("default");
		updatePreferences({ colorTheme: "default" });

		if (plan.clearPreviousTheme) {
			setPreviousTheme(null);
		}
		if (plan.applyBaseTheme !== null) {
			setThemeWithFonts(plan.applyBaseTheme as ThemeName | "system");
		}
	}, [isPlus, isResolved, colorThemeId, updatePreferences]);
}
