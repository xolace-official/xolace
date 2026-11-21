import { api } from "@xolace/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import { useAppStore } from "@/store/store";
import { useOSReducedMotion } from "./os-reduced-motion";

export type MotionPreference = "system" | "reduced" | "full";

export function resolveMotionPreference(
	motionPreference: MotionPreference | undefined,
	reducedMotion: boolean | undefined
): MotionPreference {
	return motionPreference ?? (reducedMotion ? "reduced" : "system");
}

export function isReducedMotion(
	preference: MotionPreference,
	osReduceMotionEnabled: boolean
): boolean {
	if (preference === "system") {
		return osReduceMotionEnabled;
	}
	return preference === "reduced";
}

export const useEffectiveReducedMotion = (): boolean => {
	const { isAuthenticated } = useConvexAuth();
	const accountPending = useAppStore((s) => s.accountPending);
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
