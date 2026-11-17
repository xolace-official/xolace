import { useEffect } from "react";
import { View } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "../copy";
import type { SessionColors } from "../session-colors";
import { EASE, LAYOUT, SLIDER, T1 } from "../session-look";
import { appear, clamp01 } from "../timeline";
import type { MoodSlider } from "./use-mood-slider";

const K = LAYOUT.track;
const RAIL_STOPS = [0, 0.5, 1] as const;
const SWELL = { ...SLIDER.swellSpring, ...PLAY_AS_CHOSEN };

type Props = {
	slider: MoodSlider;
	/** ms into moment 1. */
	clock: SharedValue<number>;
	/** The track has been touched (the nudge never plays again). */
	touched: SharedValue<number>;
	colors: SessionColors;
	reduced: boolean;
	unsure: boolean;
	/** VoiceOver's value: the word. */
	word: string;
	step: number | null;
};

/** `nudge`: 0 → −12 (30%) → +8 (62%) → 0, each leg on cubic-bezier(.4, 0, .2, 1). */
function nudgeAt(u: number) {
	"worklet";
	const n = T1.nudge;
	if (u <= 0 || u >= 1) {
		return 0;
	}
	if (u < 0.3) {
		return n.a * EASE.nudge(u / 0.3);
	}
	if (u < 0.62) {
		return n.a + (n.b - n.a) * EASE.nudge((u - 0.3) / 0.32);
	}
	return n.b * (1 - EASE.nudge((u - 0.62) / 0.38));
}

/**
 * Board `.trk`: a 10 pt rail in the cool → warm gradient, a 2 × 24 notch, a
 * white 40 pt thumb. While held the rail swells ×1.5 (spring 300/21) and the
 * thumb grows to 1.12 (120 ms). Before any touch the thumb nudges once at 2 s.
 * One adjustable element for VoiceOver; increment and decrement move one step.
 */
export function MoodTrack(p: Props) {
	const { slider, clock, touched, colors, reduced, unsure, word, step } = p;
	const { pos, width, grab, gesture } = slider;
	const dim = useSharedValue(unsure ? SLIDER.dim : 1);
	useEffect(() => {
		dim.set(
			withTiming(unsure ? SLIDER.dim : 1, {
				duration: SLIDER.dimMs,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [unsure, dim]);

	const swell = useSharedValue(1);
	const grow = useSharedValue(1);
	useAnimatedReaction(
		() => grab.get(),
		(g, was) => {
			if (reduced || g === was) {
				return;
			}
			swell.set(withSpring(g ? SLIDER.swell : 1, SWELL));
			grow.set(
				withTiming(g ? SLIDER.thumbScale : 1, {
					duration: g ? SLIDER.thumbMs : SLIDER.thumbBackMs,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	);

	const wrap = useAnimatedStyle(() => {
		const a = appear(clock.get(), T1.track.at, T1.track.ms, reduced);
		const rise = reduced ? 0 : T1.track.rise * (1 - EASE.rise(a.p));
		return {
			opacity: a.opacity * dim.get(),
			transform: [{ translateY: rise }],
		};
	});
	const rail = useAnimatedStyle(() => ({
		transform: [{ scaleY: swell.get() }],
	}));
	const thumb = useAnimatedStyle(() => {
		const n = T1.nudge;
		const u =
			touched.get() || reduced ? 0 : clamp01((clock.get() - n.at) / n.ms);
		const x = pos.get() * Math.max(0, width.get() - K.thumb) + nudgeAt(u);
		return { transform: [{ translateX: x }, { scale: grow.get() }] };
	});

	return (
		<Animated.View
			className="absolute"
			style={[{ height: K.height, left: K.side, right: K.side, top: 0 }, wrap]}
		>
			<GestureDetector gesture={gesture}>
				<View
					accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
					accessibilityLabel={COPY.sliderLabel}
					accessibilityRole="adjustable"
					accessibilityValue={{ text: word }}
					accessible
					className="flex-1"
					onAccessibilityAction={(e) =>
						slider.adjust(
							e.nativeEvent.actionName === "increment" ? 1 : -1,
							step
						)
					}
					onLayout={(e) => width.set(e.nativeEvent.layout.width)}
				>
					<Animated.View
						className="absolute"
						style={[
							{ height: K.rail, left: K.inset, right: K.inset, top: K.railTop },
							rail,
						]}
					>
						<LinearGradient
							className="flex-1 rounded-full"
							colors={colors.rail as [string, string, string]}
							end={{ x: 1, y: 0.5 }}
							locations={RAIL_STOPS}
							start={{ x: 0, y: 0.5 }}
						/>
					</Animated.View>
					<View
						className="absolute left-1/2 rounded-[1px] bg-subtle opacity-50"
						style={{
							height: K.notchH,
							marginLeft: -K.notchW / 2,
							top: K.notchTop,
							width: K.notchW,
						}}
					/>
					<Animated.View
						className="absolute left-0 rounded-full"
						style={[
							{
								backgroundColor: colors.thumb,
								boxShadow: `0 2px 10px ${colors.thumbShadow}, 0 0 0 0.5px ${colors.thumbRing}`,
								height: K.thumb,
								top: K.thumbTop,
								width: K.thumb,
							},
							thumb,
						]}
					/>
				</View>
			</GestureDetector>
		</Animated.View>
	);
}
