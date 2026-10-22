import { shouldShowReflectTour } from "@/src/features/reflect/tour-copy";
import { useAppStore } from "@/src/store/store";

type Args = {
	/** Home is focused and no earlier link of the home sheet chain is up. */
	active: boolean;
	/** `profile.sessionCount` from getFullContext; undefined while loading. */
	sessionCount: number | undefined;
};

/**
 * Last link of the home sheet chain (#460). Offered once, to a user with zero
 * sessions, after the Reflect tour has resolved. The server's sessionCount is
 * the cross-device gate; the seen flag is device-local and set only by an
 * explicit resolve, so a background or kill while open brings it back.
 */
export function useStarterSuggestions({ active, sessionCount }: Args) {
	const seen = useAppStore((s) => s.starterSuggestionsSeen);
	const setSeen = useAppStore((s) => s.setStarterSuggestionsSeen);
	// Live read, unlike the awareness sheet's mount snapshot: this is meant to
	// follow the tour on the same first run.
	const tourDone = useAppStore(
		(s) => !shouldShowReflectTour(s.reflectTourVersion)
	);

	// Dev tools override for simulator E2E (#465); the real gate is sessionCount.
	const devEligible = useAppStore((s) => __DEV__ && s.devStarterEligible);
	const zeroSessions =
		sessionCount === 0 || (devEligible && sessionCount !== undefined);

	const isOpen = active && tourDone && !seen && zeroSessions;

	return { isOpen, resolve: () => setSeen(true) };
}
