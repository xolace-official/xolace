/** A play counts as a listen once this much of it is heard (#697), or at the end of a shorter
 * track. */
const LISTEN_SEC = 60;
/** Leeway for status ticks: how far time may run ahead of the wall clock and still be heard,
 * and how short of the target a play may end (its last tick lands before the end). */
const TICK_SLACK_SEC = 2;
const MS_PER_SEC = 1000;
/** Convex resends a mutation through a dropped connection itself, so a rejection came from the
 * server. A few spaced tries ride out a bad moment without hammering a lasting error. */
const LISTEN_RETRIES = 3;
const LISTEN_RETRY_MS = 5000;

/** One play of the loaded track, and the player status it last saw. */
export type ListenTracker = {
	heard: number;
	logged: boolean;
	lastTime: number;
	/** Wall clock at the last tick; undefined before the first. */
	lastAt?: number;
	wasPlaying: boolean;
	finished: boolean;
	laps: number;
};

/** The player status `usePlayback` reports, plus the wall clock it was read at. */
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

/**
 * Feed one status tick. `logNow` is true on the tick a play first counts as a listen. Pausing
 * and resuming stays the same play, and so does looping; a natural finish closes it, so a
 * replay can log again. Time only counts while playing and no faster than the wall clock, so
 * a seek isn't listening but a late tick from a locked screen is.
 */
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

/**
 * Send a play's one listen, trying again if the server rejects it. Not a reset of `logged`: a
 * play that counts on its finish tick has already zeroed the tracker, so nothing would resend.
 * Keeps going after the player unmounts, since the listen already happened, but only while
 * `sameAccount` holds: the client sends as whoever is signed in now, and a retry after a switch
 * would credit the play to them.
 */
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
