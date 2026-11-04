import { shouldShowReflectTour } from "@/features/reflect-tour/tour-copy";
import { useAppStore } from "@/store/store";
import { useAccountFlag } from "@/store/use-account-flag";

type Args = {
	/** Home is focused and no earlier link of the home sheet chain is up. */
	active: boolean;
	/** `profile.sessionCount` from getFullContext; undefined while loading. */
	sessionCount: number | undefined;
};

/** Last home sheet (#460): once per account, at zero sessions, after the tour. Seen is set
 * only by an explicit resolve, so a kill brings it back. */
export function useStarterSuggestions({ active, sessionCount }: Args) {
	const [seen, markSeen] = useAccountFlag("starterSuggestionsSeen");
	// Live read, so it follows the tour on the same first run.
	const tourDone = useAppStore(
		(s) => !shouldShowReflectTour(s.reflectTourVersion)
	);

	// Dev tools override for simulator E2E (#465); the real gate is sessionCount.
	const devEligible = useAppStore((s) => __DEV__ && s.devStarterEligible);
	const zeroSessions =
		sessionCount === 0 || (devEligible && sessionCount !== undefined);

	const isOpen = active && tourDone && !seen && zeroSessions;

	return { isOpen, resolve: markSeen };
}
