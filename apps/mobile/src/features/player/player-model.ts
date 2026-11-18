import type { SleepChoice, SleepTimer } from "@/lib/now-playing/sleep-timer";
import { SLEEP_FADE_S } from "@/lib/now-playing/sleep-timer";
import { PLAYER_COPY } from "./copy";
import { fmtVo } from "./player-format";

/** What `paths.getBoundAudioTrack` returns that the player draws (its `returns` validator). */
export type BoundTrackFields = {
	title: string;
	family: "support" | "music";
	narrators?: string[];
	/** 60 numbers 0–1 (B4); absent until measured, and never on music. */
	peaks?: number[];
	durationSec: number;
	attributionText?: string;
	showCrisisLine: boolean;
	thumbUrl: string;
};

/** The track as the player shows it. */
export type PlayerTrack = {
	title: string;
	/** "Support audio · Sage"; music is just "Music". */
	label: string;
	coverUrl?: string;
	/** The waveform's bars, or null for the line (music, or no peaks yet). */
	peaks: readonly number[] | null;
	durationSec: number;
	isMusic: boolean;
	attribution?: string;
	/** A tier-4 track: the quiet crisis line instead of the attribution. */
	crisis: boolean;
};

/** "SUPPORT AUDIO · SAGE": the kind, then the narrators. */
export function trackLabel(
	family: BoundTrackFields["family"],
	narrators?: readonly string[]
): string {
	const kind = PLAYER_COPY.family[family];
	return family === "support" && narrators?.length
		? `${kind} · ${narrators.join(", ")}`
		: kind;
}

/** Spoken tracks with peaks draw the waveform; music and peak-less tracks draw the line. */
const waveformPeaks = (
	t: Pick<BoundTrackFields, "family" | "peaks">
): readonly number[] | null =>
	t.family === "support" && t.peaks && t.peaks.length > 0 ? t.peaks : null;

export function toPlayerTrack(t: BoundTrackFields): PlayerTrack {
	return {
		attribution: t.attributionText || undefined,
		coverUrl: t.thumbUrl || undefined,
		crisis: t.showCrisisLine,
		durationSec: t.durationSec,
		isMusic: t.family === "music",
		label: trackLabel(t.family, t.narrators),
		peaks: waveformPeaks(t),
		title: t.title,
	};
}

export type PlayerStatus = "gated" | "loading" | "gone" | "error" | "ready";

/** Free listeners never see the player (the paywall replaces it); then the load. */
export function playerStatus(input: {
	gated: boolean;
	error: boolean;
	/** undefined while loading, null when the track is gone. */
	track: unknown;
}): PlayerStatus {
	if (input.gated) {
		return "gated";
	}
	if (input.error) {
		return "error";
	}
	if (input.track === undefined) {
		return "loading";
	}
	return input.track === null ? "gone" : "ready";
}

/** Back or forward 15 s, kept inside the track. */
export const skipTarget = (position: number, by: number, duration: number) =>
	Math.max(0, Math.min(duration || position + by, position + by));

/** A waveform release settles on the start of the nearest bar. */
export function snapToBar(f: number, bars: number): number {
	"worklet";
	return bars > 0 ? Math.round(f * bars) / bars : f;
}

/** How long a seek's target stands in for the reported time at most. A streamed (R2) seek can
 * take a second or two to report; past this, the clock wins even if it never landed. */
export const SEEK_SETTLE_MS = 3000;
/** The clock within this of a seek's target: the seek has landed. */
const SEEK_LANDED_S = 1;

/** The last seek asked for: where to, and when (ms). */
export type Seek = { to: number; at: number };

/**
 * Where the playhead is. A streamed seek reports late, so until the clock comes within 1 s of
 * its target (or 3 s pass) the target stands in: the playhead doesn't flick back after a
 * scrub, and quick skips in a row step on from where the previous one went.
 */
export function settledPosition(
	position: number,
	seek: Seek | null,
	now: number
): number {
	if (
		!seek ||
		now - seek.at >= SEEK_SETTLE_MS ||
		Math.abs(position - seek.to) <= SEEK_LANDED_S
	) {
		return position;
	}
	return seek.to;
}

/** Which 30 s mark the finger is past: a selection tick each time it changes. */
export function tickIndex(f: number, duration: number, every: number): number {
	"worklet";
	return Math.floor((f * duration) / every);
}

const MINUTE = 60;

/** The pill: "28 min" while a minute or more is left, then "0:45"; "End of track". */
export function sleepPill(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return "";
	}
	if (t.choice === "end") {
		return PLAYER_COPY.sleepEnd;
	}
	// Whole seconds, rounded up: the timer counts real (fractional) play time.
	const left = Math.ceil(Math.max(0, t.left));
	if (left >= MINUTE) {
		return `${Math.ceil(left / MINUTE)} min`;
	}
	return `0:${String(left).padStart(2, "0")}`;
}

/** "Sleep timer, off" / "Sleep timer, 28 minutes left" / "Sleep timer, end of track". */
export function sleepVoice(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return `${PLAYER_COPY.sleepTitle}, off`;
	}
	if (t.choice === "end") {
		return `${PLAYER_COPY.sleepTitle}, end of track`;
	}
	// Minutes, as the pill shows them, while a minute or more is left.
	const secs = Math.ceil(Math.max(0, t.left));
	const left = secs >= MINUTE ? Math.ceil(secs / MINUTE) * MINUTE : secs;
	return `${PLAYER_COPY.sleepTitle}, ${fmtVo(left)} left`;
}

/** The last 30 s of a timed choice: the pill dims while the sound fades. */
export const sleepFading = (t: Pick<SleepTimer, "choice" | "left">) =>
	typeof t.choice === "number" && t.left <= SLEEP_FADE_S;

/** The menu's choices, in order: Off, the four times, then (after a divider) End of track. */
export const SLEEP_MENU: readonly { key: SleepChoice; label: string }[] = [
	{ key: "off", label: PLAYER_COPY.sleepOff },
	...PLAYER_COPY.sleepChoices,
];

/** With music on Repeat the right end shows the length; otherwise the time left. */
export const showsLength = (track: PlayerTrack, repeat: boolean) =>
	track.isMusic && repeat;
