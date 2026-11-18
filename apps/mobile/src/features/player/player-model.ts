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

/** Which 30 s mark the finger is past: a selection tick each time it changes. */
export function tickIndex(f: number, duration: number, every: number): number {
	"worklet";
	return Math.floor((f * duration) / every);
}

const MINUTE = 60;

/** The pill: "28 min" while more than a minute is left, then "0:45"; "End of track". */
export function sleepPill(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return "";
	}
	if (t.choice === "end") {
		return PLAYER_COPY.sleepEnd;
	}
	if (t.left > MINUTE) {
		return `${Math.ceil(t.left / MINUTE)} min`;
	}
	return `0:${String(Math.max(0, t.left)).padStart(2, "0")}`;
}

/** "Sleep timer, off" / "Sleep timer, 28 minutes left" / "Sleep timer, end of track". */
export function sleepVoice(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return `${PLAYER_COPY.sleepTitle}, off`;
	}
	if (t.choice === "end") {
		return `${PLAYER_COPY.sleepTitle}, end of track`;
	}
	// Minutes, as the pill shows them, while more than a minute is left.
	const left = t.left > MINUTE ? Math.ceil(t.left / MINUTE) * MINUTE : t.left;
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
