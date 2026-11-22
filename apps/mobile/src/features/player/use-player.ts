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
	type Seek,
	settledPosition,
	skipTarget,
	sleepFading,
	sleepPill,
	sleepVoice,
	toPlayerTrack,
} from "./player-model";

type Params = { slug: string; from?: BrowseFrom; stepId?: Id<"path_steps"> };

export function usePlayerData(): { player: Player; clock: PlayerClock } {
	const { slug, from, stepId } = useLocalSearchParams<Params>();
	const { status: plus, isPlus } = usePlusEntitlement();
	const posthog = usePostHog();
	const lapsed = plus === "free";

	useEffect(() => {
		if (!lapsed) {
			return;
		}
		clearNowPlaying();
		posthog.capture("browse_paywall_shown", { from: from ?? null, slug });
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
	useEffect(() => releaseMiniPlayerAttention, []);

	const p = useNowPlayingPlayback(slug);
	const choice = useSleepTimer((t) => t.choice);
	const pill = useSleepTimer(sleepPill);
	const fading = useSleepTimer(sleepFading);
	const voice = useSleepTimer(sleepVoice);
	const slept = useSleepTimer((t) => t.slept);
	const status = playerStatus({
		error: !!p.error,
		plus,
		track: p.track,
	});
	const { track, isPlaying, loop, volume } = p;
	const lastSeek = useRef<Seek | null>(null);

	const player = useMemo((): Player => {
		const live = () =>
			nowPlaying()?.slug === slug ? nowPlayingPlayback() : null;
		const seek = (seconds: number) => {
			lastSeek.current = { at: Date.now(), to: seconds };
			live()?.seekTo(seconds);
		};
		return {
			actions: {
				close: () =>
					router.canGoBack() ? router.back() : router.replace("/(protected)"),
				openCrisisHelp: () => router.push("/crisis-resources"),
				retry: () => retryNowPlaying(),
				seek,
				setRepeat: (on) => live()?.setLoop(on),
				setSleep: (c) => setSleepTimer(pickSleep(c)),
				settled: (position) =>
					settledPosition(position, lastSeek.current, Date.now()),
				setVolume: (v) => live()?.setVolume(v),
				skip: (by) => {
					const pb = live();
					if (!pb) {
						return;
					}
					const from = settledPosition(
						pb.currentTime,
						lastSeek.current,
						Date.now()
					);
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
