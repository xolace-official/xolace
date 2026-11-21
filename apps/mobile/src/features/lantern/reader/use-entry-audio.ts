import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useConvex, useConvexAuth, useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { logDropped } from "@/features/lantern/reader/use-read-signals";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlayback } from "@/lib/audio/use-playback";
import { tap } from "@/lib/haptics";
import { trackLibrary } from "@/lib/library-analytics";
import { usePushOnce } from "@/lib/use-push-once";

const SKIP_S = 15;

export type ReaderAudio = {
	started: boolean;
	playing: boolean;
	preview: boolean;
	previewEnded: boolean;
	failed: boolean;
	transcript: boolean;
};

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
	const entitlement = useQuery(api.premium.getEntitlement);
	const isPlus = entitlement?.isPlus ?? false;
	const p = usePlayback(
		`${entryId}:${hasAudio}:${entitlement === undefined ? "pending" : isPlus}`,
		() =>
			hasAudio
				? entitlement === undefined
					? new Promise<never>(() => undefined)
					: convex.query(api.library.audio.getEntryAudio, { entryId })
				: Promise.resolve(null),
		(t) => ({ artist: "Lantern", artworkUrl: t.coverUrl, title: t.title })
	);
	const [started, setStarted] = useState(false);
	const played = useRef(false);

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
			tap();
			setStarted(true);
			const now = live.current;
			if (now.previewEnded) {
				return;
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
