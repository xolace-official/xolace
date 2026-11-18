import { useEffect, useState } from "react";
import { SLOW_MS } from "../reflect-model";

/** True once a wait has run `SLOW_MS` (10 s): the wait offers to step away. */
export function useWaitClock(waiting: boolean): boolean {
	const [slow, setSlow] = useState(false);
	useEffect(() => {
		if (!waiting) {
			setSlow(false);
			return;
		}
		const t = setTimeout(() => setSlow(true), SLOW_MS);
		return () => clearTimeout(t);
	}, [waiting]);
	return slow;
}
