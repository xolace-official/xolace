import { useAudioPlayer } from "expo-audio";
import { useEffect, useRef } from "react";
import {
	claimAmbientSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";

const VOLUME = 0.6;

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
