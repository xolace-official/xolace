import { useCollapsingTabsContext } from "react-native-collapsible-tab";
import { useAnimatedReaction } from "react-native-reanimated";
import { nextCollapse } from "@/features/you/home/header/header-collapse";

/**
 * Re-anchors the header's collapse to the active tab's offset each time the header's measured
 * height changes (`nextCollapse` says why). It runs on the UI thread in the frame the range
 * shared value lands. The library writes that value in an effect after the commit that applies
 * the new content inset, so a slow JS frame can still show one frame at the old collapse.
 * Must render inside `Tabs.Container`.
 */
export function useCollapseFollowsRange() {
	const { collapse, collapseRangeSV, offsets, activeIndexSV } =
		useCollapsingTabsContext();
	useAnimatedReaction(
		() => collapseRangeSV.get(),
		(range, before) => {
			const next = nextCollapse({
				before,
				offset: offsets[Math.round(activeIndexSV.get())]?.get(),
				range,
			});
			if (next !== null) {
				collapse.set(next);
			}
		}
	);
}
