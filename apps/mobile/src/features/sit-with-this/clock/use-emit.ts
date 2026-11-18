import { useEffect, useRef, useState } from "react";
import type { ClockEvents } from "./clock-config";

/**
 * One stable function per clock event, each calling the latest handler: the
 * frame callback captures them once and never re-registers.
 */
export function useEmit(events: ClockEvents): ClockEvents {
	const latest = useRef(events);
	useEffect(() => {
		latest.current = events;
	});
	const [emit] = useState<ClockEvents>(() => ({
		beatEnd: (s) => latest.current.beatEnd(s),
		doneReady: (s) => latest.current.doneReady(s),
		linkReady: () => latest.current.linkReady(),
		phase: (...a) => latest.current.phase(...a),
		pulse: (s) => latest.current.pulse(s),
	}));
	return emit;
}
