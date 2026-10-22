import { useSyncExternalStore } from 'react';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import type { PostHog } from 'posthog-react-native';
import type { Id } from '@/convex/_generated/dataModel';
import type { BrowseFrom } from '@/src/features/browse/use-open-track';
import type { BoundTrack } from '@/src/features/browse/use-track-playback';
import type { PlaybackReturn } from '@/src/lib/audio/use-playback';
import { useTabBarHidden } from '@/src/lib/tab-bar';

export type NowPlaying = { slug: string; stepId?: Id<'path_steps'>; from?: BrowseFrom };
type Playback = PlaybackReturn<BoundTrack>;

/**
 * The one Browse track loaded outside any screen (S4). Module-level like
 * `src/lib/tab-bar.ts`: the writers (player screen, accessory) and readers
 * (host, player, both accessory copies) sit in unrelated subtrees.
 *
 * `current` is what to play; `playback` is the live `useTrackPlayback` result
 * the host publishes, so every reader drives the same audio player.
 */
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

const noop = () => {};
/** What a reader sees before the host has published: the same as minting. */
const IDLE: Playback = {
  track: undefined,
  error: null,
  isLoaded: false,
  isPlaying: false,
  didJustFinish: false,
  currentTime: 0,
  duration: 0,
  toggle: noop,
  seekTo: noop,
  volume: 1,
  setVolume: noop,
};

export function setNowPlaying(next: NowPlaying) {
  if (current?.slug === next.slug && current.stepId === next.stepId && current.from === next.from) return;
  if (current?.slug !== next.slug) {
    // Never show the previous track's status under the new slug.
    playback = null;
    played = false;
    attentionPending = true;
  }
  current = next;
  emit();
}

export function clearNowPlaying() {
  if (!current && !playback) return;
  current = null;
  playback = null;
  attentionPending = false;
  emit();
}

/** Player screen unmount: a track loaded during that visit pulses the mini-player once. */
export function releaseMiniPlayerAttention() {
  if (!attentionPending || !current) return;
  attentionPending = false;
  attention++;
  emit();
}
const getAttention = () => attention;
export const useMiniPlayerAttention = () => useSyncExternalStore(subscribe, getAttention, getAttention);

/** Host only. */
export function publishPlayback(next: Playback | null) {
  playback = next;
  emit();
}

/**
 * Play/pause for every control (player, mini-player): the first start of the
 * loaded track records `browse_track_played`, whichever control started it.
 */
export function togglePlayback(p: Playback, posthog: PostHog) {
  if (!p.isPlaying && p.track && current?.from && !played) {
    played = true;
    posthog.capture('browse_track_played', { slug: current.slug, family: p.track.family, from: current.from });
  }
  p.toggle();
}

export const useNowPlaying = () => useSyncExternalStore(subscribe, getCurrent, getCurrent);
/** The live playback, or the idle shape until `slug` is the one loaded and published. */
export function useNowPlayingPlayback(slug?: string): Playback {
  const np = useNowPlaying();
  const pb = useSyncExternalStore(subscribe, getPlayback, getPlayback);
  return pb && (slug === undefined || np?.slug === slug) ? pb : IDLE;
}
/** A boolean snapshot, so the tab layout doesn't re-render on every status tick. */
export const useNowPlayingLoaded = () => useSyncExternalStore(subscribe, getLoaded, getLoaded);

/** The mini-player capsule plus its gap above the tab bar — what floating UI over the tabs must clear. */
export const MINI_PLAYER_CLEARANCE = 64;
/**
 * Whether the mini-player is on screen — the tab-bar accessory on iOS 26, the
 * overlay capsule everywhere else — and it yields with the bar.
 */
export function useMiniPlayerShown() {
  const loaded = useNowPlayingLoaded();
  const hidden = useTabBarHidden();
  return loaded && !hidden;
}
/**
 * Scroll tail a tab screen reserves for the overlay; iOS 26 insets its
 * accessory natively. Not tied to the bar hiding: a sheet that hides the bar
 * is momentary, and dropping the tail with it jumps a list sitting at its end.
 */
export function useMiniPlayerInset() {
  return useNowPlayingLoaded() && !isLiquidGlassAvailable() ? MINI_PLAYER_CLEARANCE : 0;
}
