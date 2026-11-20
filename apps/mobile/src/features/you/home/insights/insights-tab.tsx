import { useEffect, useRef } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import {
	Tabs,
	useCollapsingTabsContext,
	useTabPageContext,
} from "react-native-collapsible-tab";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DaysCard } from "@/features/you/home/insights/days-card";
import { Chips, Patterns } from "@/features/you/home/insights/patterns";
import { PlusRow, RankCard } from "@/features/you/home/insights/rank-card";
import { SteadinessCard } from "@/features/you/home/steadiness/steadiness-card";
import { WeekCard } from "@/features/you/home/week/week-card";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi } from "@/features/you/home/you-ui";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const UNDER_PILLS = 12;
const PAST_DOCK = 2;
const SCROLL_AFTER_MS = 220;
const TAB_BAR_ROOM = 110;

export function InsightsTab({ minHeader }: { minHeader: number }) {
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const { state, actions } = useYouHome();
	const { scrollTo } = useYouUi();
	const { scrollRef } = useTabPageContext();
	const { collapseRangeSV, tabBarHeight } = useCollapsingTabsContext();
	const cardY = useRef({ days: 0, top: 0, week: 0 });
	const tabBar = useRef(tabBarHeight);
	useEffect(() => {
		tabBar.current = tabBarHeight;
	}, [tabBarHeight]);
	const measure = (card: "days" | "week") => (e: LayoutChangeEvent) => {
		cardY.current[card] = e.nativeEvent.layout.y;
	};

	useEffect(() => {
		if (!scrollTo) {
			return;
		}
		const timer = setTimeout(() => {
			const dock = collapseRangeSV.get() + PAST_DOCK;
			const y = Math.max(
				dock,
				cardY.current[scrollTo.target] -
					minHeader -
					tabBar.current -
					UNDER_PILLS
			);
			scrollRef.current?.scrollTo({ animated: !reduced, y });
		}, SCROLL_AFTER_MS);
		return () => clearTimeout(timer);
	}, [scrollTo, collapseRangeSV, minHeader, scrollRef, reduced]);

	return (
		<Tabs.ScrollView
			contentContainerStyle={{
				gap: 14,
				paddingBottom: insets.bottom + TAB_BAR_ROOM,
				paddingHorizontal: 20,
				paddingTop: 16,
			}}
			showsVerticalScrollIndicator={false}
		>
			{state.steadiness ? (
				<SteadinessCard
					card={state.steadiness}
					onSeeAll={actions.openSteadiness}
				/>
			) : null}
			{state.days ? (
				<View onLayout={measure("days")}>
					<DaysCard history={state.days} />
				</View>
			) : null}
			{state.chips.length > 0 ? <Chips tags={state.chips} /> : null}
			{state.patterns.length > 0 ? <Patterns rows={state.patterns} /> : null}
			{state.rank ? <RankCard rank={state.rank} /> : null}
			{state.intensity ? (
				<View onLayout={measure("week")}>
					<WeekCard week={state.intensity} />
				</View>
			) : null}
			{state.plusRow ? <PlusRow onPress={actions.openPlus} /> : null}
		</Tabs.ScrollView>
	);
}
