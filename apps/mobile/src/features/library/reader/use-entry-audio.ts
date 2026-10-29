import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef, useState } from "react";

import { trackLibrary } from "@/features/library/analytics";
import { logDropped } from "@/features/library/reader/use-read-signals";
import { usePlayback } from "@/lib/audio/use-playback";

/** The dock's height above the safe area; the page and Back to top clear it. */
const DOCK_H = 80;

/** Reader audio (#411). `started` is the dock's presence; `previewEnded` latches when the free
 * 30s preview runs out. */
export function useEntryAudio(
	entryId: Id<"library_entries">,
	slug: string,
	hasAudio: boolean
) {
	const convex = useConvex();
	const posthog = usePostHog();
	// Keyed on server entitlement so buying Plus re-mints the full asset. Nothing
	// mints until it resolves, so a Plus reader never mints the preview first.
	const entitlement = useQuery(api.premium.getEntitlement);
	const isPlus = entitlement?.isPlus ?? false;
	const p = usePlayback(
		`${entryId}:${hasAudio}:${entitlement === undefined ? "pending" : isPlus}`,
		() =>
			hasAudio
				? entitlement === undefined
					? new Promise<never>(() => {}) // stays loading; the resolved key re-mints
					: convex.query(api.library.audio.getEntryAudio, { entryId })
				: Promise.resolve(null),
		(t) => ({ artist: "Lantern", artworkUrl: t.coverUrl, title: t.title })
	);
	const [started, setStarted] = useState(false);
	const [played, setPlayed] = useState(false); // once per open, not per resume

	// Latched per URL so a re-mint clears it. didJustFinish is one status tick
	// wide, so latch it during render.
	const [endedUrl, setEndedUrl] = useState<string>();
	if (p.didJustFinish && p.track?.preview && endedUrl !== p.track.url) {
		setEndedUrl(p.track.url);
	}
	const previewEnded = !!p.track && endedUrl === p.track.url;
	// The upsell replaces the transport the moment the preview ends: shown here, once per preview.
	useEffect(() => {
		if (!endedUrl) {
			return;
		}
		trackLibrary(posthog, "library_audio_preview_ended", { slug });
		trackLibrary(posthog, "library_paywall_shown", {
			slug,
			trigger: "audio_preview",
		});
	}, [endedUrl, posthog, slug]);

	// Hearing the full asset to the end finishes the entry (#410, #412).
	const record = useMutation(api.library.reads.record);
	const [listened, setListened] = useState(false);
	if (p.didJustFinish && p.track && !p.track.preview && !listened) {
		setListened(true);
	}
	useEffect(() => {
		if (listened) {
			trackLibrary(posthog, "library_audio_completed", { slug });
		}
	}, [listened, posthog, slug]);
	// Audio can end while the app is backgrounded and the token lapsed (#472): wait for auth.
	const { isAuthenticated } = useConvexAuth();
	const sentFinish = useRef(false);
	useEffect(() => {
		if (!listened || sentFinish.current || !isAuthenticated) {
			return;
		}
		sentFinish.current = true;
		record({ entryId, finished: true }).catch((e) => {
			sentFinish.current = false;
			logDropped(e);
		});
	}, [listened, isAuthenticated, record, entryId]);

	return {
		...p,
		close: () => {
			if (p.isPlaying) {
				p.toggle();
			}
			setStarted(false);
		},
		/** Room to leave for the dock: 0 until it is up. */
		dockH: started ? DOCK_H : 0,
		preview: p.track?.preview ?? false,
		previewEnded,
		skip: (d: number) => p.seekTo(p.currentTime + d),
		slug,
		started,
		toggle: () => {
			setStarted(true);
			if (previewEnded) {
				return; // preview spent; the dock shows the upsell
			}
			if (!played) {
				setPlayed(true);
				trackLibrary(posthog, "library_audio_played", {
					preview: p.track?.preview ?? !isPlus,
					slug,
				});
			}
			p.toggle();
		},
	};
}

export type EntryAudio = ReturnType<typeof useEntryAudio>;
