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

const BAR_FADE_RANGE = [8, 40];
const TITLE_FADE_RANGE = [0.75, 1];
const DOCK_RANGE = [0.97, 1];
const EDGE = 28;
const OVERLAP = 14;
const UNDER_PILLS = 6;

export function TopBar({ height }: { height: number }) {
	const insets = useSafeAreaInsets();
	const page = useTokenColor("background");
	const solid = useOSReduceTransparency();
	const scrollY = useHeaderScrollY();
	const { collapseRangeSV, tabBarHeight } = useCollapsingTabsContext();
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
			style={[{ height: height + tabBarHeight + edge }, barStyle]}
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
					{ height: tabBarHeight + OVERLAP + edge, top: height - OVERLAP },
					dockStyle,
				]}
			>
				{solid ? (
					<View className="flex-1 bg-background" />
				) : (
					<BandBlur
						height={tabBarHeight + OVERLAP + edge}
						page={page}
						solid={tabBarHeight + UNDER_PILLS}
					/>
				)}
			</Animated.View>
			<Animated.View
				accessibilityElementsHidden
				className="absolute right-20 left-20 flex-row items-center justify-center gap-2"
				importantForAccessibility="no-hide-descendants"
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
