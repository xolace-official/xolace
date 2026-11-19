import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import {
	claimAmbientSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";

/** A loop's ambient track sits under everything: quiet, and it loops. */
const VOLUME = 0.6;

/**
 * A loop's ambient sound: plays only while `plays` (the loop is playing and the sound is on), and
 * stops with it (pause, background, Low Power, Reduce Motion, the screen closing). Mixes with
 * other apps and respects the silent switch (`AMBIENT_SESSION`).
 */
export function useAmbientSound(url: string | undefined, plays: boolean) {
	const player = useAudioPlayer(url ? { uri: url } : null);
	const focus = useRef(null);

	useEffect(() => {
		player.loop = true;
		player.volume = VOLUME;
	}, [player]);

	useEffect(() => {
		if (!(plays && url)) {
			player.pause();
			return;
		}
		let live = true;
		claimAmbientSession(focus, () => player.pause())
			.then(() => {
				if (live && holdsAudioFocus(focus)) {
					player.play();
				}
			})
			.catch((err: unknown) => {
				console.error("[quotes] ambient sound failed:", err);
			});
		return () => {
			live = false;
		};
	}, [plays, url, player]);

	useEffect(
		() => () => {
			releaseAudioFocus(focus);
		},
		[]
	);
}
