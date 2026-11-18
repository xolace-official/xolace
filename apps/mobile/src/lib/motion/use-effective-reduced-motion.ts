import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useAppStore } from "@/store/store";
import { useOSReducedMotion } from "./os-reduced-motion";

/** Tri-state motion preference: "system" follows the OS setting, "reduced" and "full" force it. */
export type MotionPreference = "system" | "reduced" | "full";

/** Resolves the stored preference, mapping the legacy `reducedMotion` boolean to "reduced" or
 * "system". */
export function resolveMotionPreference(
	motionPreference: MotionPreference | undefined,
	reducedMotion: boolean | undefined
): MotionPreference {
	return motionPreference ?? (reducedMotion ? "reduced" : "system");
}

/** Folds the stored preference and the live OS flag into the effective boolean. */
export function isReducedMotion(
	preference: MotionPreference,
	osReduceMotionEnabled: boolean
): boolean {
	if (preference === "system") {
		return osReduceMotionEnabled;
	}
	return preference === "reduced";
}

/** The one resolver every motion surface reads: stored tri-state plus the live OS flag. Signed
 * out (first run, the launch cover) and while preferences load, it follows the OS. */
export const useEffectiveReducedMotion = (): boolean => {
	const { isAuthenticated } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
	// preferences.get requires an account: skip it before sign-in, and while the seat waits
	// for `getOrCreate`, rather than throw.
	const preferences = useQuery(
		api.preferences.get,
		isAuthenticated && !accountPending ? {} : "skip"
	);
	const os = useOSReducedMotion();

	const preference = resolveMotionPreference(
		preferences?.motionPreference,
		preferences?.reducedMotion
	);

	return isReducedMotion(preference, os);
};
