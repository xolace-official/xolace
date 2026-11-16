import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "../copy";
import { wordsFor } from "../mood-scale";
import type { SessionColors } from "../session-colors";
import { LAYOUT, SLIDER, T1, T2 } from "../session-look";
import { appear, clamp01, riseIn } from "../timeline";
import { AnswerWord } from "./answer-word";
import { DayChip } from "./day-chip";
import { FaceLight } from "./face-light";
import type { FaceFit } from "./fit";
import { MomentOneHeading } from "./moment-one-heading";
import { LINE, MoodLabels, NotSureButton, NotSureLine } from "./mood-labels";
import { MoodTrack } from "./mood-track";
import type { MoodSlider } from "./use-mood-slider";

const L = LAYOUT;
type Props = {
	W: number;
	y: (v: number) => number;
	fit: FaceFit;
	onTop: (bottom: number) => void;
	onBottom: (height: number) => void;
	c1: SharedValue<number>;
	c2: SharedValue<number>;
	touched: SharedValue<number>;
	slider: MoodSlider;
	day: { from: number; to: number };
	step: number | null;
	unsure: boolean;
	late: boolean;
	colors: SessionColors;
	reduced: boolean;
	onUnsure: () => void;
};

/**
 * Moment 1, "How do you feel now?" (board `.w1`): the day, the heading, the
 * question, and one slider under the face. Late, only the night line. Moving
 * to moment 2, it all goes with a 10 pt drop over .22 s.
 */
export function MomentOne(p: Props) {
	const { W, y, fit, c1, c2, slider, step, unsure, late, colors, reduced } = p;
	const answered = step !== null || unsure;
	let word: string = COPY.slide;
	if (unsure) {
		word = COPY.notSureWord;
	} else if (step !== null) {
		word = wordsFor(step);
	}

	const out = useAnimatedStyle(() => {
		const m = c2.get();
		if (m < 0) {
			return { opacity: 1, transform: [{ translateY: 0 }] };
		}
		const u = clamp01(m / T2.out.ms);
		return {
			opacity: 1 - u,
			transform: [{ translateY: reduced ? 0 : T2.out.drop * u }],
		};
	});
	const wordIn = useAnimatedStyle(() =>
		riseIn(c1.get(), T1.word.at, T1.word.ms, T1.word.rise, reduced)
	);
	const ends = useAnimatedStyle(() => ({
		opacity: appear(c1.get(), T1.ends.at, T1.ends.ms, reduced).opacity,
	}));
	const notSure = useAnimatedStyle(() => ({
		opacity: appear(c1.get(), T1.notSure.at, T1.notSure.ms, reduced).opacity,
	}));
	const unsureA = useSharedValue(unsure ? 1 : 0);
	useEffect(() => {
		unsureA.set(
			withTiming(unsure ? 1 : 0, { duration: SLIDER.dimMs, ...PLAY_AS_CHOSEN })
		);
	}, [unsure, unsureA]);
	const unsureLine = useAnimatedStyle(() => ({ opacity: unsureA.get() }));

	return (
		<Animated.View
			className="absolute inset-0"
			pointerEvents="box-none"
			style={out}
		>
			<FaceLight
				clock={c1}
				colors={colors}
				fit={fit}
				grab={slider.grab}
				pos={slider.pos}
				reduced={reduced}
				W={W}
				y={y}
			/>
			<DayChip
				clock={c1}
				from={p.day.from}
				reduced={reduced}
				to={p.day.to}
				top={y(L.chip.top)}
			/>
			<MomentOneHeading
				clock={c1}
				late={late}
				onTop={p.onTop}
				reduced={reduced}
				y={y}
			/>
			{late ? null : (
				<View
					className="absolute inset-x-0"
					onLayout={(e) => p.onBottom(e.nativeEvent.layout.height)}
					pointerEvents="box-none"
					style={{ top: fit.bottomTop }}
				>
					<Animated.View style={wordIn}>
						<AnswerWord answered={answered} reduced={reduced} word={word} />
					</Animated.View>
					<NotSureLine style={unsureLine} />
					<View
						style={{
							height: L.track.height,
							marginTop: L.track.top - L.unsure.top - LINE,
						}}
					>
						<MoodTrack
							clock={c1}
							colors={colors}
							reduced={reduced}
							slider={slider}
							step={step}
							touched={p.touched}
							unsure={unsure}
							word={word}
						/>
					</View>
					<MoodLabels style={ends} />
					<NotSureButton
						onPress={p.onUnsure}
						selected={unsure}
						style={notSure}
					/>
				</View>
			)}
		</Animated.View>
	);
}
