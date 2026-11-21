import { ConvexError } from "convex/values";
import {
	type AudioMetadata,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { nativeLoop, nativeVolume } from "@/lib/audio/playback-level";
import {
	audioFocusEpoch,
	claimAudioFocus,
	claimAudioSession,
	holdsAudioFocus,
} from "@/lib/audio/session";

export type Playable = { url: string; expiresAt: number; durationSec: number };

const EXPIRY_MARGIN_MS = 5 * 60 * 1000;
const MINT_RETRIES = 3;
const MINT_BACKOFF_MS = 500;
const LAP_WINDOW_SEC = 2;

export type PlaybackReturn<T> = {
	track: T | null | undefined;
	error: Error | null;
	isLoaded: boolean;
	isPlaying: boolean;
	didJustFinish: boolean;
	currentTime: number;
	duration: number;
	toggle: () => void;
	seekTo: (seconds: number) => Promise<void>;
	volume: number;
	setVolume: (volume: number) => void;
	loop: boolean;
	setLoop: (loop: boolean) => void;
	/** Natural plays to the end while looping. A looping player never reports `didJustFinish`,
	 * so this is the finish signal then. */
	laps: number;
};

export type PlaybackOptions = {
	gain?: number;
	stopAtEnd?: boolean;
};

export function usePlayback<T extends Playable>(
	key: string,
	fetchTrack: () => Promise<T | null>,
	lockScreen: (track: T) => AudioMetadata,
	{ gain = 1, stopAtEnd = false }: PlaybackOptions = {}
): PlaybackReturn<T> {
	const [track, setTrack] = useState<T | null | undefined>(undefined);
	const [error, setError] = useState<Error | null>(null);
	const pending = useRef<{ seek: number; play: boolean; epoch: number } | null>(
		null
	);
	const [volume, setVolumeState] = useState(1);
	const [loop, setLoop] = useState(false);
	const [laps, setLaps] = useState(0);
	const lastTime = useRef(0);
	const focus = useRef(null);

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
				lastTime.current = seek;
				await player.seekTo(seek);
			}
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

	useEffect(() => {
		player.volume = nativeVolume(volume, gain);
	}, [player, volume, gain]);

	useEffect(() => {
		player.loop = nativeLoop(loop, stopAtEnd);
	}, [player, loop, stopAtEnd]);

	useEffect(() => {
		lastTime.current = 0;
	}, [player]);

	// Native looping wraps to 0 without a finish event; spot the wrap instead.
	useEffect(() => {
		const prev = lastTime.current;
		lastTime.current = status.currentTime;
		if (
			loop &&
			status.playing &&
			status.duration > 0 &&
			status.currentTime < prev &&
			status.duration - prev + status.currentTime < LAP_WINDOW_SEC
		) {
			setLaps((n) => n + 1);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- a wrap shows up only as a time change
	}, [status.currentTime]);

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

	const remintIfExpired = async (seek: number, play: boolean) => {
		if (!track || Date.now() + EXPIRY_MARGIN_MS < track.expiresAt) {
			return false;
		}
		pending.current = { epoch: audioFocusEpoch(), play, seek };
		try {
			setTrack(await mint());
		} catch (e) {
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
				lastTime.current = 0;
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
			lastTime.current = clamped;
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
		laps,
		loop,
		seekTo,
		setLoop,
		setVolume: (v) => setVolumeState(Math.max(0, Math.min(1, v))),
		toggle,
		track,
		volume,
	};
}
