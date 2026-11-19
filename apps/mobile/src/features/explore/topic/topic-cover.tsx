import { Link } from "expo-router";
import { View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { TOPIC_SCRIM } from "@/features/explore/cover-palette";
import { countLine, type TopicHeader } from "@/features/explore/explore-model";
import {
	EX_TIMING,
	NAME_TYPE,
	PARALLAX,
	TOPIC,
} from "@/features/explore/explore-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

/**
 * The topic's art, drawn as the scroll content's first layer but held back against the scroll, so
 * on screen it moves at half speed; a pull stretches it from the top (1.5× at −200). It lives in
 * the scroll view so the scroll view stays the screen's first child (the bar's options reach it).
 */
export function TopicCover({
	header,
	y,
	height,
}: {
	header: TopicHeader;
	y: SharedValue<number>;
	height: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const move = useAnimatedStyle(() => {
		const v = y.get();
		// On screen: −v × rate. In the content, which moves by −v, that is +v × (1 − rate).
		if (reduced) {
			return { transform: [{ translateY: v }, { scale: 1 }] };
		}
		if (v >= 0) {
			return {
				transform: [{ translateY: v * (1 - PARALLAX.rate) }, { scale: 1 }],
			};
		}
		const s = interpolate(
			v,
			[-PARALLAX.pull, 0],
			[PARALLAX.stretch, 1],
			Extrapolation.CLAMP
		);
		// Pinned to the screen's top, scaled about its centre, then moved down by half the growth.
		return {
			transform: [{ translateY: v + ((s - 1) * height) / 2 }, { scale: s }],
		};
	});
	const box = { height, width: "100%" } as const;

	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute inset-x-0 top-0 bg-surface-secondary"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[{ height }, move]}
		>
			<CoverImage
				recyclingKey={header.slug}
				style={box}
				thumbhash={header.thumbhash}
				uri={header.thumbUrl}
			/>
			<LinearGradient
				className="absolute inset-0"
				colors={TOPIC_SCRIM.colors}
				locations={TOPIC_SCRIM.locations}
			/>
		</Animated.View>
	);
}

/** The cover's resting frame: the `Link.AppleZoomTarget` a Topics tile zooms into. */
export function CoverZoomTarget({ height }: { height: number }) {
	return (
		<Link.AppleZoomTarget>
			<View
				className="absolute inset-x-0 top-0"
				pointerEvents="none"
				style={{ height }}
			/>
		</Link.AppleZoomTarget>
	);
}

const NAME_TIMING = { duration: EX_TIMING.edgeMs, ...PLAY_AS_CHOSEN };

/** The name and count line on the cover; they fade out as the name moves into the bar. */
export function CoverName({
	header,
	hidden,
}: {
	header: TopicHeader;
	hidden: boolean;
}) {
	const style = useAnimatedStyle(() => ({
		opacity: withTiming(hidden ? 0 : 1, NAME_TIMING),
	}));
	return (
		<Animated.View
			className="absolute"
			style={[
				{
					bottom: TOPIC.nameBottom,
					gap: TOPIC.nameGap,
					left: TOPIC.nameX,
					right: TOPIC.nameX,
				},
				style,
			]}
		>
			<AppText
				accessibilityElementsHidden={hidden}
				accessibilityRole="header"
				className="text-cover-ink"
				numberOfLines={1}
				style={NAME_TYPE}
				variant="display"
			>
				{header.title}
			</AppText>
			<AppText
				className="text-[14.5px] text-cover-ink/88 leading-[18px]"
				variant="subhead"
			>
				{countLine(header)}
			</AppText>
		</Animated.View>
	);
}
