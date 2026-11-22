import { BlurView as ExpoBlurView } from "expo-blur";
import { useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
	useAnimatedProps,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { SOFT, slice, T, useQuoteMotion } from "../motion/quote-motion";
import type { QuoteBackground as Background } from "../quotes-model";
import { SCRIM_CLEAR, scrimOf } from "../quotes-palette";
import { BackgroundLayer } from "./background-layer";
import { firstLayers, layersFor, plays, settled } from "./layers";
import { RevealLayer } from "./reveal-layer";

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
	const [layers, setLayers] = useState(() => firstLayers(background));
	const [known, setKnown] = useState(answered);

	if (answered && !known) {
		setKnown(true);
	}
	const next = layersFor(layers, background, known);
	if (next !== layers) {
		setLayers(next);
	}

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

	return (
		<View className="absolute inset-0" pointerEvents="none">
			<Animated.View className="absolute inset-0" style={fadeIn}>
				{layers.map((l, i) =>
					l.revealed ? (
						<RevealLayer
							background={l.background}
							height={height}
							key={l.id}
							onRevealed={() => setLayers((ls) => settled(ls, l.id))}
							play={plays(layers, i, play)}
							reduced={m.reduced}
							width={width}
						/>
					) : (
						<BackgroundLayer
							background={l.background}
							key={l.id}
							play={plays(layers, i, play)}
						/>
					)
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
