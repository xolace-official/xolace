import { api } from "@xolace/backend/api";
import { INTAKE_V2_VERSION } from "@xolace/backend/convex/lib/validators";
import { useConvex, usePaginatedQuery, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import { useFullContext } from "@/lib/convex/use-full-context";
import { useStableQuery } from "@/lib/convex/use-stable-query";
import {
	useNowPlaying,
	useNowPlayingIsPlaying,
} from "@/lib/now-playing/now-playing-store";
import { campfireView } from "./campfire/campfire-model";
import { kindlingView } from "./kindling/kindling-model";
import { useKeptKindling } from "./kindling/use-kept-kindling";
import { momentView } from "./moments/moments-model";
import { railTiles } from "./rail/rail-model";
import { campfireSettled } from "./today-model";
import { wordLine } from "./word/word-model";

type CampfireStats = FunctionReturnType<typeof api.intake.campfireStats>;

/**
 * The v2 intake's campfire count, read once per mount and only when asked: it scans recent
 * sessions app-wide, so a live subscription would re-run on every user's session (as
 * production's Discovery read it). A failed read shows nothing. `settled` once it answered
 * or failed, so the launch cover can wait for it.
 */
function useCampfireStatsOnce(wanted: boolean): {
	stats: CampfireStats | null;
	settled: boolean;
} {
	const convex = useConvex();
	const [read, setRead] = useState<{
		stats: CampfireStats | null;
		settled: boolean;
	}>({ settled: false, stats: null });
	useEffect(() => {
		if (!wanted) {
			return;
		}
		let cancelled = false;
		convex
			.query(api.intake.campfireStats, {})
			.then((stats) => {
				if (!cancelled) {
					setRead({ settled: true, stats });
				}
			})
			.catch(() => {
				if (!cancelled) {
					setRead({ settled: true, stats: null });
				}
			});
		return () => {
			cancelled = true;
		};
	}, [convex, wanted]);
	return read;
}

/** Your kindling (`withRead`/`withTry`: this client draws every kind of step) and the campfire. */
export function useModules() {
	const active = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});
	const cohort = useQuery(api.cohort.getWeeklyCohortCard);
	// v2 cut the intake's campfire count; it stands in for the cohort until there's a
	// weekly number of their own (#712), as on production's Discovery.
	const context = useFullContext();
	const v2Intake = context?.intake?.intakeVersion === INTAKE_V2_VERSION;
	const { stats, settled } = useCampfireStatsOnce(
		cohort?.status === "hidden" && v2Intake
	);
	// A tended kindling's last step still celebrates once the server closes it.
	const kindling = useKeptKindling(
		active === undefined ? undefined : kindlingView(active)
	);
	return {
		campfire: campfireView(cohort, stats, v2Intake),
		campfireSettled: campfireSettled(
			cohort?.status,
			context === undefined ? undefined : v2Intake,
			settled
		),
		kindling,
	};
}

const HOUR_MS = 3_600_000;
const HOURS_IN_DAY = 24;
const utcClock = () => {
	const hour = Math.floor(Date.now() / HOUR_MS);
	return { day: Math.floor(hour / HOURS_IN_DAY), hour };
};

/**
 * UTC days and hours since epoch, the New shelf's rotation args, re-read on every return to
 * the foreground (a backgrounded app can live for days). As production's `useUtcDay`.
 */
function useUtcClock() {
	const [clock, setClock] = useState(utcClock);
	useEffect(() => {
		const sub = AppState.addEventListener("change", (state) => {
			if (state === "active") {
				setClock(utcClock());
			}
		});
		return () => sub.remove();
	}, []);
	return clock;
}

/** The moments carousel shows the first page only: the free tier's window applies. */
const MOMENT_COUNT = 4;

/** The rail, what's playing, your moments and today's word. */
export function useLowerModules() {
	// The rotation's args change with the hour on foreground: hold the last shelf meanwhile,
	// so the rail doesn't drop out and back.
	const shelf = useStableQuery(api.browse.hub.getNewShelf, useUtcClock());
	const nowPlaying = useNowPlaying();
	const isPlaying = useNowPlayingIsPlaying();
	const timeline = usePaginatedQuery(
		api.sessions.listForTimeline,
		{},
		{ initialNumItems: MOMENT_COUNT }
	);
	const quote = useQuery(api.dailyQuotes.getToday);
	const { isPlus, isLoading } = usePlusEntitlement();
	return {
		// As every catalogue surface: locked only once the entitlement is known to be free.
		listenLocked: !(isLoading || isPlus),
		moments:
			timeline.status === "LoadingFirstPage"
				? undefined
				: timeline.results.slice(0, MOMENT_COUNT).map(momentView),
		playingSlug: isPlaying ? (nowPlaying?.slug ?? null) : null,
		rail: shelf === undefined ? undefined : railTiles(shelf),
		word: wordLine(quote),
	};
}
