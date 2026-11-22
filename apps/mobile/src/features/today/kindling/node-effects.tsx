import { Circle } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";
import { easeOutFn, seg, sparkFn } from "../today-motion";
import { BEAT, NODE } from "./kindling-model";

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

export function Spark({
	s,
	beat,
}: {
	s: readonly [number, number, number];
	beat: SharedValue<number>;
}) {
	const spark = useTokenColor("today-kindling-spark");
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
	return <Circle color={spark} cx={cx} cy={cy} opacity={opacity} r={s[2]} />;
}
