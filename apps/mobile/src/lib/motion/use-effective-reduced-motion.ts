import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { useAccessibilityInfo } from "@/helpers/hooks/use-accessability-info";

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

/** The one resolver every motion surface reads: stored tri-state plus the live OS flag. Full
 * motion while preferences load. */
export const useEffectiveReducedMotion = (): boolean => {
	const preferences = useQuery(api.preferences.get);
	const { reduceMotionEnabled } = useAccessibilityInfo();

	const preference = resolveMotionPreference(
		preferences?.motionPreference,
		preferences?.reducedMotion
	);

	return isReducedMotion(preference, reduceMotionEnabled);
};
