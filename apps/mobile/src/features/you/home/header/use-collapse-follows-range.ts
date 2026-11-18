import { useCollapsingTabsContext } from "react-native-collapsible-tab";
import { useAnimatedReaction } from "react-native-reanimated";
import { collapseForRange } from "@/features/you/home/header/header-collapse";

/**
 * Re-anchors the header's collapse to the active tab's offset each time the header's measured
 * height changes (`collapseForRange` says why). On the UI thread, the frame the range lands.
 * Must render inside `Tabs.Container`.
 */
export function useCollapseFollowsRange() {
	const { collapse, collapseRangeSV, offsets, activeIndexSV } =
		useCollapsingTabsContext();
	useAnimatedReaction(
		() => collapseRangeSV.get(),
		(range, before) => {
			if (before === null || range === before) {
				return;
			}
			const offset = offsets[Math.round(activeIndexSV.get())]?.get() ?? 0;
			collapse.set(collapseForRange(offset, range));
		}
	);
}
