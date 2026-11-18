import { Circle } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { easeOutFn, seg, sparkFn } from "../today-motion";
import { KINDLING_LIGHT } from "../today-palette";
import { BEAT, NODE } from "./kindling-model";

/** A ring going out from the node as the light arrives: 1 → 3, .7 → 0. */
export function Ping({
	at,
	beat,
	color,
}: {
	at: number;
	beat: SharedValue<number>;
	color: string;
}) {
	const e = useDerivedValue(() =>
		easeOutFn(seg(beat.get(), at, at + BEAT.ping))
	);
	const r = useDerivedValue(() => NODE.r * (1 + 2 * e.get()));
	const opacity = useDerivedValue(() =>
		beat.get() >= at && beat.get() < at + BEAT.ping ? 0.7 * (1 - e.get()) : 0
	);
	return (
		<Circle
			color={color}
			cx={0}
			cy={0}
			opacity={opacity}
			r={r}
			strokeWidth={1.6}
			style="stroke"
		/>
	);
}

/** One of five sparks lifting off the tended node. */
export function Spark({
	s,
	beat,
}: {
	s: readonly [number, number, number];
	beat: SharedValue<number>;
}) {
	const e = useDerivedValue(() =>
		sparkFn(seg(beat.get(), BEAT.sparksAt, BEAT.sparksAt + BEAT.sparks))
	);
	const cx = useDerivedValue(() => s[0] * e.get());
	const cy = useDerivedValue(() => s[1] * e.get());
	const opacity = useDerivedValue(() => {
		const b = beat.get();
		return b >= BEAT.sparksAt && b < BEAT.sparksAt + BEAT.sparks
			? 1 - e.get()
			: 0;
	});
	return (
		<Circle
			color={KINDLING_LIGHT.spark}
			cx={cx}
			cy={cy}
			opacity={opacity}
			r={s[2]}
		/>
	);
}
