import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { useObserve } from "expo-observe";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useAppActive } from "@/components/shared/use-app-active";
import { useSessionMode } from "@/context/session-mode-context";
import { playSoftPress } from "@/lib/haptics";
import { useProfileSummary } from "@/lib/profile-summary";
import { zustandJSONStorage } from "@/lib/storage/unified-storage";
import { usePushOnce } from "@/lib/use-push-once";
import { useRekindle } from "./rekindle/use-rekindle";
import type { Today } from "./today-data";
import {
	cardMode,
	type Door,
	headerCopy,
	introDue,
	localDay,
	monthPromptOnCard,
	nextStreakShown,
	nextWakeHour,
	parseIntroDay,
	parseSeenStreak,
	type StreakShown,
	todayPhase,
} from "./today-model";
import { useTodayActions } from "./use-today-actions";
import { useLowerModules, useModules } from "./use-today-modules";

/** Reflect: Today's card and the toolbar's pill zoom into it. */
const REFLECT = "/reflect";

/**
 * Where each door goes. Sit with this from Today plays Three breaths on its own, outside
 * any session (`from=today`).
 */
const DOOR_HREF = {
	sit: "/sit-with-this?from=today",
	talk: "/talk",
	vent: "/voice-vent",
} as const satisfies Record<Door, string>;

/**
 * Device-only, per account (as `reflect-draft.ts`): the day the first open last played,
 * and the streak as Today last showed it. A record for another account counts as none.
 */
const INTRO_KEY = "today-intro-day";
const STREAK_KEY = "today-seen-streak";

const keep = (key: string, value: object) =>
	zustandJSONStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);

/**
 * The time Today keeps: re-read when the app comes to the front (timers sleep in the
 * background), when the next phase begins and at midnight while it's open.
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

/**
 * The streak and the key that ignites its flame, once a day, when it grew. Worked out
 * during render, so the chip gets the new count and the new key in the same render.
 */
function useStreak(
	count: number | undefined,
	day: string,
	userId: string | null | undefined
): Today["state"]["streak"] {
	const [shown, setShown] = useState<StreakShown | null>(null);
	const [toKeep, setToKeep] = useState<object | null>(null);
	const step = userId
		? nextStreakShown(shown, count, day, () =>
				parseSeenStreak(zustandJSONStorage.getItem(STREAK_KEY), userId)
			)
		: null;
	if (step) {
		setShown(step.shown);
		setToKeep({ ...step.keep, userId });
	}
	useEffect(() => {
		if (toKeep) {
			keep(STREAK_KEY, toKeep);
		}
	}, [toKeep]);
	return shown ? { count: shown.count, igniteKey: shown.igniteKey } : null;
}

/** Whether the first open plays: once a day per account, worked out again when the day turns. */
function useIntro(day: string, userId: string | null | undefined): boolean {
	const due = () =>
		Boolean(userId) &&
		introDue(
			parseIntroDay(zustandJSONStorage.getItem(INTRO_KEY), userId ?? ""),
			day
		);
	const [intro, setIntro] = useState(() => ({ day, due: due(), userId }));
	if (intro.day !== day || intro.userId !== userId) {
		setIntro({ day, due: due(), userId });
	}
	useEffect(() => {
		if (intro.due && intro.userId) {
			keep(INTRO_KEY, { day: intro.day, userId: intro.userId });
		}
	}, [intro]);
	return intro.due;
}

/** setTimeout's longest delay; a prompt's week is far shorter. */
const MAX_TIMER_MS = 2 ** 31 - 1;

/** This month's prompt on the card, gone the moment its week ends, even while Today stays open. */
function useMonthPrompt(now: Date): string | null {
	const carried = useQuery(api.monthlyEvents.prompt.getCarried);
	const [ended, setEnded] = useState(0);
	const until = carried?.carryUntil;
	useEffect(() => {
		const ms = until === undefined ? 0 : until - Date.now();
		if (until === undefined || ms <= 0 || ms > MAX_TIMER_MS) {
			return;
		}
		const id = setTimeout(() => setEnded(until), ms);
		return () => clearTimeout(id);
	}, [until]);
	return monthPromptOnCard(carried, Math.max(now.getTime(), ended));
}

/** Today in the app: the profile summary, the hour and night mode, and the device. */
export function useTodayData(): Today {
	const summary = useProfileSummary();
	const { markInteractive } = useObserve();
	// Per-route TTI: ready once the profile summary resolves, not at mount.
	useEffect(() => {
		if (summary !== undefined) {
			markInteractive();
		}
	}, [summary, markInteractive]);
	const { userId } = useAuth();
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
	const streak = useStreak(summary?.currentStreak, day, userId);
	const intro = useIntro(day, userId);
	const monthPrompt = useMonthPrompt(now);
	const { campfire, kindling } = useModules();
	// Reflect's open session, so the card can wait with your words or say the mirror is back.
	const active = useQuery(api.sessions.getActive);
	const lower = useLowerModules();
	const moduleActions = useTodayActions();
	const { offer: rekindle, rekindle: spendSaver } = useRekindle();

	// A double tap on a door or the kindling would stack two screens.
	const pushOnce = usePushOnce();

	return {
		actions: {
			...moduleActions,
			openDoor: (door) => pushOnce(() => router.push(DOOR_HREF[door])),
			openHelp: () => router.push("/crisis-resources"),
			// The header and Begin both open it: one screen per tap.
			openKindling: () =>
				pushOnce(() => {
					playSoftPress();
					router.push("/kindling");
				}),
			openStreak: () => router.navigate("/you"),
			pressReflect: playSoftPress,
			rekindle: () => void spendSaver(),
		},
		state: {
			campfire,
			...lower,
			card: {
				// undefined while loading, null with no session.
				mode: cardMode(active === null ? null : active?.state),
				monthPrompt,
				reflect: REFLECT,
			},
			day,
			eyebrow,
			greeting,
			intro,
			kindling,
			phase,
			rekindle,
			streak,
		},
	};
}
