import { SymbolView } from "expo-symbols";
import { PressableFeedback, useThemeColor } from "heroui-native";
import { View } from "react-native";
import Animated, {
	FadeIn,
	FadeOut,
	type SharedValue,
	useAnimatedStyle,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import {
	COUNTDOWN_FROM_MS,
	type PlusDictationView,
} from "@/features/reflect/hooks/use-plus-dictation";
import { playSoftPress } from "@/lib/haptics";

const BAR_COUNT = 24;
const BAR_MAX = 28;
const BAR_MIN = 3;
// Each bar's share of the level: a bell across the strip with a little
// unevenness, so it reads as a voice rather than a level meter.
const BAR_WEIGHTS = Array.from({ length: BAR_COUNT }, (_, i) => {
	const bell = Math.sin((Math.PI * (i + 0.5)) / BAR_COUNT);
	return bell * (0.65 + 0.35 * Math.abs(Math.sin(i * 1.7)));
});

const WaveBar = ({
	metering,
	weight,
}: {
	metering: SharedValue<number>;
	weight: number;
}) => {
	const style = useAnimatedStyle(() => {
		// The recorder normalises -160..0 dB to 0..1, so room tone already sits
		// around 0.7 — speech lives in the top of the range.
		// ponytail: fixed floor; calibrate per device if quiet voices look flat.
		const level = Math.min(1, Math.max(0, (metering.get() - 0.7) / 0.25));
		return {
			height: withTiming(BAR_MIN + (BAR_MAX - BAR_MIN) * level * weight, {
				duration: 90,
			}),
		};
	});
	return (
		<Animated.View className="w-[3px] rounded-full bg-accent" style={style} />
	);
};

const STOP_NAME = { android: "stop", ios: "stop.fill", web: "stop" } as const;

const formatRemaining = (ms: number) =>
	`0:${String(Math.ceil(ms / 1000)).padStart(2, "0")}`;

/**
 * A Plus dictation take in the composer: listening, then writing it down.
 * Between takes, the one-line note on a fallback or a lost take, if any.
 */
export const DictationStrip = ({
	phase,
	metering,
	remainingMs,
	note,
	stop,
}: PlusDictationView) => {
	const accent = useThemeColor("accent") as string;

	if (phase === "idle") {
		if (!note) {
			return null;
		}
		return (
			<Animated.View
				className="min-h-10 items-center justify-center"
				entering={FadeIn}
				exiting={FadeOut}
			>
				<AppText
					accessibilityLiveRegion="polite"
					className="text-center text-muted text-sm"
				>
					{note}
				</AppText>
			</Animated.View>
		);
	}

	if (phase === "writing") {
		return (
			<Animated.View
				className="h-10 items-center justify-center"
				entering={FadeIn}
				exiting={FadeOut}
			>
				<AppText
					accessibilityLiveRegion="polite"
					className="text-muted text-sm"
				>
					Writing it down…
				</AppText>
			</Animated.View>
		);
	}

	const counting = remainingMs <= COUNTDOWN_FROM_MS;
	return (
		<Animated.View
			accessibilityLabel="Listening"
			className="h-10 flex-row items-center justify-center gap-3"
			entering={FadeIn}
			exiting={FadeOut}
		>
			<View className="flex-row items-center gap-[3px]">
				{BAR_WEIGHTS.map((weight, i) => (
					<WaveBar key={i} metering={metering} weight={weight} />
				))}
			</View>
			{counting && (
				<AppText className="text-muted text-xs tabular-nums">
					{formatRemaining(remainingMs)}
				</AppText>
			)}
			{/* Its own stop, beside what it stops: the header mic sits next to the
          composer's ✕, and a missed tap there closes the card. */}
			<PressableFeedback
				accessibilityLabel="Stop and write it down"
				accessibilityRole="button"
				className="h-8 w-8 items-center justify-center rounded-full bg-accent/15"
				hitSlop={10}
				onPress={() => {
					playSoftPress();
					stop();
				}}
			>
				<SymbolView name={STOP_NAME} size={12} tintColor={accent} />
			</PressableFeedback>
		</Animated.View>
	);
};
