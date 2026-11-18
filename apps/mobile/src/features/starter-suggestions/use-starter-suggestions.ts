import { useAppStore } from "@/store/store";
import { useAccountFlag } from "@/store/use-account-flag";

type Args = {
	/** Home is focused and no earlier link of the home sheet chain is up. */
	active: boolean;
	/** `profile.sessionCount` from getFullContext; undefined while loading. */
	sessionCount: number | undefined;
};

/** Last home sheet (#460): once per account, at zero sessions. Seen is set
 * only by an explicit resolve, so a kill brings it back. */
export function useStarterSuggestions({ active, sessionCount }: Args) {
	const [seen, markSeen] = useAccountFlag("starterSuggestionsSeen");

	// Dev tools override for simulator E2E (#465); the real gate is sessionCount.
	const devEligible = useAppStore((s) => __DEV__ && s.devStarterEligible);
	const zeroSessions =
		sessionCount === 0 || (devEligible && sessionCount !== undefined);

	const isOpen = active && !seen && zeroSessions;

	return { isOpen, resolve: markSeen };
}
