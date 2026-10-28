/**
 * The mini calendar's step for a streak. `undefined` is not loaded; as 0 it replayed the reveal.
 */
export type StreakStep = "wait" | "reset" | "reveal" | "settled";

export function streakStep(
	streak: number | undefined,
	acknowledged: number
): StreakStep {
	if (streak === undefined) {
		return "wait";
	}
	// A break (or the first sync after install): taken silently.
	if (streak < acknowledged) {
		return "reset";
	}
	if (streak > acknowledged && streak > 0) {
		return "reveal";
	}
	return "settled";
}
