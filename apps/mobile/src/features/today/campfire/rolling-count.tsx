import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { type EaseProps, EaseView, NONE, REDUCED } from "@/design/ease";
import { BODY_MAX_SCALE } from "@/design/type";
import { CURVES } from "../today-motion";
import { heldAtStart } from "../today-rise";

const LINE = 20.7;
const ROLL_MS = 420;
const ROLL_DELAY = 150;
const FROM_OPACITY = 0.2;
const SHOWN = { opacity: 1, translateY: 0 };

type Props = {
	value: number | null;
	play: boolean;
	waiting: boolean;
	reduced: boolean;
	rest: string;
	tail: string;
};

export function RollingCount({
	value,
	play,
	waiting,
	reduced,
	rest,
	tail,
}: Props) {
	const line = LINE * Math.min(useWindowDimensions().fontScale, BODY_MAX_SCALE);
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
