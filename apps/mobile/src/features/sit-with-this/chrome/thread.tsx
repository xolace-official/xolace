import { View } from "react-native";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import type { SitClock } from "../clock/use-sit-clock";
import { LAYOUT } from "../sit-look";
import { type Beat, threadWeights } from "../sit-model";

const T = LAYOUT.thread;

type Props = {
	beats: readonly Beat[];
	current: number;
	serial: number;
	colors: readonly [string, string, ...string[]];
	clock: SitClock;
};

/**
 * The thread (board `.thr`): one segment per beat, flexed by its length (a
 * prompt counts as 10 s), filling in spectrum (late: ember). Done segments are
 * full; the current one fills with the clock.
 */
export function Thread({ beats, current, serial, colors, clock }: Props) {
	const weights = threadWeights(beats);
	return (
		<View className="flex-row" style={{ gap: T.gap, height: T.height }}>
			{weights.map((flex, i) => (
				<View
					className="overflow-hidden rounded-[2px] bg-separator"
					key={i}
					style={{ flex, height: T.height }}
				>
					{i < current ? <Fill colors={colors} /> : null}
					{i === current ? (
						<Fill clock={clock} colors={colors} serial={serial} />
					) : null}
				</View>
			))}
		</View>
	);
}

type FillProps = { colors: Props["colors"]; clock?: SitClock; serial?: number };

function Fill({ colors, clock, serial }: FillProps) {
	// The fill scales from its left edge: no layout pass per frame.
	const grow = useAnimatedStyle(() => {
		if (!clock) {
			return { transform: [{ scaleX: 1 }] };
		}
		return {
			transform: [{ scaleX: clock.at.get() === serial ? clock.frac.get() : 0 }],
		};
	});
	return (
		<Animated.View
			className="absolute inset-0"
			style={[{ transformOrigin: "left" }, grow]}
		>
			<LinearGradient
				className="flex-1 rounded-[2px]"
				colors={colors}
				end={{ x: 1, y: 0.5 }}
				start={{ x: 0, y: 0.5 }}
			/>
		</Animated.View>
	);
}
