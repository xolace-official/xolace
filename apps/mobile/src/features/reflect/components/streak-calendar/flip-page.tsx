/** Single page flip from the calendar-days sample: front is the old day, back the new. */

import { LinearGradient } from "expo-linear-gradient";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";

import { AppText } from "@/components/shared/app-text";
import type { CardColors, CardMetrics } from "./constants";

type FaceVariant = "front" | "back";

type DepthShadowProps = {
	flipProgress: SharedValue<number>;
	variant: FaceVariant;
};

const DepthShadow = ({ flipProgress, variant }: DepthShadowProps) => {
	const rShadowStyle = useAnimatedStyle(() => {
		const progress = flipProgress.get();
		const opacity =
			variant === "front"
				? interpolate(progress, [0, 0.5], [0, 0.3], Extrapolation.CLAMP)
				: interpolate(progress, [0.5, 1], [0.3, 0], Extrapolation.CLAMP);
		return { opacity };
	});

	return (
		<Animated.View
			pointerEvents="none"
			style={[rShadowStyle, styles.depthShadow]}
		>
			<LinearGradient
				colors={["rgba(0,0,0,0.3)", "transparent"]}
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
};

type PageFaceProps = {
	day: number;
	variant: FaceVariant;
	flipProgress: SharedValue<number>;
	metrics: CardMetrics;
	colors: CardColors;
};

const PageFace = ({
	day,
	variant,
	flipProgress,
	metrics,
	colors,
}: PageFaceProps) => {
	const isFront = variant === "front";

	const rVisibilityStyle = useAnimatedStyle(() => {
		const progress = flipProgress.get();
		return {
			opacity: isFront ? (progress < 0.5 ? 1 : 0) : progress >= 0.5 ? 1 : 0,
		};
	});

	return (
		<Animated.View
			style={[
				rVisibilityStyle,
				styles.face,
				{
					backgroundColor: colors.body,
					borderBottomLeftRadius: metrics.innerRadius,
					borderBottomRightRadius: metrics.innerRadius,
					height: metrics.pageSize,
					width: metrics.size,
				},
			]}
		>
			<LinearGradient
				colors={
					isFront
						? ["rgba(0,0,0,0.04)", "transparent"]
						: ["transparent", "rgba(0,0,0,0.04)"]
				}
				style={isFront ? styles.foldGradientTop : styles.foldGradientBottom}
			/>
			<View
				style={[
					styles.numberContainer,
					{
						height: metrics.bodyHeight,
						transform: isFront
							? [
									{ translateY: -metrics.pageSize / 2 },
									{ rotate: "180deg" },
									{ scaleX: -1 },
									{ scaleY: -1 },
								]
							: [
									{ translateY: -metrics.pageSize / 2 },
									{ rotate: "180deg" },
									{ scaleX: -1 },
								],
					},
				]}
			>
				<AppText
					className="font-bold"
					style={[
						styles.numberText,
						{ color: colors.number, fontSize: metrics.numberFontSize },
					]}
				>
					{day}
				</AppText>
			</View>
			<DepthShadow flipProgress={flipProgress} variant={variant} />
		</Animated.View>
	);
};

type FlipPageProps = {
	flipProgress: SharedValue<number>;
	frontDay: number;
	backDay: number;
	metrics: CardMetrics;
	colors: CardColors;
};

export const FlipPage = ({
	flipProgress,
	frontDay,
	backDay,
	metrics,
	colors,
}: FlipPageProps) => {
	const rFlipStyle = useAnimatedStyle(() => {
		const progress = flipProgress.get();
		return {
			transform: [
				{ perspective: Platform.OS === "ios" ? 400 : 10_000 },
				{ translateY: -metrics.pageSize / 2 },
				{ rotateX: `${progress * 180}deg` },
				{ translateY: metrics.pageSize / 2 },
			],
			zIndex: progress < 0.5 ? 2 : 4,
		};
	});

	return (
		<Animated.View
			style={[
				rFlipStyle,
				styles.pageContainer,
				{
					height: metrics.pageSize,
					top: metrics.pageSize,
					width: metrics.size,
				},
			]}
		>
			<PageFace
				colors={colors}
				day={frontDay}
				flipProgress={flipProgress}
				metrics={metrics}
				variant="front"
			/>
			<PageFace
				colors={colors}
				day={backDay}
				flipProgress={flipProgress}
				metrics={metrics}
				variant="back"
			/>
		</Animated.View>
	);
};

const DEPTH_SHADOW_BG = "rgba(0,0,0,0.1)";

const styles = StyleSheet.create({
	depthShadow: {
		backgroundColor: DEPTH_SHADOW_BG,
		bottom: 0,
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
	},
	face: {
		alignItems: "center",
		borderCurve: "continuous",
		justifyContent: "center",
		overflow: "hidden",
		position: "absolute",
	},
	foldGradientBottom: {
		bottom: 0,
		height: 10,
		left: 0,
		position: "absolute",
		right: 0,
		zIndex: 9,
	},
	foldGradientTop: {
		height: 10,
		left: 0,
		position: "absolute",
		right: 0,
		top: 0,
		zIndex: 9,
	},
	numberContainer: {
		alignItems: "center",
		justifyContent: "center",
	},
	numberText: {
		includeFontPadding: false,
		textAlign: "center",
		textAlignVertical: "center",
	},
	pageContainer: {
		position: "absolute",
		transformOrigin: ["50%", "50%", 0.005],
	},
});
