/**
 * The root guard (`src/app/_layout.tsx`) as one pure decision: which route group is
 * open, or whether the app is still finding out. Exactly one group is open at a
 * time, so no input can leave someone with no screen or bounce them between two.
 */

/** The root layout's route groups, in the order someone passes through them. */
export const ROOT_GROUPS = [
	"(onboarding)",
	"(auth)",
	"(intake)",
	"(protected)",
] as const;

export type RootGroup = (typeof ROOT_GROUPS)[number];

export type RootGateInput = {
	/** Convex is still checking the Clerk token (`useConvexAuth().isLoading`). */
	authLoading: boolean;
	/** Convex accepted the token. A Clerk session Convex hasn't accepted is signed out. */
	authenticated: boolean;
	/** The promise was seen on this device (persisted, device-only). */
	introSeen: boolean;
	/**
	 * The profile's `onboardingComplete` from the gate query: `undefined` while the
	 * query is in flight (or skipped while signed out).
	 */
	onboardingComplete: boolean | undefined;
};

/** `loading` renders no routes, so nobody is shown a group a frame before it changes. */
export type RootGate = "loading" | RootGroup;

export function rootGate({
	authLoading,
	authenticated,
	introSeen,
	onboardingComplete,
}: RootGateInput): RootGate {
	if (authLoading) {
		return "loading";
	}
	if (!authenticated) {
		return introSeen ? "(auth)" : "(onboarding)";
	}
	// Signed in: the server, not the device, says whether intake is done, so an
	// existing account on a new phone goes straight in and never repeats intake.
	if (onboardingComplete === undefined) {
		return "loading";
	}
	return onboardingComplete ? "(protected)" : "(intake)";
}

/** `Stack.Protected`'s guard for one group: open only when the gate names it. */
export const isGroupOpen = (gate: RootGate, group: RootGroup) => gate === group;
