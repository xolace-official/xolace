/**
 * This week's reads: the week the card is on (`profile.getWeekIntensity`, which pages only for
 * Xolace+) and B8's usual band (`profile.getUsualBand`, the same whichever week). Plus the
 * earlier-weeks gate, with production's analytics.
 */
import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { useState } from "react";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import {
	type IntensityDay,
	type Usual,
	weekStart,
} from "@/features/you/home/week/week-model";
import { useStableQuery } from "@/lib/convex/use-stable-query";

/** What the This week card draws. */
export type IntensityWeek = {
	days: IntensityDay[];
	usual: Usual | null;
	/** 0 is this week; Xolace+ pages back. */
	offset: number;
	earliest: boolean;
	label: string;
	/** Xolace+ pages with arrows; free users see the frosted earlier-weeks gate. */
	pager: boolean;
	/** Monday of the week shown, local. */
	start: Date;
};

const FEATURE = "intensity_history";

export function useYouWeek(enabled: boolean, sessionCount: number) {
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const openPaywall = usePaywall((s) => s.open);
	const [offset, setOffset] = useState(0);
	// A lapse mid-paging must not strand the read on a locked week.
	const asked = isPlus ? offset : 0;
	// Stable, so paging doesn't blank the card and replay its entrance.
	const week = useStableQuery(
		api.profile.getWeekIntensity,
		enabled ? { weekOffset: asked } : "skip"
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
			/** Production's gate hit, then the paywall. Free users only. */
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
			pageWeek: (by: -1 | 1) => setOffset((w) => Math.min(0, w + by)),
			/** The card was seen: production's teaser analytics. */
			weekSeen: () => posthog.capture("teaser_viewed", { feature: FEATURE }),
		},
		state,
	};
}
