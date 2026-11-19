import type { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import type { FunctionReturnType } from "convex/server";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import type { PostHog } from "posthog-react-native";
import { useSyncExternalStore } from "react";
import type { PlaybackReturn } from "@/lib/audio/use-playback";
import { armPlayOnLoad, takePlayOnLoad } from "@/lib/now-playing/play-on-load";
import { clearSlept, resetSleepTimer } from "@/lib/now-playing/sleep-timer";

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
	/** Hold to hear (Explore, Xolace+): a few seconds heard over what was loaded. Writes no
	 * listen or progress, and `endPreview` puts the track it stood in for back. */
	preview?: true;
};
type Playback = PlaybackReturn<BoundTrack>;

// The one track loaded outside any screen (S4): the player and the mini player show it, the
// player feature's host plays it. Module-level because
// writers and readers sit in unrelated subtrees. `current` is what to play;
// `playback` is the live `useTrackPlayback` result the host publishes.
let current: NowPlaying | null = null;
let playback: Playback | null = null;
// One `browse_track_played` per loaded track, however often the player reopens.
let played = false;
// A new track lifts the mini-player once, when the player closes over it (S4 pulse).
let attention = 0;
let attentionPending = false;
/** What a preview stood in for: the track (none: nothing was loaded), its place, whether it
 * played, and whether its `browse_track_played` was already sent. */
type Return = {
	track: NowPlaying | null;
	at: number;
	playing: boolean;
	played: boolean;
};
// Set while a preview plays.
let preview: Return | null = null;
// Bumped by Try again: the host remounts its runner, which mints the track afresh.
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
	seekTo: noopAsync,
	setLoop: noop,
	setVolume: noop,
	toggle: noop,
	track: undefined,
	volume: 1,
};

// A play asked for with the load (a Lantern hub's listen card plays in place), for the
// host to start once the track is minted: the slug it was asked for (`play-on-load.ts`).
let playOnLoad: string | null = null;
// Where that slug starts once loaded, in seconds (Explore's Pick up where you left off, a
// track put back after a preview); none is from the top.
let startAt: { slug: string; at: number } | null = null;

/**
 * `play`: start it as soon as it's loaded, with no player screen to tap play on. `at`: start
 * from there, in seconds; without `play` it waits there, paused. Neither: load only.
 */
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
		// Never show the previous track's status under the new slug.
		playback = null;
		played = false;
		// A track played in place never went through the player: nothing to lift for later.
		attentionPending = options?.play !== true;
		// The timer carries over to the new track; "Paused by the sleep timer" was the old one's.
		clearSlept();
	}
	current = next;
	emit();
}

export function clearNowPlaying() {
	playOnLoad = null;
	startAt = null;
	preview = null;
	// Stopping the track clears the sleep timer; starting a different one keeps it.
	resetSleepTimer();
	if (!(current || playback)) {
		return;
	}
	current = null;
	playback = null;
	attentionPending = false;
	emit();
}

/** Try again after a failed load: the host mints the same track afresh. */
export function retryNowPlaying() {
	if (!current) {
		return;
	}
	attempt++;
	emit();
}
const getAttempt = () => attempt;
/** Host only: changes on each Try again. */
export const useNowPlayingAttempt = () =>
	useSyncExternalStore(subscribe, getAttempt, getAttempt);

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

/** Host only: whether `slug`, now loaded, was asked to play, and where it starts (0: the top).
 * Asks once. */
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

/**
 * Hold to hear (Explore, Xolace+): pause what's loaded and play `slug` from the top, until
 * `endPreview`. False, and nothing changes, when `slug` is the loaded track already.
 */
export function startPreview(slug: string): boolean {
	if (current?.slug === slug) {
		return false;
	}
	// A second hold while one plays still returns to the first one's track.
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

/** The hold ended (let go, or 8 s): the track the preview stood in for comes back where it
 * was, playing only if it was; with none, nothing is loaded. Does nothing without a preview, or
 * once something else has replaced it. */
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
	// Not a new track: no first-play event again, no lift for the mini player.
	played = back.played;
	attentionPending = false;
}

/** Host only. */
export function publishPlayback(next: Playback | null) {
	playback = next;
	emit();
}

/** Play/pause for every control; the first start of a loaded track records
 * `browse_track_played`. */
export function togglePlayback(p: Playback, posthog: PostHog) {
	if (!p.isPlaying) {
		// A play forgets "Paused by the sleep timer".
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

/** What's loaded, read once (an action's moment). */
export const nowPlaying = () => current;
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
const MINI_PLAYER_CLEARANCE = 64;
/** Whether the mini-player (accessory on iOS 26, overlay elsewhere) is on screen. */
export function useMiniPlayerShown() {
	return useNowPlayingLoaded();
}
/** Scroll tail a tab screen reserves for the overlay (iOS 26 insets natively). Not tied to the
 * bar hiding: dropping it jumps a list at its end. */
export function useMiniPlayerInset() {
	return useNowPlayingLoaded() && !isLiquidGlassAvailable()
		? MINI_PLAYER_CLEARANCE
		: 0;
}
