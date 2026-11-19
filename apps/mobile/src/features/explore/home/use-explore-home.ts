import { api } from "@xolace/backend/api";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { toast } from "@/components/shared/toast";
import { HOME } from "@/features/explore/copy";
import type {
	Home,
	HomeFrom,
	HomeState,
} from "@/features/explore/home/home-data";
import type { HomeItem, Playable } from "@/features/explore/home/home-model";
import { useListen } from "@/features/explore/use-listen";
import { useTodayPhase } from "@/lib/day-clock";
import { playSoftPress, tap } from "@/lib/haptics";
import type { ReaderFrom } from "@/lib/library-analytics";
import {
	nowPlayingPlayback,
	retryNowPlaying,
	setNowPlaying,
	togglePlayback,
} from "@/lib/now-playing/now-playing-store";
import { mintOf, playStep } from "@/lib/now-playing/play-on-load";
import { usePushOnce } from "@/lib/use-push-once";
import { useUtcDay } from "@/lib/use-utc-day";

const DOOR_HREF = {
	lantern: "/explore/library",
	music: "/explore/list?family=music",
	support: "/explore/list?family=support",
	topics: "/explore/topics",
} as const;

/** The reader, as Lantern's `readerHref` (a feature Explore can't import). */
const readerHref = (slug: string, from: ReaderFrom) =>
	({ params: { from, slug }, pathname: "/library/[slug]" }) as const;

/**
 * Explore home's data (B6, B7): the shelves, Today's phase for For the hour, and what a tap does.
 * The only file here that calls Convex, PostHog or the toast.
 */
export function useExploreHome(): Home {
	const posthog = usePostHog();
	const pushOnce = usePushOnce();
	const phase = useTodayPhase();
	const clock = useUtcDay();
	const cont = useQuery(api.browse.explore.getContinue, {});
	const forYou = useQuery(api.browse.explore.forYou, {});
	const hour = useQuery(api.browse.explore.getForHour, {
		day: clock.day,
		phase,
	});
	const short = useQuery(api.browse.explore.getShort, { day: clock.day });
	const featured = useQuery(api.browse.hub.getFeatured, {});
	const fresh = useQuery(api.browse.hub.getNewShelf, clock);
	const setUsesSessions = useMutation(
		api.preferences.explore.setUsesSessions
	).withOptimisticUpdate((store) => {
		store.setQuery(api.browse.explore.forYou, {}, null);
	});
	const hide = useMutation(
		api.preferences.explore.hideContinueItem
	).withOptimisticUpdate((store, { item }) => {
		const now = store.getQuery(api.browse.explore.getContinue, {});
		if (now !== undefined) {
			store.setQuery(
				api.browse.explore.getContinue,
				{},
				now.filter((c) => !(c.kind === item.kind && c.id === item.id))
			);
		}
	});
	const listen = useListen("explore-hour");

	useEffect(() => {
		posthog.capture("browse_opened");
	}, [posthog]);

	/** Plays `t` here, whatever's loaded; false when it's the paywall's instead. */
	const start = (t: Playable, from: HomeFrom, at?: number) => {
		const p = nowPlayingPlayback();
		const step = playStep({
			loaded: listen.nowPlaying,
			locked: listen.locked,
			mint: mintOf(p),
			playing: p.isPlaying,
			slug: t.slug,
		});
		if (step === "paywall") {
			return false;
		}
		if (step === "resume") {
			togglePlayback(p, posthog);
		} else if (step === "reload") {
			setNowPlaying({ from, slug: t.slug }, { at, play: true });
			retryNowPlaying();
		} else if (step === "load") {
			setNowPlaying({ from, slug: t.slug }, { at, play: true });
		}
		return true;
	};

	const openEntry = (slug: string, from: ReaderFrom) => {
		playSoftPress();
		pushOnce(() => router.push(readerHref(slug, from)));
	};

	const open = (it: HomeItem, from: HomeFrom) => {
		if (it.kind === "entry") {
			openEntry(it.entry.slug, "explore");
			return;
		}
		listen.open(it.track, from);
	};

	const state: HomeState = {
		canPreview: false,
		cont,
		featured,
		forYou,
		fresh,
		hearing: null,
		hour,
		locked: listen.locked,
		nowPlaying: listen.nowPlaying,
		phase,
		playing: listen.playing,
		short,
	};

	return {
		actions: {
			door: (id) => {
				playSoftPress();
				pushOnce(() => router.push(DOOR_HREF[id]));
			},
			hearEnd: () => undefined,
			hearStart: () => undefined,
			open,
			playHere: (t, from, at) => {
				tap();
				if (t.slug === listen.nowPlaying) {
					togglePlayback(nowPlayingPlayback(), posthog);
					return;
				}
				if (!start(t, from, at)) {
					listen.open(t, from);
				}
			},
			removeContinue: (c) => {
				const item =
					c.kind === "track"
						? { id: c.id, kind: c.kind }
						: { id: c.id, kind: c.kind };
				hide({ item }).catch((e) => {
					console.error("[useExploreHome] hideContinueItem failed:", e);
				});
			},
			resume: (c) => {
				if (c.kind === "entry") {
					openEntry(c.entry.slug, "continue");
					return;
				}
				// From the saved place, unless it's already the one loaded (the player just opens).
				if (c.track.slug !== listen.nowPlaying && !listen.locked) {
					setNowPlaying(
						{ from: "explore-continue", slug: c.track.slug },
						{ at: c.positionSec, play: true }
					);
				}
				listen.open(c.track, "explore-continue");
			},
			stopUsingSessions: () => {
				setUsesSessions({ usesSessions: false })
					.then(() => toast(HOME.noSessionsDone))
					.catch((e) => {
						console.error("[useExploreHome] setUsesSessions failed:", e);
					});
			},
		},
		state,
	};
}
