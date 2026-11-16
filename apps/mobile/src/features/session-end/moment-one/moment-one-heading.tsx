import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { GleamTitle } from "../chrome/gleam-title";
import { COPY } from "../copy";
import { LAYOUT, T1 } from "../session-look";
import { appear, riseIn } from "../timeline";

const L = LAYOUT;
/** The small labels grow with Dynamic Type, capped as the titles are. */
const LABEL_MAX = 1.25;

type Props = {
	y: (v: number) => number;
	clock: SharedValue<number>;
	late: boolean;
	reduced: boolean;
	/** Where the heading ends, for the face's fit under large Dynamic Type. */
	onTop: (bottom: number) => void;
};

/**
 * Moment 1's heading (board `.t1`, `.q1`, `.pv`): the acknowledgement as the
 * title, then "How do you feel now?" and "Only you see this." Late, the night
 * line instead of the question.
 */
export function MomentOneHeading({ y, clock, late, reduced, onTop }: Props) {
	const question = useAnimatedStyle(() =>
		riseIn(
			clock.get(),
			T1.question.at,
			T1.question.ms,
			T1.question.rise,
			reduced
		)
	);
	const priv = useAnimatedStyle(() => ({
		opacity: appear(clock.get(), T1.private.at, T1.private.ms, reduced).opacity,
	}));
	const questionTop =
		(late ? L.question.lateTop : L.question.top) - L.title.top;
	return (
		<View
			className="absolute"
			onLayout={(e) =>
				onTop(e.nativeEvent.layout.y + e.nativeEvent.layout.height)
			}
			pointerEvents="none"
			style={{ left: L.title.side, right: L.title.side, top: y(L.title.top) }}
		>
			<GleamTitle
				at={T1.title.at}
				clock={clock}
				line={L.title.line}
				reduced={reduced}
				rows={late ? COPY.late.title : COPY.title}
				size={L.title.size}
				step={T1.title.step}
				tracking={L.title.tracking}
			/>
			<Animated.View
				style={[{ marginTop: questionTop - 2 * L.title.line }, question]}
			>
				{late ? (
					<AppText
						center
						color="muted"
						maxFontSizeMultiplier={LABEL_MAX}
						style={{
							fontSize: L.question.lateSize,
							lineHeight: L.question.line,
						}}
						variant="body"
					>
						{COPY.late.line}
					</AppText>
				) : (
					<AppText
						accessibilityRole="header"
						center
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: L.question.size, lineHeight: L.question.line }}
						variant="body"
						weight="semibold"
					>
						{COPY.question}
					</AppText>
				)}
			</Animated.View>
			{late ? null : (
				<Animated.View
					style={[
						{ marginTop: L.private.top - L.question.top - L.question.line },
						priv,
					]}
				>
					<AppText
						center
						color="subtle"
						maxFontSizeMultiplier={LABEL_MAX}
						style={{ fontSize: L.private.size, lineHeight: L.private.line }}
						variant="body"
					>
						{COPY.private}
					</AppText>
				</Animated.View>
			)}
		</View>
	);
}
