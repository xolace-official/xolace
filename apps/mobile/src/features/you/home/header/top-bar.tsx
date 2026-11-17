import { View } from "react-native";
import {
	useCollapseProgress,
	useCollapsingTabsContext,
	useHeaderScrollY,
} from "react-native-collapsible-tab";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { BandBlur } from "@/components/shared/band-blur";
import { Image } from "@/components/shared/styled";
import { useYouHome } from "@/features/you/home/you-data";
import { useOSReduceTransparency } from "@/lib/os-reduce-transparency";
import { useTokenColor } from "@/lib/use-token-color";

// Collapse px over which the top bar goes from clear to solid (production).
const BAR_FADE_RANGE = [8, 40];
// The name shows once the hero is nearly gone (production).
const TITLE_FADE_RANGE = [0.75, 1];
/** Once docked, the band reaches under the pills. */
const DOCK_RANGE = [0.97, 1];
/** The tab bar's height. */
const TABS_H = 52;
/** How far the bar's fade runs below what it covers. */
const EDGE = 28;
/** The band starts this far above the bar's foot, so the pills sit in it. */
const OVERLAP = 14;
/** Solid down to here under the pills. */
const UNDER_PILLS = 6;

/**
 * Production's top bar, pinned under the native header's buttons: it lives inside the header
 * (the library's hooks only work there) and rides back down by the collapsed distance. A soft
 * scroll edge rather than a slab: the page fades and blurs under it, and once docked it reaches
 * under the pills. Reduce Transparency: a solid bar. The title is the avatar and the name.
 */
export function TopBar({ height }: { height: number }) {
	const insets = useSafeAreaInsets();
	const page = useTokenColor("background");
	const solid = useOSReduceTransparency();
	const scrollY = useHeaderScrollY();
	// The header stops at the collapse range, but the raw value can run past it (a long jump).
	const { collapseRangeSV } = useCollapsingTabsContext();
	const progress = useCollapseProgress();
	const { avatar, hero } = useYouHome().state;

	const barStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			scrollY.get(),
			BAR_FADE_RANGE,
			[0, 1],
			Extrapolation.CLAMP
		),
		transform: [{ translateY: Math.min(scrollY.get(), collapseRangeSV.get()) }],
	}));
	// Under the pills only once docked, so the open header's tabs never sit under a band.
	const dockStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			DOCK_RANGE,
			[0, 1],
			Extrapolation.CLAMP
		),
	}));
	const titleStyle = useAnimatedStyle(() => ({
		opacity: interpolate(
			progress.get(),
			TITLE_FADE_RANGE,
			[0, 1],
			Extrapolation.CLAMP
		),
	}));

	const edge = solid ? 0 : EDGE;
	return (
		<Animated.View
			className="absolute top-0 right-0 left-0 z-10"
			pointerEvents="none"
			style={[{ height: height + TABS_H + edge }, barStyle]}
		>
			<View
				className="absolute top-0 right-0 left-0"
				style={{ height: height + edge }}
			>
				{solid ? (
					<View className="flex-1 bg-background" />
				) : (
					<BandBlur
						height={height + edge}
						page={page}
						solid={height - OVERLAP}
					/>
				)}
			</View>
			<Animated.View
				className="absolute right-0 left-0"
				style={[
					{ height: TABS_H + OVERLAP + edge, top: height - OVERLAP },
					dockStyle,
				]}
			>
				{solid ? (
					<View className="flex-1 bg-background" />
				) : (
					<BandBlur
						height={TABS_H + OVERLAP + edge}
						page={page}
						solid={TABS_H + UNDER_PILLS}
					/>
				)}
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden
				className="absolute right-20 left-20 flex-row items-center justify-center gap-2"
				importantForAccessibility="no-hide-descendants"
				// The native header's band below the status bar.
				style={[{ height: height - insets.top, top: insets.top }, titleStyle]}
			>
				{avatar ? (
					<Image
						className="size-6.5 rounded-full"
						source={{ uri: avatar.url }}
					/>
				) : null}
				<AppText
					className="text-[15px]"
					numberOfLines={1}
					variant="callout"
					weight="semibold"
				>
					{hero?.name}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}
