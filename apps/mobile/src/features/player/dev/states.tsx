/** The player on fixtures: `xolace://dev/player/<id>`. The handoff's renders (`player.md` §11,
 * numbered as they are) and the states the server can send: loading, gone, couldn't reach, a
 * spoken track with no peaks. `still` holds the board's time for a capture; the rest play on a
 * simulated clock. A scrub and the open menu need a finger: open the state before them. */
import type { DevState } from "@/dev/dev-state";
import { pickSleep } from "@/lib/now-playing/sleep-timer";
import { fixture } from "./fixture-player";
import { AT, HEAVY, MUSIC, NO_PEAKS, SPOKEN } from "./fixtures";

const SPOKEN_AT = { at: AT.spoken, track: SPOKEN } as const;
/** A seek that lands 1.5 s late, as a slow streamed one does (review round 1). On the line: the
 * waveform's release snap holds the playhead itself for most of a second, hiding the stale ticks. */
const SLOW_SEEK = { at: 60, seekLatencyMs: 1500, track: NO_PEAKS } as const;
/** The board's running timer: 30 minutes, 28 left; and its last 30 s. */
const TIMER = { ...pickSleep(30), left: 1680 };
const FADING = { ...pickSleep(30), left: 24 };

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{ id: "playing", title: "03 Playing, spoken", ...fixture(SPOKEN_AT) },
	{
		id: "playing-still",
		title: "03 Playing, spoken (clock held)",
		...fixture({ ...SPOKEN_AT, still: true }),
	},
	{
		id: "paused",
		title: "04 Paused: the cover at .88",
		...fixture({ ...SPOKEN_AT, paused: true }),
	},
	{
		id: "music",
		title: "06 Music: the line, attribution",
		...fixture({ at: AT.music, still: true, track: MUSIC }),
	},
	{
		id: "music-repeat",
		title: "07 Music, Repeat on: the length",
		...fixture({ at: AT.music, repeat: true, still: true, track: MUSIC }),
	},
	{
		id: "slow-seek",
		title: "Scrub, the seek landing 1.5 s late",
		...fixture(SLOW_SEEK),
	},
	{
		id: "slow-seek-unguarded",
		title: "Scrub, 1.5 s late, without the guard (the bug)",
		...fixture({ ...SLOW_SEEK, unguarded: true }),
	},
	{
		id: "timer",
		title: "09 A timer running: 28 min",
		...fixture({ ...SPOKEN_AT, sleep: TIMER, still: true }),
	},
	{
		id: "timer-fading",
		title: "10 The last 30 s (counts down)",
		...fixture({ ...SPOKEN_AT, sleep: FADING }),
	},
	{
		id: "timer-end",
		title: "11 Timer: End of track",
		...fixture({ ...SPOKEN_AT, sleep: pickSleep("end"), still: true }),
	},
	{
		id: "timer-ended",
		title: "12 Paused by the sleep timer",
		...fixture({
			...SPOKEN_AT,
			paused: true,
			sleep: { ...pickSleep("off"), slept: true },
		}),
	},
	{
		id: "crisis-line",
		title: "14 A tier-4 track: the crisis line",
		...fixture({ at: AT.heavy, still: true, track: HEAVY }),
	},
	{
		id: "no-peaks",
		title: "15 Spoken, no peaks yet: the line",
		...fixture({ ...SPOKEN_AT, still: true, track: NO_PEAKS }),
	},
	{
		id: "cant-reach",
		title: "16 Couldn’t reach: Try again",
		...fixture({ ...SPOKEN_AT, status: "error" }),
	},
	{
		id: "repeat",
		title: "17 Repeat on, spoken",
		...fixture({ ...SPOKEN_AT, repeat: true, still: true }),
	},
	{
		id: "loading",
		title: "Loading the track",
		...fixture({ status: "loading" }),
	},
	{
		id: "gone",
		title: "This one isn’t here anymore",
		...fixture({ status: "gone" }),
	},
];
