import { useState } from "react";
import { keptAtMoment2 } from "./session-end-model";

/** `live` until moment 2 opens, then the value it had then (`keptAtMoment2`). */
export function useKeptAtMoment2<T>(moment: 1 | 2, live: T): T {
	const [kept, setKept] = useState<{ value: T } | null>(null);
	const next = keptAtMoment2(kept, moment, live);
	if (next !== kept) {
		setKept(next);
	}
	return next ? next.value : live;
}
