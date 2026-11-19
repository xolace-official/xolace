/**
 * Something the tend does later (a spark landing, a finished burn dropping, the embers going out),
 * due at a time on the trail clock rather than the wall clock. The trail clock stops while the
 * screen is away or the app is in the background, so an alarm waits too and rings on return,
 * where it can be seen and felt.
 */
export type Alarm = {
	/** Trail-clock seconds. */
	at: number;
	/** The tended stop it belongs to, so a refused tend can take back what it still had to do. */
	leg?: number;
	ring: () => void;
};

export const NEVER = Number.POSITIVE_INFINITY;

/** The soonest alarm, or NEVER. */
export const nextOf = (list: readonly Alarm[]) =>
	list.reduce((m, a) => Math.min(m, a.at), NEVER);

/** The alarms due at clock `t`, soonest first, and the ones still to come. */
export function dueAt(list: readonly Alarm[], t: number) {
	const due = list.filter((a) => a.at <= t).sort((a, b) => a.at - b.at);
	const rest = list.filter((a) => a.at > t);
	return { due, next: nextOf(rest), rest };
}

/** Everything belonging to tended stop `i` taken out: its burn, its arrival, its drop. */
export const withoutLeg = <T extends { leg?: number }>(
	list: readonly T[],
	i: number
): T[] => list.filter((x) => x.leg !== i);
