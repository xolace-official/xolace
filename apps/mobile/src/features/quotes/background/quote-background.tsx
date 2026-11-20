import MaskedView from "@react-native-masked-view/masked-view";
import { BlurView as ExpoBlurView } from "expo-blur";
import { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedProps,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { EASE, SOFT, slice, T, useQuoteMotion } from "../motion/quote-motion";
import { type QuoteBackground as Background, readyOn } from "../quotes-model";
import { SCRIM_CLEAR, scrimOf } from "../quotes-palette";
import { BackgroundLayer } from "./background-layer";

const AnimatedBlur = Animated.createAnimatedComponent(ExpoBlurView);
const ORIGIN = { x: 0.5, y: 0.9 };
const REACH = 1.5;

export function QuoteBackground({
	background,
	play,
}: {
	background: Background;
	play: boolean;
}) {
	const m = useQuoteMotion();
	const { width, height } = useWindowDimensions();
	const [base, setBase] = useState(background);
	const [top, setTop] = useState<Background | null>(null);
	const [settling, setSettling] = useState(false);
	const reveal = useSharedValue(1);

	if (background.key !== base.key && background.key !== top?.key) {
		if (top) {
			setBase(top);
		}
		setTop(background);
		setSettling(false);
	} else if (settling && readyOn(base, play) === "now") {
		// The new base is already drawn under the revealed top. An image or a loop drops the top
		// from `onReady` instead, once it has drawn, so the swap never shows an empty frame.
		setTop(null);
		setSettling(false);
	}

	useEffect(() => {
		if (!top) {
			return;
		}
		reveal.set(0);
		const done = () => {
			setBase(top);
			setSettling(true);
		};
		reveal.set(
			withTiming(
				1,
				m.reduced
					? { duration: T.reduced, ...PLAY_AS_CHOSEN }
					: { duration: T.reveal, easing: EASE.reveal, ...PLAY_AS_CHOSEN },
				(fin) => {
					if (fin) {
						scheduleOnRN(done);
					}
				}
			)
		);
	}, [top, m.reduced, reveal]);

	const radius = REACH * Math.sqrt((width * width + height * height) / 2);
	const mask = useAnimatedStyle(() =>
		m.reduced
			? { opacity: reveal.get(), transform: [{ scale: 1 }] }
			: { opacity: 1, transform: [{ scale: reveal.get() }] }
	);
	const fadeIn = useAnimatedStyle(() => ({
		opacity: slice(m.clock.get(), 0, T.bgFade),
		transform: [{ scale: 1 + (SOFT.scale - 1) * m.soft.get() }],
	}));
	const blur = useAnimatedProps(() => ({
		intensity: SOFT.blur * m.soft.get(),
	}));
	const dim = useAnimatedStyle(() => ({ opacity: SOFT.dim * m.soft.get() }));
	const scrim = useAnimatedStyle(() => ({
		opacity: SCRIM_CLEAR + (1 - SCRIM_CLEAR) * m.chrome.get(),
	}));
	const gradient = scrimOf(background);
	const settled = () => {
		setTop(null);
		setSettling(false);
	};

	return (
		<View className="absolute inset-0" pointerEvents="none">
			<Animated.View className="absolute inset-0" style={fadeIn}>
				<BackgroundLayer
					background={base}
					key={base.key}
					onReady={settling ? settled : undefined}
					play={play && (!top || settling)}
				/>
				{top && (
					<MaskedView
						maskElement={
							<Animated.View
								className="absolute bg-black"
								style={[
									{
										borderRadius: radius,
										height: radius * 2,
										left: width * ORIGIN.x - radius,
										top: height * ORIGIN.y - radius,
										width: radius * 2,
									},
									mask,
								]}
							/>
						}
						style={StyleSheet.absoluteFill}
					>
						<BackgroundLayer background={top} key={top.key} play={play} />
					</MaskedView>
				)}
				{gradient && (
					<Animated.View className="absolute inset-0" style={scrim}>
						<LinearGradient
							className="absolute inset-0"
							colors={gradient.colors}
							locations={gradient.locations}
						/>
					</Animated.View>
				)}
			</Animated.View>
			<AnimatedBlur
				animatedProps={blur}
				style={StyleSheet.absoluteFill}
				tint="default"
			/>
			<Animated.View className="absolute inset-0 bg-black" style={dim} />
		</View>
	);
}
