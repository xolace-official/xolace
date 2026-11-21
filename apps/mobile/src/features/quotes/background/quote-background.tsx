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
import { RevealMask } from "./reveal-mask";

const AnimatedBlur = Animated.createAnimatedComponent(ExpoBlurView);

export function QuoteBackground({
	background,
	play,
	answered,
}: {
	background: Background;
	play: boolean;
	/** `background` is the server's answer. Until it first is, a change corrects a guess: no reveal. */
	answered: boolean;
}) {
	const m = useQuoteMotion();
	const { width, height } = useWindowDimensions();
	const [base, setBase] = useState(background);
	const [top, setTop] = useState<Background | null>(null);
	const [settling, setSettling] = useState<false | "drawing" | "frame">(false);
	const [known, setKnown] = useState(answered);
	const reveal = useSharedValue(1);

	if (answered && !known) {
		setKnown(true);
	}
	if (!known && background.key !== base.key) {
		// The background remembered on the phone was wrong (picked on another phone, Xolace+ lapsed, or
		// nothing remembered yet). It's a correction, not a pick: swap it in under the arrival's fade
		// instead of revealing it over the words.
		setBase(background);
	} else if (background.key !== base.key && background.key !== top?.key) {
		if (top) {
			setBase(top);
		}
		setTop(background);
		setSettling(false);
	} else if (settling) {
		const waitsOn = readyOn(base, play);
		if (waitsOn === "now" || (settling === "frame" && waitsOn !== "frame")) {
			// The new base is already drawn under the revealed top. An image or a loop drops the top
			// from `onReady` instead, once it has drawn, so the swap never shows an empty frame.
			// A loop that stops playing before its first frame has no draw left to wait for: its
			// poster showed while it waited.
			setTop(null);
			setSettling(false);
		} else if (waitsOn === "frame" && settling !== "frame") {
			setSettling("frame");
		}
	}

	useEffect(() => {
		if (!top) {
			return;
		}
		reveal.set(0);
		const done = () => {
			setBase(top);
			setSettling("drawing");
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
					play={play && (!top || settling !== false)}
				/>
				{top && (
					<RevealMask
						height={height}
						reduced={m.reduced}
						reveal={reveal}
						width={width}
					>
						<BackgroundLayer background={top} key={top.key} play={play} />
					</RevealMask>
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
