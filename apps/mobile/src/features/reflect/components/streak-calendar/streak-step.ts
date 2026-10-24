/**
 * What the mini calendar does with the streak it's handed, against the last
 * one the person saw. `undefined` is a streak not loaded yet: a fresh reflect
 * screen (the one a finished talk lands on, or a cold start) renders before
 * its context arrives. Read as 0, it looked like a break, the acknowledged
 * day dropped to 0, and the real streak then replayed the reveal.
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
