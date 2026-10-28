import { usePremiumThemeReconciler } from "./hooks/use-premium-theme-reconciler";

/** Headless mount point for usePremiumThemeReconciler, rendered once from
 * RootProvider so the check runs app-wide. */
export function PremiumThemeReconciler() {
	usePremiumThemeReconciler();
	return null;
}
