// Talk's voice-note bar on the Plus side of the Xolace+ step (#713, #714): the one card a
// user can try, so it carries a filled "Try it" and a slow ring off its play button.
import { SymbolView } from "expo-symbols";
import { PressableFeedback } from "heroui-native";
import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withRepeat,
	withSequence,
	withTiming,
} from "react-native-reanimated";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { icon } from "@/features/insights/domains";
import { playSoftPress } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";

// A fixed waveform: the same 22 bars every time, so it reads as a recording, not a meter.
const BAR_COUNT = 22;
const BAR_MIN = 6;
const BAR_SPREAD = 20;
const BAR_STEP = 29;
const BARS = Array.from({ length: BAR_COUNT }, (_, i) => ({
	height: BAR_MIN + ((i * BAR_STEP) % BAR_SPREAD),
	id: `bar-${i}`,
}));
const PLAY_ICON_SIZE = 16;

const PLAY = icon("play.fill", "play_arrow");
const BAR_CLASS =
	"flex-row items-center gap-3 rounded-full border bg-surface-secondary p-2";

// A slow ring breathing out of the play button, then a rest: enough to say "this one plays"
// next to two still cards. It stays inside the bar's padding (44pt disc, 8pt pad).
const RING_GROW_MS = 1400;
const RING_REST_MS = 900;
const RING_SCALE = 1.3;
const RING_OPACITY = 0.45;

function PlayRing() {
	const t = useSharedValue(0);
	useEffect(() => {
		t.set(
			withRepeat(
				withSequence(
					withTiming(1, {
						duration: RING_GROW_MS,
						easing: Easing.out(Easing.quad),
					}),
					withTiming(1, { duration: RING_REST_MS })
				),
				-1,
				false
			)
		);
	}, [t]);
	const style = useAnimatedStyle(() => ({
		opacity: RING_OPACITY * (1 - t.get()),
		transform: [{ scale: 1 + (RING_SCALE - 1) * t.get() }],
	}));
	return (
		<Animated.View
			className="absolute inset-0 rounded-full bg-ember"
			pointerEvents="none"
			style={style}
		/>
	);
}

/**
 * Talk's play bar: "Try it" opens the Talk demo (#714). Without `onTry` (during the save)
 * it only shows what the demo looks like, and says so to a screen reader.
 */
export function TalkBar({ onTry }: { onTry?: () => void }) {
	// Themed, not in `@theme static`, so it is read through Uniwind.
	const ink = useCSSVariable("--color-offer-ink") as string;
	const reduced = useEffectiveReducedMotion();
	const content = (
		<>
			<View className="size-11 items-center justify-center">
				{onTry && !reduced && <PlayRing />}
				<View className="size-11 items-center justify-center rounded-full bg-ember">
					<SymbolView name={PLAY} size={PLAY_ICON_SIZE} tintColor={ink} />
				</View>
			</View>
			<View className="h-7 flex-1 flex-row items-center gap-[3px]">
				{BARS.map((bar) => (
					<View
						className="flex-1 rounded-sm bg-ember/80"
						key={bar.id}
						style={{ height: bar.height }}
					/>
				))}
			</View>
			{/* A filled pill when it opens the demo, so it reads as a button, not a duration. */}
			<View
				className={cn(
					"rounded-full px-3 py-1.5",
					onTry ? "bg-ember" : "bg-ember/15"
				)}
			>
				<AppText
					className={cn(
						"font-[Poppins-SemiBold] text-[13px]",
						onTry ? "text-offer-ink" : "text-ember"
					)}
				>
					Try it
				</AppText>
			</View>
		</>
	);
	return onTry ? (
		<PressableFeedback
			accessibilityHint="Opens a short talk with Flux"
			accessibilityLabel="Try a talk with Flux"
			accessibilityRole="button"
			className={cn(BAR_CLASS, "border-ember/60")}
			onPress={() => {
				playSoftPress();
				onTry();
			}}
		>
			{content}
		</PressableFeedback>
	) : (
		<View
			accessibilityLabel="A short talk with Flux."
			accessible
			className={cn(BAR_CLASS, "border-ember/30")}
		>
			{content}
		</View>
	);
}
