import { api } from "@xolace/backend/api";
import { usePaginatedQuery, useQuery } from "convex/react";
import { useObserve } from "expo-observe";
import { usePostHog } from "posthog-react-native";
import { useEffect, useRef } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { MomentsScreenData } from "@/features/you/moments/moments-data";
import { itemsOf } from "@/features/you/moments/moments-model";

const PAGE = 15;
const FEATURE = "timeline_extended";

export function useMoments(): MomentsScreenData {
	const { results, status, loadMore } = usePaginatedQuery(
		api.sessions.listForTimeline,
		{},
		{ initialNumItems: PAGE }
	);
	const windowInfo = useQuery(api.sessions.getTimelineWindowInfo);
	const { isPlus } = usePlusEntitlement();
	const posthog = usePostHog();
	const openPaywall = usePaywall((s) => s.open);
	const { markInteractive } = useObserve();
	const seen = useRef(false);
	const loading = status === "LoadingFirstPage";

	useEffect(() => {
		if (!loading) {
			markInteractive();
		}
	}, [loading, markInteractive]);

	const hidden =
		!isPlus && status === "Exhausted" && windowInfo?.hasOlderSessions === true;

	return {
		actions: {
			doorSeen: () => {
				if (seen.current) {
					return;
				}
				seen.current = true;
				posthog.capture("teaser_viewed", { feature: FEATURE });
			},
			loadMore: () => loadMore(PAGE),
			seeAll: () => {
				posthog.capture("premium_gate_hit", { feature: FEATURE });
				openPaywall(FEATURE);
			},
		},
		state: loading
			? undefined
			: {
					canLoadMore: status === "CanLoadMore",
					items: itemsOf(results, new Date()),
					loadingMore: status === "LoadingMore",
					windowDays: hidden ? (windowInfo?.windowDays ?? null) : null,
				},
	};
}
