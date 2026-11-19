import { useEffect, useState } from "react";
import { useAppActive } from "@/components/shared/use-app-active";
import { useSessionMode } from "@/context/session-mode-context";
import { type DayPhase, nextWakeHour, todayPhase } from "@/lib/day-phase";

/**
 * The local time a screen keeps (Today, Explore): re-read when the app comes to the front
 * (timers sleep in the background), when the next phase begins and at midnight while it's open.
 */
export function useLocalNow(): Date {
	const active = useAppActive();
	const [now, setNow] = useState(() => new Date());
	useEffect(() => {
		if (!active) {
			return;
		}
		setNow(new Date());
	}, [active]);
	useEffect(() => {
		const next = new Date(now);
		// Hour 24 is the next midnight.
		next.setHours(nextWakeHour(now.getHours()), 0, 1, 0);
		const id = setTimeout(
			() => setNow(new Date()),
			next.getTime() - now.getTime()
		);
		return () => clearTimeout(id);
	}, [now]);
	return now;
}

/** Today's phase, for any screen that follows it (Explore's For the hour). */
export function useTodayPhase(): DayPhase {
	const { isNight } = useSessionMode();
	return todayPhase(useLocalNow().getHours(), isNight);
}
