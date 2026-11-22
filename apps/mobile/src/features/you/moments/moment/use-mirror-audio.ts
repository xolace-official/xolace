import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import {
	claimAudioSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";

export function useMirrorAudio(sessionId: Id<"sessions"> | null) {
	const audioUrl = useQuery(
		api.sessions.getMirrorAudioUrl,
		sessionId ? { sessionId } : "skip"
	);
	const [activated, setActivated] = useState(false);
	const player = useAudioPlayer(activated ? (audioUrl ?? null) : null);
	const status = useAudioPlayerStatus(player);
	const awaitingFirstPlay = useRef(false);
	const focus = useRef(null);
	const ready = !!audioUrl;

	const canPlay = () =>
		AppState.currentState === "active" && holdsAudioFocus(focus);

	useEffect(() => {
		if (!(awaitingFirstPlay.current && status.isLoaded)) {
			return;
		}
		awaitingFirstPlay.current = false;
		let cancelled = false;
		claimAudioSession(focus, () => player.pause())
			.then(() => {
				if (!cancelled && canPlay()) {
					player.play();
				}
			})
			.catch((e) => console.error("[useMirrorAudio] first play failed:", e));
		return () => {
			cancelled = true;
			releaseAudioFocus(focus);
		};
	}, [status.isLoaded, player]);

	// Stop once they lock the phone or leave the app: the shared session keeps background play on
	// for Explore, and the mirror has no lock-screen control. `background`, not `inactive`, so
	// Control Center or a banner doesn't cut it off.
	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "background") {
				player.pause();
			}
		});
		return () => sub.remove();
	}, [player]);

	const toggle = async () => {
		if (!(ready && audioUrl)) {
			return;
		}
		if (!activated) {
			awaitingFirstPlay.current = true;
			setActivated(true);
			return;
		}
		if (!status.isLoaded) {
			return;
		}
		try {
			if (status.playing) {
				player.pause();
				return;
			}
			await claimAudioSession(focus, () => player.pause());
			if (!canPlay()) {
				return;
			}
			if (status.didJustFinish) {
				player.seekTo(0);
			}
			player.play();
		} catch (e) {
			console.error("[useMirrorAudio] toggle failed:", e);
		}
	};

	return { playing: status.playing, ready, toggle };
}
