import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import {
	type AudioPlayer,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useRef, useState } from "react";
import { claimAudioSession, holdsAudioFocus } from "@/lib/audio/session";

const VOICE_PREVIEWS: Record<VoiceSlug, number> = {
	ash: require("@/assets/sounds/voice-previews/ash.mp3"),
	sage: require("@/assets/sounds/voice-previews/sage.mp3"),
	vesper: require("@/assets/sounds/voice-previews/vesper.mp3"),
	wren: require("@/assets/sounds/voice-previews/wren.mp3"),
};

type UseVoicePreviewReturn = {
	player: AudioPlayer;
	playingSlug: VoiceSlug | null;
	play: (slug: VoiceSlug) => Promise<void>;
	toggle: (slug: VoiceSlug) => void;
	stop: () => void;
};

export function useVoicePreview(): UseVoicePreviewReturn {
	const player = useAudioPlayer(null);
	const focus = useRef(null);
	const status = useAudioPlayerStatus(player);
	const [activeSlug, setActiveSlug] = useState<VoiceSlug | null>(null);
	const request = useRef(0);

	const playingSlug = status.playing ? activeSlug : null;

	const play = async (slug: VoiceSlug) => {
		request.current += 1;
		const id = request.current;
		try {
			await claimAudioSession(focus, () => player.pause());
			if (id !== request.current || !holdsAudioFocus(focus)) {
				return;
			}
			player.replace(VOICE_PREVIEWS[slug]);
			player.play();
			setActiveSlug(slug);
		} catch (e) {
			console.error("[useVoicePreview] play failed:", e);
			setActiveSlug(null);
		}
	};

	const stop = () => {
		request.current += 1;
		if (status.playing) {
			player.pause();
		}
		setActiveSlug(null);
	};

	const toggle = (slug: VoiceSlug) => {
		if (playingSlug === slug) {
			stop();
			return;
		}
		void play(slug);
	};

	return { play, player, playingSlug, stop, toggle };
}
