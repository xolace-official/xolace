import { ConvexError } from "convex/values";
import {
	type AudioMetadata,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import {
	audioFocusEpoch,
	claimAudioFocus,
	claimAudioSession,
	holdsAudioFocus,
} from "@/src/lib/audio/session";

/** What any signed-URL player needs from its server read. */
export type Playable = { url: string; expiresAt: number; durationSec: number };

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;
const MINT_RETRIES = 3;
const MINT_BACKOFF_MS = 500;

export type PlaybackReturn<T> = {
	/** undefined while minting, null when there's nothing to play. */
	track: T | null | undefined;
	/** Terminal: retries exhausted or the server refused. `track` stays undefined. */
	error: Error | null;
	isLoaded: boolean;
	isPlaying: boolean;
	didJustFinish: boolean;
	currentTime: number;
	duration: number;
	toggle: () => void;
	seekTo: (seconds: number) => void;
	/** 0–1. Survives a re-mint: the rebuilt player is set to it on load. */
	volume: number;
	setVolume: (volume: number) => void;
};

/**
 * Signed-URL playback shared by every player — Browse / kindling
 * (`useTrackPlayback`) and the Lantern reader's dock (#411). Shaped like
 * `useMirrorAudio` with **refetch-on-expiry**: signed R2 URLs die after an
 * hour, so a track paused and resumed later re-mints transparently, rebuilds
 * the player on the fresh URL, and picks up where it left off.
 *
 * `key` identifies what `fetchTrack` returns; a new key mints afresh.
 */
export function usePlayback<T extends Playable>(
	key: string,
	fetchTrack: () => Promise<T | null>,
	lockScreen: (track: T) => AudioMetadata
): PlaybackReturn<T> {
	const [track, setTrack] = useState<T | null | undefined>(undefined);
	const [error, setError] = useState<Error | null>(null);
	// Applied once the (re)built player reports loaded: where to resume, and
	// whether the user had asked to play. `epoch` is the focus epoch at request
	// time: if another source took focus since, the queued play is stale.
	const pending = useRef<{ seek: number; play: boolean; epoch: number } | null>(
		null
	);
	const [volume, setVolumeState] = useState(1);
	// Identity for audio focus: the ref object itself, not its contents.
	const focus = useRef(null);

	// Transient (network) failures retry with bounded backoff; a ConvexError is
	// the server refusing on purpose, so it surfaces at once.
	const mint = async (): Promise<T | null> => {
		for (let attempt = 0; ; attempt++) {
			try {
				return await fetchTrack();
			} catch (e) {
				if (e instanceof ConvexError || attempt >= MINT_RETRIES) {
					throw e;
				}
				await new Promise((r) => setTimeout(r, MINT_BACKOFF_MS * 2 ** attempt));
			}
		}
	};

	// One-shot mint, not a subscription: a signed URL never changes reactively,
	// and a fresh one is fetched on demand below.
	useEffect(() => {
		let cancelled = false;
		mint()
			.then((t) => {
				if (cancelled) {
					return;
				}
				setTrack(t);
				setError(null);
			})
			.catch((e) => {
				console.error("[usePlayback] mint failed:", e);
				if (!cancelled) {
					setError(e instanceof Error ? e : new Error(String(e)));
				}
			});
		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `key` names exactly what mint fetches
	}, [key]);

	const player = useAudioPlayer(track?.url ?? null);
	// A re-mint rebuilds the player, but `useAudioPlayerStatus` keeps the old
	// player's last status until the new one emits — read the live one until then.
	const eventStatus = useAudioPlayerStatus(player);
	const status =
		eventStatus.id === player.id ? eventStatus : player.currentStatus;

	useEffect(() => {
		if (!(pending.current && status.isLoaded)) {
			return;
		}
		const { seek, play, epoch } = pending.current;
		pending.current = null;
		(async () => {
			if (seek > 0) {
				await player.seekTo(seek);
			}
			// Someone else started (or a recorder yielded) while this one loaded:
			// their sound wins, the stale request is dropped.
			if (!play || (audioFocusEpoch() !== epoch && !holdsAudioFocus(focus))) {
				return;
			}
			await claimAudioSession(focus, () => player.pause());
			if (!holdsAudioFocus(focus)) {
				return;
			}
			if (track) {
				player.setActiveForLockScreen(true, lockScreen(track));
			}
			player.play();
		})().catch((e) => console.error("[usePlayback] resume failed:", e));
		// eslint-disable-next-line react-hooks/exhaustive-deps -- track read for lock-screen metadata only, not a resume trigger
	}, [status.isLoaded, player]);

	// On the player, not the status: the status only reports what the player
	// was told, and a re-minted player starts back at 1.
	useEffect(() => {
		// eslint-disable-next-line react-hooks/immutability -- expo-audio AudioPlayer.volume is a documented mutable setter
		player.volume = volume;
	}, [player, volume]);

	// A lock-screen play command resumes the native player without passing
	// through `toggle`, so claim focus from the status too.
	useEffect(() => {
		if (status.playing) {
			claimAudioFocus(focus, () => player.pause());
		}
	}, [status.playing, player]);

	useEffect(() => {
		if (status.didJustFinish) {
			player.setActiveForLockScreen(false);
		}
	}, [status.didJustFinish, player]);

	// No lock-screen cleanup on unmount/re-mint: `useAudioPlayer` releases the
	// native player first, and its `sharedObjectWillRelease` already clears the
	// active lock-screen player. Calling into the released object throws.

	/**
	 * Past `expiresAt`, re-mint and queue the action for the rebuilt player.
	 * Returns true when the caller should stop — the queued action will run.
	 */
	const remintIfExpired = async (seek: number, play: boolean) => {
		// `expiresAt` is server time; the margin absorbs a slow device clock.
		if (!track || Date.now() + EXPIRY_MARGIN_MS < track.expiresAt) {
			return false;
		}
		pending.current = { epoch: audioFocusEpoch(), play, seek };
		try {
			setTrack(await mint());
		} catch (e) {
			// Nothing will load to run the queued action; drop it and surface why.
			pending.current = null;
			console.error("[usePlayback] re-mint failed:", e);
			setError(e instanceof Error ? e : new Error(String(e)));
		}
		return true;
	};

	const toggle = async () => {
		if (!track) {
			return;
		}
		try {
			if (status.playing) {
				player.pause();
				return;
			}
			const from = status.didJustFinish ? 0 : status.currentTime;
			if (await remintIfExpired(from, true)) {
				return;
			}
			if (!status.isLoaded) {
				pending.current = { epoch: audioFocusEpoch(), play: true, seek: 0 };
				return;
			}
			await claimAudioSession(focus, () => player.pause());
			if (status.didJustFinish) {
				await player.seekTo(0);
			}
			if (!holdsAudioFocus(focus)) {
				return;
			}
			player.setActiveForLockScreen(true, lockScreen(track));
			player.play();
		} catch (e) {
			console.error("[usePlayback] toggle failed:", e);
		}
	};

	const seekTo = async (seconds: number) => {
		if (!(track && status.isLoaded)) {
			return;
		}
		const clamped = Math.max(
			0,
			Math.min(seconds, status.duration || track.durationSec)
		);
		try {
			// A range request on a dead URL 403s, so seeking re-mints too.
			if (await remintIfExpired(clamped, status.playing)) {
				return;
			}
			await player.seekTo(clamped);
		} catch (e) {
			console.error("[usePlayback] seek failed:", e);
		}
	};

	return {
		currentTime: status.currentTime,
		didJustFinish: status.didJustFinish,
		duration: status.duration || track?.durationSec || 0,
		error,
		isLoaded: status.isLoaded,
		isPlaying: status.playing,
		seekTo,
		setVolume: (v) => setVolumeState(Math.max(0, Math.min(1, v))),
		toggle,
		track,
		volume,
	};
}
