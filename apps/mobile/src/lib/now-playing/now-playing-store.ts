import type { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { PostHog } from "posthog-react-native";
import { useSyncExternalStore } from "react";
import type { PlaybackReturn } from "@/lib/audio/use-playback";
import { armPlayOnLoad, takePlayOnLoad } from "@/lib/now-playing/play-on-load";
import { clearSlept, resetSleepTimer } from "@/lib/now-playing/sleep-timer";

export type BoundTrack = NonNullable<
	FunctionReturnType<typeof api.paths.getBoundAudioTrack>
>;

export type BrowseFrom =
	| "hub-new"
	| "family-list"
	| "topic"
	| "discovery-strip"
	| "twig-more-like-this"
	| "library-hub"
	| "search"
	| "explore-continue"
	| "explore-featured"
	| "explore-hour"
	| "explore-named"
	| "explore-short"
	| "explore-pick";

export type NowPlaying = {
	slug: string;
	stepId?: Id<"path_steps">;
	from?: BrowseFrom;
	preview?: true;
};
type Playback = PlaybackReturn<BoundTrack>;

let current: NowPlaying | null = null;
let playback: Playback | null = null;
let played = false;
let attention = 0;
let attentionPending = false;
type Return = {
	track: NowPlaying | null;
	at: number;
	playing: boolean;
	played: boolean;
};
let preview: Return | null = null;
let attempt = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

const getCurrent = () => current;
const getPlayback = () => playback;
const getLoaded = () => !!playback?.track;
const getIsPlaying = () => !!playback?.isPlaying;

const noop = () => {};
const noopAsync = async () => {};
const IDLE: Playback = {
	currentTime: 0,
	didJustFinish: false,
	duration: 0,
	error: null,
	isLoaded: false,
	isPlaying: false,
	laps: 0,
	loop: false,
	seekTo: noopAsync,
	setLoop: noop,
	setVolume: noop,
	toggle: noop,
	track: undefined,
	volume: 1,
};

let playOnLoad: string | null = null;
let startAt: { slug: string; at: number } | null = null;

export function setNowPlaying(
	next: NowPlaying,
	options?: { play?: boolean; at?: number }
) {
	playOnLoad = armPlayOnLoad(playOnLoad, next.slug, options?.play === true);
	if (options?.play === true || options?.at !== undefined) {
		startAt = { at: Math.max(0, options.at ?? 0), slug: next.slug };
	} else if (startAt?.slug !== next.slug) {
		startAt = null;
	}
	if (
		current?.slug === next.slug &&
		current.stepId === next.stepId &&
		current.from === next.from
	) {
		return;
	}
	if (current?.slug !== next.slug) {
		playback = null;
		played = false;
		attentionPending = options?.play !== true;
		clearSlept();
	}
	current = next;
	emit();
}

export function clearNowPlaying() {
	playOnLoad = null;
	startAt = null;
	preview = null;
	resetSleepTimer();
	if (!(current || playback)) {
		return;
	}
	current = null;
	playback = null;
	attentionPending = false;
	emit();
}

export function retryNowPlaying() {
	if (!current) {
		return;
	}
	attempt++;
	emit();
}
const getAttempt = () => attempt;
export const useNowPlayingAttempt = () =>
	useSyncExternalStore(subscribe, getAttempt, getAttempt);

export function releaseMiniPlayerAttention() {
	if (!(attentionPending && current)) {
		return;
	}
	attentionPending = false;
	attention++;
	emit();
}
const getAttention = () => attention;
export const useMiniPlayerAttention = () =>
	useSyncExternalStore(subscribe, getAttention, getAttention);

export function consumePlayOnLoad(slug: string): {
	asked: boolean;
	at: number;
} {
	const taken = takePlayOnLoad(playOnLoad, slug);
	playOnLoad = taken.pending;
	const at = startAt?.slug === slug ? startAt.at : 0;
	if (startAt?.slug === slug) {
		startAt = null;
	}
	return { asked: taken.asked, at };
}

export function startPreview(slug: string): boolean {
	if (current?.slug === slug) {
		return false;
	}
	if (!(preview && current?.preview)) {
		preview = {
			at: playback?.currentTime ?? 0,
			played,
			playing: !!playback?.isPlaying,
			track: current,
		};
		if (playback?.isPlaying) {
			playback.toggle();
		}
	}
	setNowPlaying({ preview: true, slug }, { play: true });
	return true;
}

export function endPreview() {
	const back = preview;
	preview = null;
	if (!(back && current?.preview)) {
		return;
	}
	if (!back.track) {
		clearNowPlaying();
		return;
	}
	setNowPlaying(back.track, { at: back.at, play: back.playing });
	played = back.played;
	attentionPending = false;
}

export function publishPlayback(next: Playback | null) {
	playback = next;
	emit();
}

export function togglePlayback(p: Playback, posthog: PostHog) {
	if (!p.isPlaying) {
		clearSlept();
	}
	if (!p.isPlaying && p.track && current?.from && !played) {
		played = true;
		posthog.capture("browse_track_played", {
			family: p.track.family,
			from: current.from,
			slug: current.slug,
		});
	}
	p.toggle();
}

export const nowPlaying = () => current;
export const useNowPlaying = () =>
	useSyncExternalStore(subscribe, getCurrent, getCurrent);
export function useNowPlayingPlayback(slug?: string): Playback {
	const np = useNowPlaying();
	const pb = useSyncExternalStore(subscribe, getPlayback, getPlayback);
	return pb && (slug === undefined || np?.slug === slug) ? pb : IDLE;
}
const useNowPlayingLoaded = () =>
	useSyncExternalStore(subscribe, getLoaded, getLoaded);
export const useNowPlayingIsPlaying = () =>
	useSyncExternalStore(subscribe, getIsPlaying, getIsPlaying);
export const nowPlayingPlayback = (): Playback => playback ?? IDLE;

const MINI_PLAYER_CLEARANCE = 64;
export function useMiniPlayerShown() {
	return useNowPlayingLoaded();
}
export function useMiniPlayerInset() {
	return useNowPlayingLoaded() && !isLiquidGlassAvailable()
		? MINI_PLAYER_CLEARANCE
		: 0;
}
