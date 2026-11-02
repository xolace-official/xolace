import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import {
	type AudioPlayer,
	useAudioPlayer,
	useAudioPlayerStatus,
} from "expo-audio";
import { useRef, useState } from "react";
import { VOICE_PREVIEWS } from "@/features/talk/voice-options";
import { claimAudioSession, holdsAudioFocus } from "@/lib/audio/session";

type UseVoicePreviewReturn = {
	/** For a caller that also reads the clip (the voice orb's level). */
	player: AudioPlayer;
	playingSlug: VoiceSlug | null;
	play: (slug: VoiceSlug) => Promise<void>;
	toggle: (slug: VoiceSlug) => void;
	stop: () => void;
};

/** Plays bundled voice-preview clips one at a time, even for locked voices.
 * `playingSlug` is derived from live playback status, so it clears itself. */
export function useVoicePreview(): UseVoicePreviewReturn {
	const player = useAudioPlayer(null);
	const focus = useRef(null);
	const status = useAudioPlayerStatus(player);
	// The slug the user last started; the UI-facing value is derived below.
	const [activeSlug, setActiveSlug] = useState<VoiceSlug | null>(null);

	const playingSlug = status.playing ? activeSlug : null;

	const play = async (slug: VoiceSlug) => {
		try {
			await claimAudioSession(focus, () => player.pause());
			// Another source (or a recorder) took focus during the await.
			if (!holdsAudioFocus(focus)) {
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
