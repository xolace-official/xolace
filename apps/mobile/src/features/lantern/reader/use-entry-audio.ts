/**
 * The reader's narration (#411), production's `useEntryAudio`: the Listen pill starts it and the
 * dock follows. A free reader hears the server's 30 s preview, then Keep listening opens Xolace+.
 * Hearing the full asset to the end finishes the entry.
 */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePushOnce } from "@/features/lantern/reader/use-push-once";
import { logDropped } from "@/features/lantern/reader/use-read-signals";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlayback } from "@/lib/audio/use-playback";
import { tap } from "@/lib/haptics";
import { trackLibrary } from "@/lib/library-analytics";

const SKIP_S = 15;

/** What the dock and the Listen pill show; it changes rarely (not with the time). */
export type ReaderAudio = {
	/** The dock is up. */
	started: boolean;
	playing: boolean;
	/** A free reader's 30 s preview. */
	preview: boolean;
	/** The preview ran out: Keep listening takes the transport's place. */
	previewEnded: boolean;
	/** The narration couldn't be fetched. */
	failed: boolean;
	/** Xolace+ and the full asset: the transcript is there. */
	transcript: boolean;
};

/** Where the narration is, in seconds. It ticks while playing: only the dock's time reads it. */
export type ReaderClock = { currentTime: number; duration: number };

export type ReaderAudioActions = {
	toggle: () => void;
	skip: (seconds: number) => void;
	close: () => void;
	keepListening: () => void;
	openTranscript: () => void;
};

export function useEntryAudio(
	entryId: Id<"library_entries">,
	slug: string,
	hasAudio: boolean
): { state: ReaderAudio; clock: ReaderClock; actions: ReaderAudioActions } {
	const convex = useConvex();
	const posthog = usePostHog();
	const openPaywall = usePaywall((s) => s.open);
	// Keyed on server entitlement so buying Plus re-mints the full asset. Nothing mints until it
	// resolves, so a Plus reader never mints the preview first.
	const entitlement = useQuery(api.premium.getEntitlement);
	const isPlus = entitlement?.isPlus ?? false;
	const p = usePlayback(
		`${entryId}:${hasAudio}:${entitlement === undefined ? "pending" : isPlus}`,
		() =>
			hasAudio
				? entitlement === undefined
					? new Promise<never>(() => undefined) // the resolved key re-mints
					: convex.query(api.library.audio.getEntryAudio, { entryId })
				: Promise.resolve(null),
		(t) => ({ artist: "Lantern", artworkUrl: t.coverUrl, title: t.title })
	);
	const [started, setStarted] = useState(false);
	const played = useRef(false); // once per open, not per resume

	// Latched per URL so a re-mint clears it; didJustFinish is one status tick wide.
	const [endedUrl, setEndedUrl] = useState<string>();
	if (p.didJustFinish && p.track?.preview && endedUrl !== p.track.url) {
		setEndedUrl(p.track.url);
	}
	const previewEnded = !!p.track && endedUrl === p.track.url;
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
	// Audio can end while backgrounded and the token lapsed (#472): wait for auth.
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

	const preview = p.track?.preview ?? false;
	// The actions keep one identity for the reader's life and read the playback as it is when
	// tapped: the reader's context doesn't change with every status tick.
	const once = usePushOnce();
	const live = useRef({ isPlus, p, previewEnded });
	useLayoutEffect(() => {
		live.current = { isPlus, p, previewEnded };
	});
	const [actions] = useState<ReaderAudioActions>(() => ({
		close: () => {
			if (live.current.p.isPlaying) {
				live.current.p.toggle();
			}
			setStarted(false);
		},
		keepListening: () => {
			trackLibrary(posthog, "library_paywall_tapped", {
				slug,
				trigger: "audio_preview",
			});
			openPaywall("library_audio");
		},
		openTranscript: () =>
			once(() =>
				router.push({ params: { entryId }, pathname: "/reader-transcript" })
			),
		skip: (by) => {
			const now = live.current.p;
			now.seekTo(now.currentTime + by * SKIP_S);
		},
		toggle: () => {
			// Listen, play and pause: a light impact (handoff §12).
			tap();
			setStarted(true);
			const now = live.current;
			if (now.previewEnded) {
				return; // the dock shows the upsell
			}
			if (!played.current) {
				played.current = true;
				trackLibrary(posthog, "library_audio_played", {
					preview: now.p.track?.preview ?? !now.isPlus,
					slug,
				});
			}
			now.p.toggle();
		},
	}));
	return {
		actions,
		clock: { currentTime: p.currentTime, duration: p.duration },
		state: {
			failed: p.error !== null,
			playing: p.isPlaying,
			preview,
			previewEnded,
			started,
			transcript: !!p.track && !preview,
		},
	};
}
