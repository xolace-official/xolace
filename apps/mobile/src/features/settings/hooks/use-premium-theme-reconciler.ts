import { useEffect } from "react";
import { Uniwind } from "uniwind";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";
import { useAppStore } from "@/store/store";
import { planPremiumThemeReset } from "../premium-theme-reset";

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
			currentTheme: Uniwind.currentTheme,
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
			Uniwind.setTheme(plan.applyBaseTheme as never);
		}
	}, [isPlus, isResolved, colorThemeId, updatePreferences]);
}
