import {
	Group,
	interpolateColors,
	LinearGradient,
	Mask,
	Path,
	Rect,
	vec,
} from "@shopify/react-native-skia";
import type { ComponentProps, ReactNode } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { RIDGES, SKY } from "./sky-model";
import type { SkyMotion } from "./use-sky-motion";

/** The two ridges on the horizon: the sun sinks behind them, and they drift with the scroll. */

type ColorProp = ComponentProps<typeof Path>["color"];
const RIDGE_FADE = {
	end: vec(0, RIDGES.height),
	positions: [0, RIDGES.fadeFrom, 1],
	start: vec(0, 0),
};
const OPAQUE_TO_CLEAR = ["#000000", "#000000", "rgba(0,0,0,0)"];

/** The ridges' place: a parallax of 0.22× the scroll. */
export function RidgesAt({
	scrollY,
	children,
}: {
	scrollY: SharedValue<number>;
	children: ReactNode;
}) {
	const transform = useDerivedValue(() => [
		{
			translateY:
				RIDGES.top +
				Math.min(Math.max(scrollY.get(), 0), SKY.h) * RIDGES.parallax,
		},
	]);
	return <Group transform={transform}>{children}</Group>;
}

/** Two ridges in the board's 390 pt page, stretched to the width; their bottom 36% fades into the page. */
export function RidgesArt({
	colors,
	sx,
}: {
	colors: readonly [ColorProp, ColorProp];
	sx: number;
}) {
	return (
		<Group transform={[{ scaleX: sx }]}>
			<Mask
				mask={
					<Rect height={RIDGES.height} width={SKY.w} x={0} y={0}>
						<LinearGradient
							colors={OPAQUE_TO_CLEAR}
							end={RIDGE_FADE.end}
							positions={RIDGE_FADE.positions}
							start={RIDGE_FADE.start}
						/>
					</Rect>
				}
			>
				<Path color={colors[0]} path={RIDGES.back} />
				<Path color={colors[1]} path={RIDGES.front} />
			</Mask>
		</Group>
	);
}

export function LiveRidges({
	motion: m,
	sx,
}: {
	motion: SkyMotion;
	sx: number;
}) {
	const back = useDerivedValue(() =>
		interpolateColors(
			m.ridgeMix.get(),
			[0, 1],
			[m.ridgeFrom.get()[0], m.ridgeTo.get()[0]]
		)
	);
	const front = useDerivedValue(() =>
		interpolateColors(
			m.ridgeMix.get(),
			[0, 1],
			[m.ridgeFrom.get()[1], m.ridgeTo.get()[1]]
		)
	);
	return <RidgesArt colors={[back, front]} sx={sx} />;
}
