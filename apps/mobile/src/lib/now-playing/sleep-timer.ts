import { useSyncExternalStore } from "react";

/**
 * The player's sleep timer (handoff `player.md` §4). It lives with the now-playing track, not
 * the player screen, so it keeps counting after the player closes: the audio host ticks it and
 * pauses at 0, the player and the mini player read it. Stopping the track clears it; starting a
 * different track keeps it. Client only.
 */
export type SleepChoice = "off" | "end" | 15 | 30 | 45 | 60;

export type SleepTimer = {
	choice: SleepChoice;
	/** Seconds left on a timed choice; 0 otherwise. */
	left: number;
	/** The timer paused the track: the player says so until the next play. */
	slept: boolean;
};

/** The sound fades out over a timer's last 30 s. */
export const SLEEP_FADE_S = 30;
const MINUTE = 60;

export const SLEEP_OFF: SleepTimer = { choice: "off", left: 0, slept: false };

/** Picking a choice starts it afresh and forgets "Paused by". */
export const pickSleep = (choice: SleepChoice): SleepTimer => ({
	choice,
	left: typeof choice === "number" ? choice * MINUTE : 0,
	slept: false,
});

/** One second of play on a timed choice; at 0 the track pauses and the timer clears. */
export function tickSleep(t: SleepTimer): { next: SleepTimer; pause: boolean } {
	if (typeof t.choice !== "number") {
		return { next: t, pause: false };
	}
	const left = t.left - 1;
	return left <= 0
		? { next: { choice: "off", left: 0, slept: true }, pause: true }
		: { next: { ...t, left }, pause: false };
}

/** "End of track": the play reached its natural end, so the timer clears and says it paused. */
export const endOfTrack = (t: SleepTimer): SleepTimer =>
	t.choice === "end" ? { choice: "off", left: 0, slept: true } : t;

/** The playback gain: 1, falling to 0 over the last 30 s of a timed choice. Never the slider. */
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

/** The timer now, read once (an action's moment). */
export const sleepTimer = (): SleepTimer => timer;

export function setSleepTimer(next: SleepTimer) {
	if (next === timer) {
		return;
	}
	timer = next;
	emit();
}

/** A play clears "Paused by the sleep timer". */
export function clearSlept() {
	if (timer.slept) {
		setSleepTimer({ ...timer, slept: false });
	}
}

/** Stopping the track (the mini player's close, sign-out) clears the timer. */
export const resetSleepTimer = () => setSleepTimer(SLEEP_OFF);

/**
 * One value derived from the timer, re-rendering only when it changes: the pill's "28 min"
 * changes once a minute, so a reader of it doesn't render every second.
 */
export function useSleepTimer<T>(select: (t: SleepTimer) => T): T {
	const read = () => select(timer);
	return useSyncExternalStore(subscribe, read, read);
}

/** The whole timer, for the host that ticks it. */
export const useSleepTimerState = () =>
	useSyncExternalStore(subscribe, getTimer, getTimer);
