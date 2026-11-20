import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	type IntensityDay,
	pagedOffset,
	type Usual,
	weekStart,
} from "@/features/you/home/week/week-model";
import { useStableQuery } from "@/lib/convex/use-stable-query";

export type IntensityWeek = {
	days: IntensityDay[];
	usual: Usual | null;
	offset: number;
	earliest: boolean;
	label: string;
	pager: boolean;
	start: Date;
};

const FEATURE = "intensity_history";

export function useYouWeek(enabled: boolean, sessionCount: number) {
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const [offset, setOffset] = useState(0);
	const asked = isPlus ? offset : 0;
	const week = useStableQuery(
		api.profile.getWeekIntensity,
		enabled ? { weekOffset: asked, withDetail: true } : "skip"
	);
	const usual = useQuery(
		api.profile.intensity.getUsualBand,
		enabled ? {} : "skip"
	);

	const state: IntensityWeek | undefined =
		week && usual !== undefined
			? {
					days: week.days,
					earliest: week.isEarliestWeek,
					label: week.weekLabel,
					offset: week.weekOffset,
					pager: isPlus,
					start: weekStart(new Date(), week.weekOffset),
					usual,
				}
			: undefined;

	return {
		actions: {
			openEarlierWeeks: () => {
				if (isLoading || isPlus) {
					return;
				}
				posthog.capture("premium_gate_hit", {
					feature: FEATURE,
					hasData: sessionCount > 0,
					sessionCount,
				});
				openPaywall("week_intensity");
			},
			pageWeek: (by: -1 | 1) => {
				if (week) {
					setOffset(
						pagedOffset({
							by,
							earliest: week.isEarliestWeek,
							shown: week.weekOffset,
						})
					);
				}
			},
			weekSeen: () => posthog.capture("teaser_viewed", { feature: FEATURE }),
		},
		state,
	};
}
