import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LETTER_MOTION } from "../letter-motion";
import { type LetterInk, PAPER_RADIUS } from "../letter-paper";

const HALF_TURN = 180;
const BACK_FROM = 0.5;
const RADIUS = {
	0: { borderTopLeftRadius: PAPER_RADIUS, borderTopRightRadius: PAPER_RADIUS },
	1: null,
	2: {
		borderBottomLeftRadius: PAPER_RADIUS,
		borderBottomRightRadius: PAPER_RADIUS,
	},
} as const;

export function ReadBand({
	i,
	fold,
	ink,
	band,
	crease,
}: {
	i: 0 | 1 | 2;
	fold: SharedValue<number> | null;
	ink: LetterInk;
	band: number;
	crease: SharedValue<number>;
}) {
	const sign = i === 0 ? -1 : 1;
	const turn = useAnimatedStyle(() => ({
		transform: [
			{ perspective: LETTER_MOTION.fold.perspective },
			{ rotateX: `${sign * HALF_TURN * (fold ? fold.get() : 0)}deg` },
		],
	}));
	const back = useAnimatedStyle(() => ({
		opacity: fold && fold.get() > BACK_FROM ? 1 : 0,
	}));
	const line = useAnimatedStyle(() => ({ opacity: crease.get() }));
	return (
		<Animated.View
			style={[
				{
					backgroundColor: ink.paper,
					boxShadow: i === 1 ? ink.shadow : undefined,
					height: band,
					left: 0,
					position: "absolute",
					right: 0,
					top: band * i,
					transformOrigin: i === 0 ? "bottom" : "top",
					...RADIUS[i],
				},
				turn,
			]}
		>
			{i === 0 ? null : (
				<Animated.View
					style={[
						{
							backgroundColor: ink.crease,
							height: 1,
							left: 0,
							position: "absolute",
							right: 0,
							top: 0,
						},
						line,
					]}
				/>
			)}
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
