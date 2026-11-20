export type Alarm = {
	at: number;
	leg?: number;
	ring: () => void;
};

export const NEVER = Number.POSITIVE_INFINITY;

export const nextOf = (list: readonly Alarm[]) =>
	list.reduce((m, a) => Math.min(m, a.at), NEVER);

export function dueAt(list: readonly Alarm[], t: number) {
	const due = list.filter((a) => a.at <= t).sort((a, b) => a.at - b.at);
	const rest = list.filter((a) => a.at > t);
	return { due, next: nextOf(rest), rest };
}

export const withoutLeg = <T extends { leg?: number }>(
	list: readonly T[],
	i: number
): T[] => list.filter((x) => x.leg !== i);
