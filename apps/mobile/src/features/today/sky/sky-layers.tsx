import {
	Group,
	Image,
	interpolateColors,
	LinearGradient,
	Mask,
	Path,
	Rect,
	type SkImage,
	type SkPoint,
	vec,
} from "@shopify/react-native-skia";
import type { ComponentProps, ReactNode } from "react";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import {
	LATE_GRADIENT,
	NIGHT_FEATHER,
	RIDGES,
	SKY,
	type SkyLook,
} from "./sky-model";
import type { SkyMotion } from "./use-sky-motion";

/** The sky's layers that don't move with the clock: drawn live while they change, baked at rest. */

const TOP = vec(0, 0);
const BOTTOM = vec(0, SKY.h);
const DAYS = ["dawn", "day", "evening"] as const;
/** A Skia prop that is either fixed (a baked layer) or animated (the live one). */
type Live<T> = T | SharedValue<T>;
export type Day = (typeof DAYS)[number];
/** A baked texture, drawn 1:1 with the device's pixels. */
export function BakedImage({
	image,
	width,
	height,
}: {
	image: SharedValue<SkImage | null>;
	width: number;
	height: number;
}) {
	return (
		<Image fit="fill" height={height} image={image} width={width} x={0} y={0} />
	);
}

type BackdropProps = Record<Day, Live<number>> & {
	nightStart: Live<SkPoint>;
	nightEnd: Live<SkPoint>;
	nightShown: Live<number>;
	gradients: SkyLook["gradients"];
	width: number;
	page: string;
};

/**
 * The three palettes, then night falling from the top (night-sleep-score's
 * front, without a shader): the late palette is shown through a mask whose
 * feathered edge travels down.
 */
export function Backdrop({
	width,
	page,
	gradients,
	nightStart,
	nightEnd,
	nightShown,
	...days
}: BackdropProps) {
	return (
		<>
			{DAYS.map((d) => (
				<Rect
					height={SKY.h}
					key={d}
					opacity={days[d]}
					width={width}
					x={0}
					y={0}
				>
					<LinearGradient
						colors={[...gradients[d].colors, page]}
						end={BOTTOM}
						positions={gradients[d].positions}
						start={TOP}
					/>
				</Rect>
			))}
			<Group opacity={nightShown}>
				<Mask
					mask={
						<Rect height={SKY.h} width={width} x={0} y={0}>
							<LinearGradient
								colors={["#000000", "rgba(0,0,0,0)"]}
								end={nightEnd}
								start={nightStart}
							/>
						</Rect>
					}
				>
					<Rect height={SKY.h} width={width} x={0} y={0}>
						<LinearGradient
							colors={LATE_GRADIENT.colors}
							end={BOTTOM}
							positions={LATE_GRADIENT.positions}
							start={TOP}
						/>
					</Rect>
				</Mask>
			</Group>
		</>
	);
}

export function LiveBackdrop({
	motion: m,
	gradients,
	width,
	page,
}: {
	motion: SkyMotion;
	gradients: SkyLook["gradients"];
	width: number;
	page: string;
}) {
	const nightStart = useDerivedValue(() => vec(0, SKY.h * m.night.get()));
	const nightEnd = useDerivedValue(() =>
		vec(0, SKY.h * (m.night.get() + NIGHT_FEATHER))
	);
	const nightShown = useDerivedValue((): number =>
		m.night.get() > -NIGHT_FEATHER + 0.001 ? 1 : 0
	);
	return (
		<Backdrop
			dawn={m.dawn}
			day={m.day}
			evening={m.evening}
			gradients={gradients}
			nightEnd={nightEnd}
			nightShown={nightShown}
			nightStart={nightStart}
			page={page}
			width={width}
		/>
	);
}
