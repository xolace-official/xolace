import { useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	View,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { EX_TIMING } from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

/** Solid to the bar's bottom, then fading out this far below (the board's `.top .edge`). */
const EDGE_FADE = 24;

/**
 * The page colour behind the bar once content has scrolled under it (Explore's folded edge), in
 * over 220 ms. `fade` 0 is a topic's pinned band, whose bottom edge is the chips. A sibling after
 * the scroll view, never its wrapper: the native header tracks only a scroll view that is the
 * screen's first child.
 */
export function FoldedEdge({
	on,
	barBottom,
	fade = EDGE_FADE,
}: {
	on: boolean;
	barBottom: number;
	fade?: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const page = useTokenColor("background");
	const h = barBottom + fade;
	const style = useAnimatedStyle(() => ({
		opacity: withTiming(on ? 1 : 0, {
			duration: reduced ? REDUCED_FADE_MS : EX_TIMING.edgeMs,
			...PLAY_AS_CHOSEN,
		}),
	}));
	return (
		<Animated.View
			className="absolute inset-x-0 top-0"
			pointerEvents="none"
			style={[{ height: h }, style]}
		>
			{fade > 0 ? (
				<LinearGradient
					className="flex-1"
					colors={[page, page, clearOf(page)]}
					locations={[0, barBottom / h, 1]}
				/>
			) : (
				<View className="flex-1 bg-background" />
			)}
		</Animated.View>
	);
}

/** Content has scrolled a little under a small-title bar. */
const FOLD_AT = 2;
/** iOS 26's small-title bar is 54 tall (the scroll view's real inset is safe area + 54). */
const SMALL_BAR = 54;

/**
 * For screens with automatic insets: folded once the content moves past its resting offset. The
 * bar's bottom comes from the scroll view's own top inset, so the band ends exactly at the bar.
 */
export function useSmallBarFold(safeTop: number) {
	const [folded, setFolded] = useState(false);
	const [barBottom, setBarBottom] = useState(safeTop + SMALL_BAR);
	const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const inset = e.nativeEvent.contentInset.top;
		if (inset > 0 && inset !== barBottom) {
			setBarBottom(inset);
		}
		const now = e.nativeEvent.contentOffset.y + inset > FOLD_AT;
		if (now !== folded) {
			setFolded(now);
		}
	};
	return { barBottom, folded, onScroll };
}
