import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { type EaseProps, EaseView, NONE, REDUCED } from "@/design/ease";
import { BODY_MAX_SCALE } from "@/design/type";
import { CURVES } from "../today-motion";
import { heldAtStart } from "../today-rise";

/** 15 pt at line height 1.38. */
const LINE = 20.7;
const ROLL_MS = 420;
const ROLL_DELAY = 150;
const FROM_OPACITY = 0.2;
const SHOWN = { opacity: 1, translateY: 0 };

type Props = {
	/** The count to roll, or none (the warming line has no number). */
	value: number | null;
	play: boolean;
	/** The launch cover is still up: the roll holds at its start (`TodayFrameValue.waiting`). */
	waiting: boolean;
	reduced: boolean;
	rest: string;
	tail: string;
};

/**
 * "38 campers sat with anxiety by the fire this week." with the count rolling
 * up into place (rolling-countdown-digits / lantern-wish-send). The number is
 * inline in a sentence that wraps, so the sentence keeps a clear copy of the
 * digits and the rolling digits sit in a clipped box over that spot.
 */
export function RollingCount({
	value,
	play,
	waiting,
	reduced,
	rest,
	tail,
}: Props) {
	// The sentence grows with Dynamic Type, so the clipped box and the roll grow with it.
	const line = LINE * Math.min(useWindowDimensions().fontScale, BODY_MAX_SCALE);
	// The digits roll up from a line below (react-native-ease), each time the count changes while
	// `play`: the view is keyed by the value, so a new count mounts and plays its enter.
	// Reduced: they fade up from .2 instead, without moving.
	let roll: EaseProps = { animate: SHOWN, transition: NONE };
	if (play && reduced) {
		roll = {
			animate: SHOWN,
			initialAnimate: { opacity: FROM_OPACITY },
			transition: REDUCED,
		};
	} else if (play) {
		roll = {
			animate: SHOWN,
			initialAnimate: { opacity: FROM_OPACITY, translateY: line },
			transition: {
				delay: ROLL_DELAY,
				duration: ROLL_MS,
				easing: CURVES.rise,
				type: "timing",
			},
		};
	}

	if (value === null) {
		return <AppText variant="callout">{tail}</AppText>;
	}
	return (
		<View>
			<AppText style={{ lineHeight: LINE }} variant="callout">
				<AppText
					className="text-transparent tabular-nums"
					variant="callout"
					weight="bold"
				>
					{value.toLocaleString()}
				</AppText>
				<AppText color="emberInk" variant="callout" weight="bold">
					{rest}
				</AppText>
				{tail}
			</AppText>
			<View
				className="absolute top-0 left-0 overflow-hidden"
				pointerEvents="none"
				style={{ height: line }}
			>
				<EaseView key={value} {...heldAtStart(roll, waiting)}>
					<AppText
						className="tabular-nums"
						color="emberInk"
						style={{ lineHeight: LINE }}
						variant="callout"
						weight="bold"
					>
						{value.toLocaleString()}
					</AppText>
				</EaseView>
			</View>
		</View>
	);
}
