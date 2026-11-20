import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Flux } from "@/components/shared/flux";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";
import { useCheckIn } from "../check-in-data";
import { CHECK_IN } from "../copy";
import { AnswerChip, CHIP_GAP } from "./answer-chip";

const H = {
	chipY: 230,
	fluxH: 153,
	fluxW: 78,
	headX: 112,
	headX2: 90,
	headY: 92,
} as const;
const EASE = Easing.bezier(0.2, 0.85, 0.25, 1);
const T = {
	fade: 280,
	flux: 400,
	fluxDy: 8,
	fluxScale: 0.72,
	inAt: 150,
	inRise: 8,
	move: 350,
	outRise: -6,
} as const;
const HEADLINE = {
	fontSize: 24,
	letterSpacing: -0.48,
	lineHeight: 28.1,
} as const;
const EYEBROW = { fontSize: 13.5 } as const;
const GLYPH = { close: 15 } as const;

export function CheckInHead() {
	const { state, actions } = useCheckIn();
	const { reduced } = state;
	const picked = state.picked && state.picked !== "vent" ? state.picked : null;
	const [fg] = useTokenColors(["foreground"]);
	const p = useSharedValue(picked ? 1 : 0);
	const move = useSharedValue(picked ? 1 : 0);

	useEffect(() => {
		if (!picked) {
			return;
		}
		const t = (ms: number) => ({
			duration: ms,
			easing: EASE,
			...PLAY_AS_CHOSEN,
		});
		if (reduced) {
			p.set(withTiming(1, t(REDUCED_FADE_MS)));
			move.set(1);
			return;
		}
		p.set(withTiming(1, t(T.flux)));
		move.set(withTiming(1, t(T.move)));
	}, [picked, reduced, p, move]);

	const flux = useAnimatedStyle(() => ({
		transform: [
			{ scale: 1 + (T.fluxScale - 1) * p.get() },
			{ translateY: T.fluxDy * p.get() },
		],
	}));
	const out = useAnimatedStyle(() => ({
		opacity: 1 - Math.min(1, (p.get() * T.flux) / T.fade),
		transform: [{ translateY: T.outRise * move.get() }],
	}));
	const inn = useAnimatedStyle(() => {
		const k = Math.max(0, (p.get() * T.flux - T.inAt) / T.fade);
		return {
			opacity: Math.min(1, k),
			transform: [{ translateY: T.inRise * (1 - move.get()) }],
		};
	});

	return (
		<View className="pb-2" style={{ paddingTop: H.headY }}>
			<View className="absolute top-[7px] h-[5px] w-[38px] self-center rounded-[3px] bg-foreground/18" />
			<View className="absolute top-5 right-4 left-5 flex-row items-center justify-between">
				<View className="gap-1.5">
					<AppText
						color="muted"
						style={EYEBROW}
						variant="detail"
						weight="semibold"
					>
						{CHECK_IN.eyebrow}
					</AppText>
					<View
						className="flex-row gap-1"
						importantForAccessibility="no-hide-descendants"
					>
						<View className="h-1 w-8 rounded-[2px] bg-accent" />
						<View
							className={cn(
								"h-1 w-8 rounded-[2px]",
								picked ? "bg-accent" : "bg-foreground/12"
							)}
						/>
					</View>
				</View>
				<PressScale
					accessibilityLabel={CHECK_IN.close}
					className="size-11 items-center justify-center rounded-full bg-surface"
					onPress={actions.close}
				>
					<Icon
						color={fg ?? ""}
						name={{ android: "close", ios: "xmark" }}
						size={GLYPH.close}
						weight="semibold"
					/>
				</PressScale>
			</View>
			<Animated.View
				accessibilityLabel={CHECK_IN.mascot}
				accessibilityRole="image"
				accessible
				className="absolute top-21 left-[22px]"
				style={[{ transformOrigin: "0% 0%" }, flux]}
			>
				<Flux breathe height={H.fluxH} pose="whisper" width={H.fluxW} />
			</Animated.View>
			<View
				className="mr-5.5"
				style={{
					marginLeft: H.headX2,
					minHeight: H.chipY - H.headY - CHIP_GAP,
				}}
			>
				{picked ? (
					<Animated.View style={inn}>
						<AppText
							accessibilityRole="header"
							style={HEADLINE}
							variant="headline"
						>
							{CHECK_IN.step[picked]}
						</AppText>
					</Animated.View>
				) : null}
				<Animated.View
					className={cn(picked && "absolute inset-x-0 top-0")}
					importantForAccessibility={picked ? "no-hide-descendants" : "auto"}
					style={[{ marginLeft: H.headX - H.headX2 }, out]}
				>
					<AppText
						accessibilityRole="header"
						style={HEADLINE}
						variant="headline"
					>
						{state.question}
					</AppText>
				</Animated.View>
			</View>
			<AnswerChip picked={picked} reduced={reduced} />
		</View>
	);
}
