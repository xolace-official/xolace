import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { riseOf, type SitClock } from "../clock/use-sit-clock";
import { COPY } from "../copy";
import { FADE } from "../sit-look";
import { SoftCopy } from "../soft-copy";

/** Board `.a-lab span`: Bricolage 21/650, −.015em (700 is the loaded cut). */
const LABEL_TYPE = {
	fontSize: 21,
	letterSpacing: -0.3,
	lineHeight: 26,
} as const;
const BOX = 40;

type Props = {
	W: number;
	clock: SitClock;
	shown: boolean;
	paused: boolean;
	reduced: boolean;
};

/**
 * The label inside the bottom arc ("Breathe in", "A little more", "Breathe
 * out"; "Paused"), tracked to the arc's centre every frame. Like
 * noodle-net-orbit's `labelsAt`, the three labels are stacked and each one's
 * look comes from the clock on the UI thread, so a phase change shows in the
 * same frame as the shape. The current label rises 10 pt out of a soft blur
 * over .45 s.
 */
export function ArcLabel({ W, clock, shown, paused, reduced }: Props) {
	const { geo, lab, labE } = clock;
	const visible = useSharedValue(shown ? 1 : 0);
	const pausedSv = useSharedValue(paused ? 1 : 0);
	useEffect(() => {
		visible.set(
			withTiming(shown ? 1 : 0, { duration: FADE.labelMs, ...PLAY_AS_CHOSEN })
		);
	}, [shown, visible]);
	useEffect(() => {
		pausedSv.set(paused ? 1 : 0);
	}, [paused, pausedSv]);

	const pausedStyle = useAnimatedStyle(() => ({ opacity: pausedSv.get() }));
	const box = useAnimatedStyle(() => {
		const b = geo.get().bot;
		return {
			opacity: visible.get(),
			transform: [{ translateY: b.y + b.h / 2 - BOX / 2 }],
		};
	});

	return (
		<Animated.View
			className="absolute top-0 left-0 justify-center"
			pointerEvents="none"
			style={[{ height: BOX, width: W }, box]}
		>
			{COPY.phases.map((label, i) => (
				<PhaseLabel
					index={i}
					key={label}
					lab={lab}
					labE={labE}
					paused={pausedSv}
					reduced={reduced}
					text={label}
				/>
			))}
			<Animated.View
				className="absolute inset-0 justify-center"
				style={pausedStyle}
			>
				<AppText center style={LABEL_TYPE} variant="headline">
					{COPY.paused}
				</AppText>
			</Animated.View>
		</Animated.View>
	);
}

type LabelProps = {
	text: string;
	index: number;
	lab: SitClock["lab"];
	labE: SitClock["labE"];
	paused: SharedValue<number>;
	reduced: boolean;
};

function PhaseLabel({ text, index, lab, labE, paused, reduced }: LabelProps) {
	const on = useAnimatedStyle(() => {
		const here = lab.get() === index && paused.get() === 0;
		const r = riseOf(here ? labE.get() : 0, reduced);
		return {
			opacity: here ? r.opacity : 0,
			transform: [{ translateY: r.translateY }],
		};
	});
	const soft = useAnimatedStyle(() => {
		const here = lab.get() === index && paused.get() === 0;
		return { opacity: here && !reduced ? 1 - labE.get() : 0 };
	});
	return (
		<Animated.View className="absolute inset-0 justify-center" style={on}>
			<View>
				<AppText center style={LABEL_TYPE} variant="headline">
					{text}
				</AppText>
				<SoftCopy
					soft={soft}
					style={LABEL_TYPE}
					text={text}
					variant="headline"
				/>
			</View>
		</Animated.View>
	);
}
