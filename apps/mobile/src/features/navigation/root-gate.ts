export const ROOT_GROUPS = [
	"(first-run)",
	"(intake)",
	"(protected)",
	"(cant-reach)",
] as const;

export type RootGroup = (typeof ROOT_GROUPS)[number];

export type RootGateInput = {
	authLoading: boolean;
	authenticated: boolean;
	/** The connection model's `cantReachXolace` flag. */
	cantReachXolace: boolean;
	onboardingComplete: boolean | undefined;
	/** Crisis resources opened from the can't-reach message are on screen. */
	readingHelp: boolean;
	seatHeld: boolean;
};

export type RootGate = "loading" | RootGroup;

/** Which group is open, before the connection is taken into account. */
function settledGate({
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

/**
 * The one group open at the root. Still loading while Xolace can't be reached (an offline cold
 * start: Convex can't confirm the token) opens `(cant-reach)`, the end-of-loading message with
 * its way to crisis resources, instead of a spinner that never stops. Once someone has opened
 * crisis resources from it, the gate waits for them to come back to the message before it moves
 * on, so a returning connection never pulls a crisis line out from under them.
 */
export function rootGate(input: RootGateInput): RootGate {
	if (input.readingHelp) {
		return "(cant-reach)";
	}
	const gate = settledGate(input);
	return gate === "loading" && input.cantReachXolace ? "(cant-reach)" : gate;
}

export const isGroupOpen = (gate: RootGate, group: RootGroup) => gate === group;
