const LISTEN_SEC = 60;
const TICK_SLACK_SEC = 2;
const MS_PER_SEC = 1000;
/** Convex resends a mutation through a dropped connection itself, so a rejection came from the
 * server. */
const LISTEN_RETRIES = 3;
const LISTEN_RETRY_MS = 5000;

export type ListenTracker = {
	heard: number;
	logged: boolean;
	lastTime: number;
	lastAt?: number;
	wasPlaying: boolean;
	finished: boolean;
	laps: number;
};

export type PlayerTick = {
	currentTime: number;
	durationSec: number;
	playing: boolean;
	didJustFinish: boolean;
	laps: number;
	now: number;
};

export const startListen = (): ListenTracker => ({
	finished: false,
	heard: 0,
	laps: 0,
	lastTime: 0,
	logged: false,
	wasPlaying: false,
});

export function tickListen(
	tracker: ListenTracker,
	tick: PlayerTick
): { tracker: ListenTracker; logNow: boolean } {
	const delta = tick.currentTime - tracker.lastTime;
	const elapsedSec =
		tracker.lastAt === undefined ? 0 : (tick.now - tracker.lastAt) / MS_PER_SEC;
	const heardNow =
		tracker.wasPlaying &&
		tick.playing &&
		delta > 0 &&
		delta <= elapsedSec + TICK_SLACK_SEC;
	const heard = heardNow ? tracker.heard + delta : tracker.heard;

	const justFinished = tick.didJustFinish && !tracker.finished;
	const atEnd = justFinished || tick.laps > tracker.laps;
	const target =
		tick.durationSec > 0 ? Math.min(LISTEN_SEC, tick.durationSec) : LISTEN_SEC;
	const reached =
		heard >= target || (atEnd && heard >= target - TICK_SLACK_SEC);
	const logNow = !tracker.logged && reached;

	const seen = {
		finished: tick.didJustFinish,
		laps: tick.laps,
		lastAt: tick.now,
		lastTime: tick.currentTime,
		wasPlaying: tick.playing,
	};
	return {
		logNow,
		tracker: justFinished
			? { ...seen, heard: 0, logged: false }
			: { ...seen, heard, logged: tracker.logged || logNow },
	};
}

export function sendListen(
	send: () => Promise<unknown>,
	sameAccount: () => boolean,
	retriesLeft = LISTEN_RETRIES
): void {
	send().catch((e) => {
		console.error("[listen-tracker] recordListen failed:", e);
		if (retriesLeft > 0) {
			setTimeout(() => {
				if (sameAccount()) {
					sendListen(send, sameAccount, retriesLeft - 1);
				}
			}, LISTEN_RETRY_MS);
		}
	});
}
