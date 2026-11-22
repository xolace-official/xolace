import { useSyncExternalStore } from "react";

export type SleepChoice = "off" | "end" | 15 | 30 | 45 | 60;

export type SleepTimer = {
	choice: SleepChoice;
	left: number;
	slept: boolean;
};

export const SLEEP_FADE_S = 30;
const MINUTE = 60;

export const SLEEP_OFF: SleepTimer = { choice: "off", left: 0, slept: false };

export const pickSleep = (choice: SleepChoice): SleepTimer => ({
	choice,
	left: typeof choice === "number" ? choice * MINUTE : 0,
	slept: false,
});

export function tickSleep(
	t: SleepTimer,
	elapsed: number
): { next: SleepTimer; pause: boolean } {
	if (typeof t.choice !== "number" || elapsed <= 0) {
		return { next: t, pause: false };
	}
	const left = t.left - elapsed;
	return left <= 0
		? { next: { choice: "off", left: 0, slept: true }, pause: true }
		: { next: { ...t, left }, pause: false };
}

export const endOfTrack = (t: SleepTimer): SleepTimer =>
	t.choice === "end" ? { choice: "off", left: 0, slept: true } : t;

export function sleepGain(t: SleepTimer): number {
	if (typeof t.choice !== "number" || t.left > SLEEP_FADE_S) {
		return 1;
	}
	return Math.max(0, t.left / SLEEP_FADE_S);
}

let timer: SleepTimer = SLEEP_OFF;
const listeners = new Set<() => void>();
const emit = () => {
	for (const l of listeners) {
		l();
	}
};
function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}
const getTimer = () => timer;

export const sleepTimer = (): SleepTimer => timer;

export function setSleepTimer(next: SleepTimer) {
	if (next === timer) {
		return;
	}
	timer = next;
	emit();
}

export function clearSlept() {
	if (timer.slept) {
		setSleepTimer({ ...timer, slept: false });
	}
}

export const resetSleepTimer = () => setSleepTimer(SLEEP_OFF);

export function useSleepTimer<T>(select: (t: SleepTimer) => T): T {
	const read = () => select(timer);
	return useSyncExternalStore(subscribe, read, read);
}

export const useSleepTimerState = () =>
	useSyncExternalStore(subscribe, getTimer, getTimer);
