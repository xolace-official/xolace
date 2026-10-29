import { BlurMask, Canvas, Circle, Group } from "@shopify/react-native-skia";
import { useEffect, useState } from "react";
import { type LayoutChangeEvent, View } from "react-native";
import {
	Easing,
	useReducedMotion,
	useSharedValue,
	withDelay,
	withRepeat,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";

const DOT_COUNT = 56;
const CANVAS_H = 30;
const DOT_R = 1.6;
const EMBER_R = 4.6;
const IGNITE_DELAY = 420;

type Props = {
	/** 0–99 positions the lit ember; `null` draws the field unlit (no number exists yet). */
	percentile: number | null;
};

/** A band of dim, uniform dots with the user's own ember lit at their
 * percentile. Unlabelled on purpose: only the lit ember's position carries the number. */
export function EmberField({ percentile }: Props) {
	const [width, setWidth] = useState(0);
	const muted = useTokenColor("muted");
	const ember = useTokenColor("ember");
	const reduceMotion = useReducedMotion();

	// The ember ignites rather than travels: a moving dot would read as a race.
	const emberR = useSharedValue(reduceMotion ? EMBER_R : EMBER_R * 0.35);
	const breath = useSharedValue(1);

	useEffect(() => {
		if (reduceMotion) {
			emberR.set(EMBER_R);
			breath.set(1);
			return;
		}
		emberR.set(
			withDelay(
				IGNITE_DELAY,
				withSpring(EMBER_R, { damping: 9, stiffness: 140 })
			)
		);
		breath.set(
			withDelay(
				IGNITE_DELAY,
				withRepeat(
					withTiming(0.72, {
						duration: 1400,
						easing: Easing.inOut(Easing.quad),
					}),
					-1,
					true
				)
			)
		);
	}, [reduceMotion, emberR, breath]);

	const onLayout = (e: LayoutChangeEvent) =>
		setWidth(e.nativeEvent.layout.width);

	const spacing = width / DOT_COUNT;
	const lit = percentile !== null;
	const emberIndex = lit
		? Math.round((percentile / 100) * (DOT_COUNT - 1))
		: -1;
	const emberX = spacing * (emberIndex + 0.5);
	const cy = CANVAS_H / 2;

	return (
		<View onLayout={onLayout} style={{ height: CANVAS_H }}>
			{width > 0 && (
				<Canvas style={{ height: CANVAS_H, width }}>
					{Array.from({ length: DOT_COUNT }, (_, i) =>
						i === emberIndex ? null : (
							<Circle
								color={muted + "2E"}
								cx={spacing * (i + 0.5)}
								cy={cy}
								key={i}
								r={DOT_R}
							/>
						)
					)}

					{lit && (
						<Group opacity={breath}>
							<Circle color={ember} cx={emberX} cy={cy} r={emberR}>
								<BlurMask blur={7} style="solid" />
							</Circle>
						</Group>
					)}
				</Canvas>
			)}
		</View>
	);
}
