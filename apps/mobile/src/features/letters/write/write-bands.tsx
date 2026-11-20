import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LETTER_MOTION } from "../letter-motion";
import { type LetterInk, PAPER_RADIUS, SHEET } from "../letter-paper";
import { LetterLine } from "../letter-sheet";

const M = LETTER_MOTION;
const H = SHEET.write.height;
export const BAND = H / 3;
const HALF_TURN = 180;
const BACK_FROM = 0.5;
export const EMBER = { from: 0.4, size: 40 };
const SPARK = { fall: 90, opacity: 0.9, size: 4 };

const RADIUS = {
	0: { borderTopLeftRadius: PAPER_RADIUS, borderTopRightRadius: PAPER_RADIUS },
	1: null,
	2: {
		borderBottomLeftRadius: PAPER_RADIUS,
		borderBottomRightRadius: PAPER_RADIUS,
	},
} as const;

export function Band({
	i,
	fold,
	text,
	ink,
}: {
	i: 0 | 1 | 2;
	fold: SharedValue<number> | null;
	text: string;
	ink: LetterInk;
}) {
	const sign = i === 0 ? -1 : 1;
	const turn = useAnimatedStyle(() => ({
		transform: [
			{ perspective: M.fold.perspective },
			{ rotateX: `${sign * HALF_TURN * (fold ? fold.get() : 0)}deg` },
		],
	}));
	const back = useAnimatedStyle(() => ({
		opacity: fold && fold.get() > BACK_FROM ? 1 : 0,
	}));
	return (
		<Animated.View
			style={[
				{
					backgroundColor: ink.paper,
					borderTopColor: ink.crease,
					borderTopWidth: i === 0 ? 0 : 1,
					height: BAND,
					left: 0,
					overflow: "hidden",
					position: "absolute",
					right: 0,
					top: BAND * i,
					transformOrigin: i === 0 ? "bottom" : "top",
					...RADIUS[i],
				},
				turn,
			]}
		>
			<View
				style={{
					height: H,
					left: 0,
					overflow: "hidden",
					paddingHorizontal: SHEET.write.padH,
					paddingVertical: SHEET.write.padV,
					position: "absolute",
					right: 0,
					top: -BAND * i - (i === 0 ? 0 : 1),
				}}
			>
				<LetterLine size="write" text={text} />
			</View>
			{fold ? (
				<Animated.View
					style={[
						{ backgroundColor: ink.back, inset: 0, position: "absolute" },
						RADIUS[i],
						back,
					]}
				/>
			) : null}
		</Animated.View>
	);
}

export function Spark({
	t,
	x,
	fill,
}: {
	t: SharedValue<number>;
	x: number;
	fill: string;
}) {
	const style = useAnimatedStyle(() => {
		const v = t.get();
		return {
			opacity: v > 0 ? SPARK.opacity * (1 - v) : 0,
			transform: [{ translateX: x * v }, { translateY: SPARK.fall * v }],
		};
	});
	return (
		<Animated.View
			style={[
				{
					backgroundColor: fill,
					borderRadius: SPARK.size / 2,
					height: SPARK.size,
					left: "50%",
					position: "absolute",
					top: H / 2,
					width: SPARK.size,
				},
				style,
			]}
		/>
	);
}
