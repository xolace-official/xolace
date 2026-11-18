import type { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { PostHog } from "posthog-react-native";
import { useSyncExternalStore } from "react";
import type { PlaybackReturn } from "@/lib/audio/use-playback";
import { armPlayOnLoad, takePlayOnLoad } from "@/lib/now-playing/play-on-load";
import { useTabBarHidden } from "@/lib/tab-bar";

/** A track as `paths.getBoundAudioTrack` serves it. */
export type BoundTrack = NonNullable<
	FunctionReturnType<typeof api.paths.getBoundAudioTrack>
>;

/** Where a play was reached from (docs/paths-v1.md §13), for `browse_track_played`. */
export type BrowseFrom =
	| "hub-new"
	| "family-list"
	| "topic"
	| "discovery-strip"
	| "twig-more-like-this"
	| "library-hub"
	| "search";

export type NowPlaying = {
	slug: string;
	stepId?: Id<"path_steps">;
	from?: BrowseFrom;
};
type Playback = PlaybackReturn<BoundTrack>;

// The one Browse track loaded outside any screen (S4). Module-level because
// writers and readers sit in unrelated subtrees. `current` is what to play;
// `playback` is the live `useTrackPlayback` result the host publishes.
let current: NowPlaying | null = null;
let playback: Playback | null = null;
// One `browse_track_played` per loaded track, however often the player reopens.
let played = false;
// A new track lifts the mini-player once, when the player closes over it (S4 pulse).
let attention = 0;
let attentionPending = false;
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
/** What a reader sees before the host has published. */
const IDLE: Playback = {
	currentTime: 0,
	didJustFinish: false,
	duration: 0,
	error: null,
	isLoaded: false,
	isPlaying: false,
	laps: 0,
	loop: false,
	seekTo: noop,
	setLoop: noop,
	setVolume: noop,
	toggle: noop,
	track: undefined,
	volume: 1,
};

// A play asked for with the load (a Lantern hub's listen card plays in place), for the
// host to start once the track is minted: the slug it was asked for (`play-on-load.ts`).
let playOnLoad: string | null = null;

/**
 * `play`: start it as soon as it's loaded, with no player screen to tap play on. Without it,
 * as before: load only.
 */
export function setNowPlaying(next: NowPlaying, options?: { play?: boolean }) {
	playOnLoad = armPlayOnLoad(playOnLoad, next.slug, options?.play === true);
	if (
		current?.slug === next.slug &&
		current.stepId === next.stepId &&
		current.from === next.from
	) {
		return;
	}
	if (current?.slug !== next.slug) {
		// Never show the previous track's status under the new slug.
		playback = null;
		played = false;
		// A track played in place never went through the player: nothing to lift for later.
		attentionPending = options?.play !== true;
	}
	current = next;
	emit();
}

export function clearNowPlaying() {
	playOnLoad = null;
	if (!(current || playback)) {
		return;
	}
	current = null;
	playback = null;
	attentionPending = false;
	emit();
}

/** Player screen unmount: a track loaded during that visit pulses the mini-player once. */
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

/** Host only: whether `slug`, now loaded, was asked to play. Asks once. */
export function consumePlayOnLoad(slug: string) {
	const taken = takePlayOnLoad(playOnLoad, slug);
	playOnLoad = taken.pending;
	return taken.asked;
}

/** Host only. */
export function publishPlayback(next: Playback | null) {
	playback = next;
	emit();
}

/** Play/pause for every control; the first start of a loaded track records
 * `browse_track_played`. */
export function togglePlayback(p: Playback, posthog: PostHog) {
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

export const useNowPlaying = () =>
	useSyncExternalStore(subscribe, getCurrent, getCurrent);
/** The live playback, or the idle shape until `slug` is the one loaded and published. */
export function useNowPlayingPlayback(slug?: string): Playback {
	const np = useNowPlaying();
	const pb = useSyncExternalStore(subscribe, getPlayback, getPlayback);
	return pb && (slug === undefined || np?.slug === slug) ? pb : IDLE;
}
/** A boolean snapshot, so the tab layout doesn't re-render on every status tick. */
const useNowPlayingLoaded = () =>
	useSyncExternalStore(subscribe, getLoaded, getLoaded);
/** Whether the loaded track is playing, as a boolean snapshot: a list that marks it doesn't
 * re-render on every status tick. */
export const useNowPlayingIsPlaying = () =>
	useSyncExternalStore(subscribe, getIsPlaying, getIsPlaying);
/** The live playback, read once (an action's moment), or the idle shape. */
export const nowPlayingPlayback = (): Playback => playback ?? IDLE;

/** Mini-player capsule plus its gap above the tab bar; floating UI over the tabs must clear it. */
export const MINI_PLAYER_CLEARANCE = 64;
/** Whether the mini-player (accessory on iOS 26, overlay elsewhere) is on screen; it yields
 * with the bar. */
export function useMiniPlayerShown() {
	const loaded = useNowPlayingLoaded();
	const hidden = useTabBarHidden();
	return loaded && !hidden;
}
/** Scroll tail a tab screen reserves for the overlay (iOS 26 insets natively). Not tied to the
 * bar hiding: dropping it jumps a list at its end. */
export function useMiniPlayerInset() {
	return useNowPlayingLoaded() && !isLiquidGlassAvailable()
		? MINI_PLAYER_CLEARANCE
		: 0;
}
