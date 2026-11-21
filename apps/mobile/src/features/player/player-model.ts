import type { PlusStatus } from "@/features/purchases/plus-status";
import type { SleepChoice, SleepTimer } from "@/lib/now-playing/sleep-timer";
import { SLEEP_FADE_S } from "@/lib/now-playing/sleep-timer";
import { PLAYER_COPY } from "./copy";
import { fmtVo } from "./player-format";

export type BoundTrackFields = {
	title: string;
	family: "support" | "music";
	narrators?: string[];
	peaks?: number[];
	durationSec: number;
	attributionText?: string;
	showCrisisLine: boolean;
	thumbUrl: string;
};

export type PlayerTrack = {
	title: string;
	label: string;
	coverUrl?: string;
	peaks: readonly number[] | null;
	durationSec: number;
	isMusic: boolean;
	attribution?: string;
	crisis: boolean;
};

export function trackLabel(
	family: BoundTrackFields["family"],
	narrators?: readonly string[]
): string {
	const kind = PLAYER_COPY.family[family];
	return family === "support" && narrators?.length
		? `${kind} · ${narrators.join(", ")}`
		: kind;
}

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

export function playerStatus(input: {
	plus: PlusStatus;
	error: boolean;
	track: unknown;
}): PlayerStatus {
	if (input.plus === "free") {
		return "gated";
	}
	if (input.plus === "loading") {
		return "loading";
	}
	if (input.error) {
		return "error";
	}
	if (input.track === undefined) {
		return "loading";
	}
	return input.track === null ? "gone" : "ready";
}

export const skipTarget = (position: number, by: number, duration: number) =>
	Math.max(0, Math.min(duration || position + by, position + by));

export function snapToBar(f: number, bars: number): number {
	"worklet";
	return bars > 0 ? Math.round(f * bars) / bars : f;
}

export const SEEK_SETTLE_MS = 3000;
const SEEK_LANDED_S = 1;

export type Seek = { to: number; at: number };

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

export function tickIndex(f: number, duration: number, every: number): number {
	"worklet";
	return Math.floor((f * duration) / every);
}

const MINUTE = 60;

export function sleepPill(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return "";
	}
	if (t.choice === "end") {
		return PLAYER_COPY.sleepEnd;
	}
	const left = Math.ceil(Math.max(0, t.left));
	if (left >= MINUTE) {
		return `${Math.ceil(left / MINUTE)} min`;
	}
	return `0:${String(left).padStart(2, "0")}`;
}

export function sleepVoice(t: Pick<SleepTimer, "choice" | "left">): string {
	if (t.choice === "off") {
		return `${PLAYER_COPY.sleepTitle}, off`;
	}
	if (t.choice === "end") {
		return `${PLAYER_COPY.sleepTitle}, end of track`;
	}
	const secs = Math.ceil(Math.max(0, t.left));
	const left = secs >= MINUTE ? Math.ceil(secs / MINUTE) * MINUTE : secs;
	return `${PLAYER_COPY.sleepTitle}, ${fmtVo(left)} left`;
}

export const sleepFading = (t: Pick<SleepTimer, "choice" | "left">) =>
	typeof t.choice === "number" && t.left <= SLEEP_FADE_S;

export const SLEEP_MENU: readonly { key: SleepChoice; label: string }[] = [
	{ key: "off", label: PLAYER_COPY.sleepOff },
	...PLAYER_COPY.sleepChoices,
];

export const showsLength = (track: PlayerTrack, repeat: boolean) =>
	track.isMusic && repeat;
