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
	// Bumped by every play and stop, so a sample still waiting for the audio session
	// doesn't start after a stop (the sheet closed) or a newer play.
	const request = useRef(0);

	const playingSlug = status.playing ? activeSlug : null;

	const play = async (slug: VoiceSlug) => {
		request.current += 1;
		const id = request.current;
		try {
			await claimAudioSession(focus, () => player.pause());
			// Stopped or replaced during the await, or another source (or a recorder)
			// took focus.
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
