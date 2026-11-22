import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { NEUTRAL } from "@/components/xolace-face/pose";
import { useFace } from "@/components/xolace-face/use-face";
import { XolaceFace } from "@/components/xolace-face/xolace-face";
import { useScheme } from "@/design/scheme";
import { useTimeLeft } from "@/lib/talk/use-time-left";
import { faceProps } from "../companion-look";
import { GO, LAYOUT, OUT_EASE, seg } from "../motion/talk-motion";
import type { TalkMotion } from "../motion/use-talk-motion";
import { poseForPresence } from "../presence-pose";
import { useTalkScreen } from "../talk-data";
import { heardCount, isLate, pillLine } from "../talk-model";

const DROP = 6;
const FROM_SCALE = 0.96;
const SECOND_MS = 1000;
const GLASS = isLiquidGlassAvailable();
const SHAPE = {
	borderCurve: "continuous",
	borderRadius: LAYOUT.pillH / 2,
	height: LAYOUT.pillH,
	minWidth: LAYOUT.pillW,
} as const;

type Props = {
	top: number;
	before: boolean;
	motion: TalkMotion;
	running: boolean;
};

export function TalkPill({ top, before, motion, running }: Props) {
	const { state } = useTalkScreen();
	const scheme = useScheme();
	const face = useFace(NEUTRAL, running);
	const heard = heardCount(state.turns);
	const heardBefore = useRef(heard);
	const secondsLeft = useTimeLeft(state.endsAt, SECOND_MS);
	const late = isLate(secondsLeft, state.clockFromS);
	const line = pillLine(state.presence, secondsLeft, state.clockFromS);

	const { to, nod } = face;
	useEffect(() => to(poseForPresence(state.presence)), [to, state.presence]);
	useEffect(() => {
		if (heard > heardBefore.current) {
			nod();
		}
		heardBefore.current = heard;
	}, [nod, heard]);

	const pill = useAnimatedStyle(() => {
		const g = motion.go.get();
		if (motion.reduced.get()) {
			return { opacity: seg(g, GO.reduced / 2, GO.reduced / 2) };
		}
		const move = seg(g, GO.pillAt, GO.pillMove, OUT_EASE);
		return {
			opacity: seg(g, GO.pillAt, GO.pillFade),
			transform: [
				{ translateY: -DROP * (1 - move) },
				{ scale: FROM_SCALE + (1 - FROM_SCALE) * move },
			],
		};
	});
	const faceStyle = useAnimatedStyle(() => ({ opacity: motion.handed.get() }));

	const body = (
		<View
			className="flex-row items-center gap-2 pr-3.5 pl-1.5"
			style={{ height: LAYOUT.pillH }}
		>
			<Animated.View style={faceStyle}>
				<XolaceFace
					{...faceProps(state.look)}
					face={face}
					size={LAYOUT.pillFace}
				/>
			</Animated.View>
			<View>
				<AppText
					className="text-[15px] leading-[18px]"
					variant="callout"
					weight="semibold"
				>
					{state.name}
				</AppText>
				<AppText
					className="text-[11px] tabular-nums leading-[14px]"
					color={late ? "emberInk" : "subtle"}
					numberOfLines={1}
					variant="caption"
				>
					{line}
				</AppText>
			</View>
		</View>
	);

	return (
		<Animated.View
			accessibilityElementsHidden={before}
			accessibilityLabel={`${state.name}, ${line}`}
			accessibilityRole="header"
			accessible={!before}
			className="absolute self-center"
			importantForAccessibility={before ? "no-hide-descendants" : "auto"}
			pointerEvents="none"
			style={[{ top }, pill]}
		>
			{GLASS ? (
				<GlassView
					colorScheme={scheme}
					glassEffectStyle="regular"
					style={SHAPE}
				>
					{body}
				</GlassView>
			) : (
				<View className="bg-glass" style={SHAPE}>
					{body}
				</View>
			)}
		</Animated.View>
	);
}
