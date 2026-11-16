/** This app's `redesign-v2` gate (`shell-gate.ts`): PostHog's flag, with the dev
 * overrides kept on the device or set in the environment. */
import { posthog } from "@/config/posthog";
import {
	createShellGate,
	REDESIGN_V2_FLAG,
	type Shell,
} from "@/lib/redesign/shell-gate";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";

const STORED_KEY = "redesign-v2-override";

const isShell = (value: unknown): value is Shell =>
	value === "v1" || value === "v2";

/** The shell Account › Dev tools forces on this device, or null to follow the env var and
 * the flag. */
export function storedShell(): Shell | null {
	const value = zustandJSONStorage.getItem(STORED_KEY);
	return isShell(value) ? value : null;
}

/** Forces a shell on this device (dev builds only), or clears it. Applies from the next
 * launch, since the shell is frozen. */
export async function setStoredShell(shell: Shell | null): Promise<void> {
	if (shell) {
		await zustandJSONStorage.setItem(STORED_KEY, shell);
	} else {
		await zustandJSONStorage.removeItem(STORED_KEY);
	}
}

/**
 * This launch's shell: read the first time anything asks, then fixed until the
 * app restarts. The first ask comes from the `(protected)` layout, after sign-in,
 * by which point PostHog has its flags from the device or the network; a flag
 * not loaded by then counts as off for this launch. Never call it at module
 * scope: that would read before PostHog has loaded anything.
 *
 * Route shims switch on it (`currentShell() === "v2"`); v2 feature folders never
 * read it, since they only exist in the v2 shell.
 */
export const currentShell = createShellGate({
	dev: __DEV__,
	// Spelled out so Expo inlines it into the bundle.
	env: process.env.EXPO_PUBLIC_REDESIGN_V2,
	flag: () => posthog.getFeatureFlag(REDESIGN_V2_FLAG),
	stored: storedShell,
});
