import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAppActive } from "@/components/shared/use-app-active";
import { useSessionMode } from "@/context/session-mode-context";
import { playSoftPress } from "@/lib/haptics";
import { useProfileSummary } from "@/lib/profile-summary";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import type { Today } from "./today-data";
import {
	headerCopy,
	introDue,
	localDay,
	nextPhaseHour,
	type SeenStreak,
	streakStep,
	todayPhase,
} from "./today-model";

/** Device-only: the day the first open last played, and the streak as last shown. */
const INTRO_KEY = "today-intro-day";
const STREAK_KEY = "today-seen-streak";

function readSeen(): SeenStreak | null {
	try {
		const raw = zustandJSONStorage.getItem(STREAK_KEY);
		return raw ? (JSON.parse(raw) as SeenStreak) : null;
	} catch {
		return null;
	}
}

/**
 * The time Today keeps: re-read when the app comes to the front (timers sleep in the
 * background) and when the next phase begins while it's open.
 */
function useNow(): Date {
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
		next.setHours(nextPhaseHour(now.getHours()), 0, 1, 0);
		if (next <= now) {
			next.setDate(next.getDate() + 1);
		}
		const id = setTimeout(
			() => setNow(new Date()),
			next.getTime() - now.getTime()
		);
		return () => clearTimeout(id);
	}, [now]);
	return now;
}

/** The streak and the key that ignites its flame, once a day, when it grew. */
function useStreak(count: number | undefined, day: string) {
	const [igniteKey, setIgniteKey] = useState(0);
	useEffect(() => {
		if (count === undefined) {
			return;
		}
		const { ignite, next } = streakStep(readSeen(), count, day);
		zustandJSONStorage
			.setItem(STREAK_KEY, JSON.stringify(next))
			.catch(() => undefined);
		if (ignite) {
			setIgniteKey((k) => k + 1);
		}
	}, [count, day]);
	return count === undefined ? null : { count, igniteKey };
}

/** Today in the app: the profile summary, the hour and night mode, and the device. */
export function useTodayData(): Today {
	const summary = useProfileSummary();
	const { isNight } = useSessionMode();
	const now = useNow();
	const day = localDay(now);
	const phase = todayPhase(now.getHours(), isNight);
	const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
	const { eyebrow, greeting } = headerCopy(
		phase,
		weekday,
		summary?.displayName
	);
	const streak = useStreak(summary?.currentStreak, day);

	// Read once per mount: the first open of the day plays, then never again that day.
	const [intro] = useState(() =>
		introDue(zustandJSONStorage.getItem(INTRO_KEY), day)
	);
	useEffect(() => {
		if (intro) {
			zustandJSONStorage.setItem(INTRO_KEY, day).catch(() => undefined);
		}
	}, [intro, day]);

	return {
		actions: {
			openHelp: () => router.push("/crisis-resources"),
			openReflect: () => {
				playSoftPress();
				router.dismissTo("/");
			},
			openStreak: () => router.navigate("/you"),
		},
		state: { eyebrow, greeting, intro, phase, streak },
	};
}
