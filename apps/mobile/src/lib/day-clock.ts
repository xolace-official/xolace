import { useEffect, useState } from "react";
import { useAppActive } from "@/components/shared/use-app-active";
import { useSessionMode } from "@/context/session-mode-context";
import { type DayPhase, nextWakeHour, todayPhase } from "@/lib/day-phase";

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
		next.setHours(nextWakeHour(now.getHours()), 0, 1, 0);
		const id = setTimeout(
			() => setNow(new Date()),
			next.getTime() - now.getTime()
		);
		return () => clearTimeout(id);
	}, [now]);
	return now;
}

export function useTodayPhase(): DayPhase {
	const { isNight } = useSessionMode();
	return todayPhase(useLocalNow().getHours(), isNight);
}
