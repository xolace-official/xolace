import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN, REDUCED_FADE_MS } from "@/design/springs";
import { cn } from "@/lib/cn";
import { COPY } from "../copy";
import { progressText, type TwigState } from "../kindling-model";
import { KMOTION } from "../kindling-motion";

const FILL = { delay: 300, ms: 500 } as const;

/**
 * The block under the native large title (§2.1): the line under it and the progress row with
 * one segment per twig. The first thing in the scroll, in normal flow.
 */
export function KindlingHeader({
	states,
	keys,
	held,
	reduced,
}: {
	states: readonly TwigState[];
	/** One per twig, to key its segment. */
	keys: readonly string[];
	/** "Tuesday", or "your last session". */
	held: string;
	reduced: boolean;
}) {
	const progress = progressText(states);
	return (
		<View className="px-5">
			<AppText
				className="text-[15.5px] leading-[21px]"
				color="muted"
				variant="callout"
			>
				{COPY.sub(held)}
			</AppText>
			<View className="mt-3 min-h-4.5 flex-row items-center gap-3">
				<AppText
					className="min-w-23 text-[13px]"
					color={progress.all ? "emberInk" : "foreground"}
					variant="footnote"
					weight="semibold"
				>
					{progress.text}
				</AppText>
				<View
					accessibilityElementsHidden
					accessible={false}
					className="flex-1 flex-row gap-1.25"
					importantForAccessibility="no-hide-descendants"
				>
					{keys.map((key, i) => (
						<Segment key={key} reduced={reduced} state={states[i] ?? "wait"} />
					))}
				</View>
			</View>
		</View>
	);
}

/** A segment that just got tended fills left to right (500 ms, from 300 ms). */
function Segment({ state, reduced }: { state: TwigState; reduced: boolean }) {
	const done = state === "done";
	const passed = state === "passed" || state === "undo";
	const fill = useSharedValue(done ? 1 : 0);
	useEffect(() => {
		if (!done) {
			fill.set(0);
		} else if (reduced) {
			fill.set(withTiming(1, { duration: REDUCED_FADE_MS, ...PLAY_AS_CHOSEN }));
		} else {
			fill.set(
				withDelay(
					FILL.delay,
					withTiming(1, {
						duration: FILL.ms,
						easing: KMOTION.lit,
						...PLAY_AS_CHOSEN,
					}),
					PLAY_AS_CHOSEN.reduceMotion
				)
			);
		}
	}, [done, fill, reduced]);
	const style = useAnimatedStyle(() => ({
		transform: [{ scaleX: fill.get() }],
	}));
	return (
		<View
			className={cn(
				"h-1.25 flex-1 overflow-hidden rounded-[3px]",
				passed ? "bg-subtle opacity-32" : "bg-surface-secondary"
			)}
		>
			<Animated.View
				className="flex-1 rounded-[3px] bg-ember"
				style={[{ transformOrigin: "left" }, style]}
			/>
		</View>
	);
}
