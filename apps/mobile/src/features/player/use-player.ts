import type { Id } from "@xolace/backend/dataModel";
import { router, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useMemo, useRef } from "react";
import type { PaywallSurface } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	type BrowseFrom,
	clearNowPlaying,
	nowPlaying,
	nowPlayingPlayback,
	releaseMiniPlayerAttention,
	retryNowPlaying,
	setNowPlaying,
	togglePlayback,
	useNowPlayingPlayback,
} from "@/lib/now-playing/now-playing-store";
import {
	pickSleep,
	setSleepTimer,
	useSleepTimer,
} from "@/lib/now-playing/sleep-timer";
import type { Player, PlayerClock } from "./player-data";
import {
	playerStatus,
	skipTarget,
	sleepFading,
	sleepPill,
	sleepVoice,
	toPlayerTrack,
} from "./player-model";

/** How long a seek's target stands in for the reported time. */
const SEEK_SETTLE_MS = 1000;

type Params = { slug: string; from?: BrowseFrom; stepId?: Id<"path_steps"> };

/**
 * The player on the now-playing track. The audio lives in the now-playing host (above every
 * screen): this asks it for `slug` (the loaded slug keeps playing, another swaps the track) and
 * closing leaves it playing in the mini player. Free listeners never see the player: the
 * paywall replaces it, and a lapsed entitlement takes the mini player down with it.
 */
export function usePlayerData(): { player: Player; clock: PlayerClock } {
	const { slug, from, stepId } = useLocalSearchParams<Params>();
	const { isPlus, isLoading } = usePlusEntitlement();
	const posthog = usePostHog();
	const lapsed = !(isLoading || isPlus);

	useEffect(() => {
		if (!lapsed) {
			return;
		}
		clearNowPlaying();
		posthog.capture("browse_paywall_shown", { from: from ?? null, slug });
		// Replace, not push, so the paywall's close pops back past the player.
		router.replace({
			params: { surface: "browse" satisfies PaywallSurface },
			pathname: "/upgrade",
		});
	}, [lapsed, slug, from, posthog]);

	useEffect(() => {
		if (isPlus) {
			setNowPlaying({ from, slug, stepId });
		}
	}, [isPlus, slug, stepId, from]);
	// A track first loaded here lifts the mini player once, when the player closes over it.
	useEffect(() => releaseMiniPlayerAttention, []);

	const p = useNowPlayingPlayback(slug);
	const choice = useSleepTimer((t) => t.choice);
	const pill = useSleepTimer(sleepPill);
	const fading = useSleepTimer(sleepFading);
	const voice = useSleepTimer(sleepVoice);
	const slept = useSleepTimer((t) => t.slept);
	const status = playerStatus({
		error: !!p.error,
		gated: !isPlus,
		track: p.track,
	});
	const { track, isPlaying, loop, volume } = p;
	// The last seek asked for: the status reports it only after it lands, so quick skips in a row
	// step on from where the previous one went, not from the stale time.
	const lastSeek = useRef<{ to: number; at: number } | null>(null);

	// A context value (code-style.md's exception): `p` is rebuilt on every status tick, and the
	// parts should render only when what they show changes. Actions read the live playback.
	const player = useMemo((): Player => {
		/** The playback, if `slug` is the loaded track. */
		const live = () =>
			nowPlaying()?.slug === slug ? nowPlayingPlayback() : null;
		const seek = (seconds: number) => {
			lastSeek.current = { at: Date.now(), to: seconds };
			live()?.seekTo(seconds);
		};
		return {
			actions: {
				close: () => router.back(),
				openCrisisHelp: () => router.push("/crisis-resources"),
				retry: () => retryNowPlaying(),
				seek,
				setRepeat: (on) => live()?.setLoop(on),
				setSleep: (c) => setSleepTimer(pickSleep(c)),
				setVolume: (v) => live()?.setVolume(v),
				skip: (by) => {
					const pb = live();
					if (!pb) {
						return;
					}
					const recent = lastSeek.current;
					const from =
						recent && Date.now() - recent.at < SEEK_SETTLE_MS
							? recent.to
							: pb.currentTime;
					seek(skipTarget(from, by, pb.duration));
				},
				toggle: () => {
					const pb = live();
					if (pb) {
						togglePlayback(pb, posthog);
					}
				},
			},
			state: {
				playing: isPlaying,
				repeat: loop,
				sleep: { choice, fading, pill, voice },
				slept,
				status,
				track: track ? toPlayerTrack(track) : null,
				volume,
			},
		};
	}, [
		slug,
		posthog,
		status,
		track,
		isPlaying,
		loop,
		volume,
		choice,
		pill,
		fading,
		voice,
		slept,
	]);

	return {
		clock: {
			duration: p.duration || track?.durationSec || 0,
			position: p.currentTime,
		},
		player,
	};
}
