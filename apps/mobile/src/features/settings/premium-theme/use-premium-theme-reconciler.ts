import { useEffect } from "react";
import type { ThemeName } from "uniwind";
import { setThemeWithFonts, targetTheme } from "@/design/fonts";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { planPremiumThemeReset } from "@/features/settings/premium-theme/premium-theme-reset";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useAppStore } from "@/store/store";

export function usePremiumThemeReconciler() {
	const { status } = usePlusEntitlement();
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
			plus: status,
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
	}, [status, colorThemeId, updatePreferences]);
}
