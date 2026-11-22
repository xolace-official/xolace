import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import Animated, {
	cancelAnimation,
	Easing,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { FONTS } from "@/design/type";
import { playBreathPhase } from "@/lib/haptics";
import { useTokenColors } from "@/lib/use-token-color";
import { COPY } from "../copy";
import { TIDE } from "../motion";
import { useReflectDraw } from "../reflect-draw";

const TOP = TIDE.inhale;
const END = TIDE.inhale + TIDE.hold + TIDE.exhale;
const S_MS = 1000;
const LINEAR = { easing: Easing.linear, ...PLAY_AS_CHOSEN };
const RING = { high: 1.18, low: 0.58, size: 190 };
const PHASES = ["idle", "in", "out"] as const;
type Phase = (typeof PHASES)[number];
const TITLE = { fontFamily: FONTS.displayBold } as const;

function sine(x: number) {
	"worklet";
	return 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
}
function breath(s: number) {
	"worklet";
	if (s <= TOP) {
		return sine(s / TIDE.inhale);
	}
	return 1 - sine((s - TOP - TIDE.hold) / TIDE.exhale);
}

export function Breathe({ onBack }: { onBack: () => void }) {
	const { light, reduced } = useReflectDraw();
	const [ring, glow1, glow2, glow3] = useTokenColors([
		"reflect-breath-ring",
		"reflect-breath-1",
		"reflect-breath-2",
		"reflect-breath-3",
	]);
	const s = useSharedValue(0);
	const holding = useSharedValue(0);
	const hand = useRef(false);
	const [phase, setPhase] = useState<Phase>("idle");

	const pressIn = () => {
		const now = s.get() >= END ? 0 : s.get();
		if (now > TOP) {
			return;
		}
		hand.current = true;
		holding.set(1);
		s.set(now);
		s.set(
			withTiming(END, { duration: (END - now) * S_MS, ...LINEAR }, (done) => {
				if (done) {
					s.set(0);
				}
			})
		);
	};
	const letGo = () => {
		const now = s.get();
		holding.set(0);
		if (now <= 0 || now >= TOP) {
			return;
		}
		hand.current = false;
		s.set(
			withTiming(0, {
				duration: (now * TIDE.exhale * S_MS) / TIDE.inhale,
				...LINEAR,
			})
		);
	};
	const topped = () => {
		if (hand.current) {
			playBreathPhase("top", 0);
		}
		hand.current = false;
	};
	const showPhase = (i: number) => setPhase(PHASES[i] ?? "idle");

	useAnimatedReaction(
		() => s.get() >= TOP,
		(now, old) => {
			if (now && old === false) {
				scheduleOnRN(topped);
			}
		}
	);
	useAnimatedReaction(
		() => {
			const v = s.get();
			if (v <= 0 || v >= END) {
				return 0;
			}
			return v < TOP && holding.get() === 1 ? 1 : 2;
		},
		(now, old) => {
			if (now !== old) {
				scheduleOnRN(showPhase, now);
			}
		}
	);
	useAnimatedReaction(
		() => (reduced ? 0 : breath(s.get())),
		(b) => light.tide.set(TIDE.rest + (TIDE.top - TIDE.rest) * b)
	);
	useEffect(() => () => cancelAnimation(s), [s]);

	const ringStyle = useAnimatedStyle(() => ({
		transform: [
			{
				scale:
					RING.low + (RING.high - RING.low) * (reduced ? 0 : breath(s.get())),
			},
		],
	}));
	const [word, sub] = COPY.care.breath[phase];

	return (
		<View className="gap-3">
			<Pressable
				accessibilityHint={COPY.care.breath.idle[0]}
				accessibilityLabel={`${word}. ${sub}`}
				accessibilityRole="button"
				className="h-[250px] items-center justify-center gap-1.5 overflow-hidden rounded-[22px]"
				onPressIn={pressIn}
				onPressOut={letGo}
			>
				<Animated.View
					className="absolute border-[1.5px]"
					pointerEvents="none"
					style={[
						{
							borderColor: ring,
							borderRadius: RING.size / 2,
							experimental_backgroundImage: `radial-gradient(closest-side, ${glow1}, ${glow2} 72%, ${glow3})`,
							height: RING.size,
							width: RING.size,
						},
						ringStyle,
					]}
				/>
				<AppText
					className="text-[26px] leading-[30px] tracking-[-0.52px]"
					style={TITLE}
					variant="title"
				>
					{word}
				</AppText>
				<AppText className="text-[13.5px]" color="muted" variant="detail">
					{sub}
				</AppText>
			</Pressable>
			<PressScale className="h-11 items-center justify-center" onPress={onBack}>
				<AppText
					className="text-[15px]"
					color="muted"
					variant="callout"
					weight="medium"
				>
					{COPY.care.back}
				</AppText>
			</PressScale>
		</View>
	);
}
