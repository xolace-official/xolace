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
import { heldEmptyMode, kindlingEmptyMode } from "./kindling/card-mode";
import { kindlingView } from "./kindling/kindling-model";
import { useKeptKindling } from "./kindling/use-kept-kindling";
import { momentView } from "./moments/moments-model";
import { railTiles } from "./rail/rail-model";
import { campfireSettled } from "./today-model";
import { wordLine } from "./word/word-model";

type CampfireStats = FunctionReturnType<typeof api.intake.campfireStats>;

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

export function useModules() {
	const active = useQuery(api.paths.getActive, {
		withRead: true,
		withTry: true,
	});
	const { isPlus, isLoading } = usePlusEntitlement();
	const settingUp = useQuery(api.paths.settingUp.get, isPlus ? {} : "skip");
	const empty = kindlingEmptyMode({ isLoading, isPlus, settingUp });
	const [lastEmpty, setLastEmpty] = useState(empty);
	if (empty !== undefined && empty !== lastEmpty) {
		setLastEmpty(empty);
	}
	const cohort = useQuery(api.cohort.getWeeklyCohortCard);
	const context = useFullContext();
	const v2Intake = context?.intake?.intakeVersion === INTAKE_V2_VERSION;
	const { stats, settled } = useCampfireStatsOnce(
		cohort?.status === "hidden" && v2Intake
	);
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
		kindlingEmpty: heldEmptyMode(lastEmpty, empty),
	};
}

const HOUR_MS = 3_600_000;
const HOURS_IN_DAY = 24;
const utcClock = () => {
	const hour = Math.floor(Date.now() / HOUR_MS);
	return { day: Math.floor(hour / HOURS_IN_DAY), hour };
};

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

const MOMENT_COUNT = 4;

export function useLowerModules() {
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
