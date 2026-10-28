import { usePremiumThemeReconciler } from "./hooks/use-premium-theme-reconciler";

/**
 * Headless mount point for usePremiumThemeReconciler.
 * Rendered once from RootProvider (inside RevenueCatProvider + Convex) so the
 * check runs app-wide, not only while the Appearance screen is open.
 */
export function PremiumThemeReconciler() {
	usePremiumThemeReconciler();
	return null;
}
