import { useAuth } from "@clerk/expo";
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useSessionMode } from "@/context/session-mode-context";
import { usePaywall } from "@/features/purchases/use-paywall";
import { useLocalNow } from "@/lib/day-clock";
import { todayPhase } from "@/lib/day-phase";
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
	parseIntroDay,
	parseSeenStreak,
	type StreakShown,
	todayReady,
} from "./today-model";
import { useTodayActions } from "./use-today-actions";
import { useLowerModules, useModules } from "./use-today-modules";

const REFLECT = "/reflect";

const DOOR_HREF = {
	sit: "/sit-with-this?from=today",
	talk: "/talk",
	vent: "/voice-vent",
} as const satisfies Record<Door, string>;

const INTRO_KEY = "today-intro-day";
const STREAK_KEY = "today-seen-streak";

const keep = (key: string, value: object) =>
	zustandJSONStorage.setItem(key, JSON.stringify(value)).catch(() => undefined);

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

const MAX_TIMER_MS = 2 ** 31 - 1;

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

export function useTodayData(): Today {
	const summary = useProfileSummary();
	const { userId } = useAuth();
	const { isNight } = useSessionMode();
	const now = useLocalNow();
	const day = localDay(now);
	const phase = todayPhase(now.getHours(), isNight);
	const weekday = now.toLocaleDateString(undefined, { weekday: "long" });
	const { eyebrow, greeting } = headerCopy(
		phase,
		now.getHours(),
		weekday,
		summary?.displayName
	);
	const streak = useStreak(summary?.currentStreak, day, userId);
	const intro = useIntro(day, userId);
	const monthPrompt = useMonthPrompt(now);
	const { campfire, campfireSettled, kindling, kindlingEmpty } = useModules();
	const active = useQuery(api.sessions.getActive);
	const lower = useLowerModules();
	const moduleActions = useTodayActions();
	const { offer: rekindle, rekindle: spendSaver } = useRekindle();

	const pushOnce = usePushOnce();

	return {
		actions: {
			...moduleActions,
			openDoor: (door) => pushOnce(() => router.push(DOOR_HREF[door])),
			openHelp: () => router.push("/crisis-resources"),
			openKindling: () =>
				pushOnce(() => {
					playSoftPress();
					router.push("/kindling");
				}),
			openStreak: () => router.navigate("/you"),
			pressReflect: playSoftPress,
			rekindle: () => void spendSaver(),
			seeKindlingPlus: () =>
				pushOnce(() => {
					playSoftPress();
					usePaywall.getState().open("kindling");
				}),
			talkForKindling: () =>
				pushOnce(() => {
					playSoftPress();
					router.push(DOOR_HREF.talk);
				}),
		},
		state: {
			campfire,
			...lower,
			card: {
				mode: cardMode(active === null ? null : active?.state),
				monthPrompt,
				reflect: REFLECT,
			},
			day,
			eyebrow,
			greeting,
			intro,
			kindling,
			kindlingEmpty,
			phase,
			ready: todayReady({
				campfireSettled,
				kindling,
				kindlingEmpty,
				phase,
				rail: lower.rail,
				session: active,
				summary,
			}),
			rekindle,
			streak,
		},
	};
}
