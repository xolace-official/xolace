import { usePremiumThemeReconciler } from "@/features/settings/premium-theme/use-premium-theme-reconciler";

/** Headless mount point for usePremiumThemeReconciler, rendered once from
 * RootProvider so the check runs app-wide. */
export function PremiumThemeReconciler() {
	usePremiumThemeReconciler();
	return null;
}
