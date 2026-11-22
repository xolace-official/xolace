export const ROOT_GROUPS = ["(first-run)", "(intake)", "(protected)"] as const;

export type RootGroup = (typeof ROOT_GROUPS)[number];

export type RootGateInput = {
	authLoading: boolean;
	authenticated: boolean;
	onboardingComplete: boolean | undefined;
	seatHeld: boolean;
};

export type RootGate = "loading" | RootGroup;

export function rootGate({
	authLoading,
	authenticated,
	onboardingComplete,
	seatHeld,
}: RootGateInput): RootGate {
	if (seatHeld && !(authenticated && onboardingComplete === true)) {
		return "(first-run)";
	}
	if (authLoading) {
		return "loading";
	}
	if (!authenticated) {
		return "(first-run)";
	}
	if (onboardingComplete === undefined) {
		return "loading";
	}
	return onboardingComplete ? "(protected)" : "(intake)";
}

export const isGroupOpen = (gate: RootGate, group: RootGroup) => gate === group;
