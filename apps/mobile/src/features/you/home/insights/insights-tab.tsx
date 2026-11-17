import { useEffect, useRef } from "react";
import { View } from "react-native";
import {
	Tabs,
	useCollapsingTabsContext,
	useTabPageContext,
} from "react-native-collapsible-tab";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DaysCard } from "@/features/you/home/insights/days-card";
import { Chips, Patterns } from "@/features/you/home/insights/patterns";
import { PlusRow, RankCard } from "@/features/you/home/insights/rank-card";
import { useYouHome } from "@/features/you/home/you-data";
import { useYouUi } from "@/features/you/home/you-ui";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/** The docked tab bar's height, and the room left under the pills when Your days scrolls up. */
const DOCKED_TABS = 52;
const UNDER_PILLS = 12;
/** Just past the collapse range, so the header stays docked. */
const PAST_DOCK = 2;
/** After the container's own restore of this tab's offset (the tap may have switched tabs). */
const SCROLL_AFTER_MS = 220;
const TAB_BAR_ROOM = 110;

/**
 * Insights: production's cards in production's order, gated the same way (Steadiness and This
 * week join them in S5b). The words card is gone. Hidden cards stay hidden.
 */
export function InsightsTab({ minHeader }: { minHeader: number }) {
	const insets = useSafeAreaInsets();
	const reduced = useEffectiveReducedMotion();
	const { state, actions } = useYouHome();
	const { scrollToDays } = useYouUi();
	const { scrollRef } = useTabPageContext();
	const { collapseRangeSV } = useCollapsingTabsContext();
	const daysY = useRef(0);

	// The header's week asks for Your days: scroll it up under the pills (a jump under Reduce
	// Motion).
	useEffect(() => {
		if (scrollToDays === 0) {
			return;
		}
		const dock = collapseRangeSV.get() + PAST_DOCK;
		const y = Math.max(
			dock,
			daysY.current - minHeader - DOCKED_TABS - UNDER_PILLS
		);
		const timer = setTimeout(
			() => scrollRef.current?.scrollTo({ animated: !reduced, y }),
			SCROLL_AFTER_MS
		);
		return () => clearTimeout(timer);
	}, [scrollToDays, collapseRangeSV, minHeader, scrollRef, reduced]);

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
			{state.days ? (
				<View
					onLayout={(e) => {
						daysY.current = e.nativeEvent.layout.y;
					}}
				>
					<DaysCard history={state.days} />
				</View>
			) : null}
			{state.chips.length > 0 ? <Chips tags={state.chips} /> : null}
			{state.patterns.length > 0 ? <Patterns rows={state.patterns} /> : null}
			{state.rank ? <RankCard rank={state.rank} /> : null}
			{state.plusRow ? <PlusRow onPress={actions.openPlus} /> : null}
		</Tabs.ScrollView>
	);
}
