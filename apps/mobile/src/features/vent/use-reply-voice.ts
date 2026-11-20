import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef } from "react";
import {
	claimAudioSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";

const VOICE_LOAD_MS = 1500;
const MS_PER_S = 1000;

export function useReplyVoice() {
	const player = useAudioPlayer(null);
	const status = useAudioPlayerStatus(player);
	const focus = useRef(null);
	const hasVoice = useRef(false);
	const onLoaded = useRef<((ms: number) => void) | null>(null);
	const voiceMs =
		status.isLoaded && status.duration > 0 ? status.duration * MS_PER_S : null;

	useEffect(() => {
		if (voiceMs !== null) {
			onLoaded.current?.(voiceMs);
		}
	}, [voiceMs]);
	useEffect(() => () => releaseAudioFocus(focus), []);

	const waitForLength = () =>
		new Promise<number | null>((resolve) => {
			const t = setTimeout(() => resolve(null), VOICE_LOAD_MS);
			onLoaded.current = (ms) => {
				clearTimeout(t);
				resolve(ms);
			};
		});

	return {
		load: (url: string) => {
			hasVoice.current = true;
			player.replace({ uri: url });
		},
		speak: async (): Promise<number | null> => {
			if (!hasVoice.current) {
				return null;
			}
			const ms = voiceMs ?? (await waitForLength());
			onLoaded.current = null;
			if (ms === null) {
				hasVoice.current = false;
				return null;
			}
			try {
				await claimAudioSession(focus, () => player.pause());
				if (holdsAudioFocus(focus)) {
					player.play();
				}
			} catch (err: unknown) {
				console.error("[vent] reply voice failed:", err);
			}
			return ms;
		},
	};
}
