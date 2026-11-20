import {
	Circle,
	Group,
	interpolateColors,
	Path,
	Skia,
} from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { keyframes } from "@/design/keyframes";
import { easeCssFn, easeOutFn, popFn, seg, sparkFn } from "../today-motion";
import { BEAT, NODE } from "./kindling-model";
import { Ping, Spark } from "./node-effects";

const CHECK = Skia.Path.MakeFromSVGString(NODE.check) ?? Skia.Path.Make();
const POP = [
	[0, 1],
	[0.35, 1.32],
	[1, 1],
] as const;
const TAU = Math.PI * 2;
const WAIT = NODE.waitAlpha;

export type NodeColours = {
	surface: string;
	well: string;
	waitStroke: string;
	violet: string;
	ember: string;
	check: string;
};

type Props = {
	x: number;
	y: number;
	state: "done" | "current" | "waiting";
	popping: boolean;
	arriving: boolean;
	beat: SharedValue<number>;
	clock: SharedValue<number>;
	c: NodeColours;
};

export function KindlingNode({
	x,
	y,
	state,
	popping,
	arriving,
	beat,
	clock,
	c,
}: Props) {
	const done = state === "done";
	const current = state === "current";

	const transform = useDerivedValue(() => {
		const b = beat.get();
		let s = state === "waiting" ? NODE.waiting : 1;
		if (popping) {
			s = keyframes(b / BEAT.pop, POP, popFn);
		}
		if (arriving) {
			s =
				b < BEAT.arriveAt
					? 0.6
					: 0.6 +
						0.4 * popFn(seg(b, BEAT.arriveAt, BEAT.arriveAt + BEAT.arrive));
		}
		return [{ translateX: x }, { translateY: y }, { scale: s }];
	});

	const turn = useDerivedValue(() =>
		arriving
			? easeCssFn(seg(beat.get(), BEAT.arriveAt, BEAT.arriveAt + BEAT.colourIn))
			: 1
	);
	const fill = useDerivedValue(() =>
		done
			? c.ember
			: current
				? interpolateColors(turn.get(), [0, 1], [c.well, c.surface])
				: c.well
	);
	const stroke = useDerivedValue(() =>
		done
			? c.ember
			: current
				? interpolateColors(turn.get(), [0, 1], [c.waitStroke, c.violet])
				: c.waitStroke
	);
	const lit = useDerivedValue(() => (done ? 1 : current ? turn.get() : 0));
	const strokeOpacity = useDerivedValue(() => WAIT + (1 - WAIT) * lit.get());
	const strokeW = useDerivedValue(() =>
		done ? 1 : current ? 1.5 + 1.5 * turn.get() : 1.5
	);

	const breath = useDerivedValue(
		() => 0.5 - 0.5 * Math.cos((TAU * clock.get()) / NODE.breathS)
	);
	const dotIn = useDerivedValue(() =>
		arriving ? easeCssFn(seg(beat.get(), BEAT.dotAt, BEAT.dotAt + 300)) : 1
	);
	const haloIn = useDerivedValue(() =>
		arriving ? easeCssFn(seg(beat.get(), BEAT.haloAt, BEAT.haloAt + 400)) : 1
	);
	const dotR = useDerivedValue(() => NODE.dot * (1 + 0.18 * breath.get()));
	const haloR = useDerivedValue(() => NODE.halo * (0.9 + 0.2 * breath.get()));
	const haloOpacity = useDerivedValue(
		() => (0.12 + 0.12 * breath.get()) * haloIn.get()
	);

	const checkEnd = useDerivedValue(() =>
		popping
			? easeOutFn(seg(beat.get(), BEAT.checkAt, BEAT.checkAt + BEAT.check))
			: 1
	);
	const ripple = useDerivedValue(() =>
		easeOutFn(seg(beat.get(), 0, BEAT.ripple))
	);
	const rippleR = useDerivedValue(() => NODE.r * (1 + ripple.get()));
	const rippleOpacity = useDerivedValue(() =>
		popping && beat.get() < BEAT.ripple ? 0.8 * (1 - ripple.get()) : 0
	);

	return (
		<Group transform={transform}>
			{current ? (
				<Circle
					color={c.violet}
					cx={0}
					cy={0}
					opacity={haloOpacity}
					r={haloR}
				/>
			) : null}
			{arriving
				? BEAT.pings.map((at) => (
						<Ping at={at} beat={beat} color={c.violet} key={at} />
					))
				: null}
			{popping ? (
				<Circle
					color={c.ember}
					cx={0}
					cy={0}
					opacity={rippleOpacity}
					r={rippleR}
					strokeWidth={2}
					style="stroke"
				/>
			) : null}
			<Circle color={fill} cx={0} cy={0} r={NODE.r} />
			<Circle
				color={stroke}
				cx={0}
				cy={0}
				opacity={strokeOpacity}
				r={NODE.r}
				strokeWidth={strokeW}
				style="stroke"
			/>
			{current ? (
				<Circle color={c.violet} cx={0} cy={0} opacity={dotIn} r={dotR} />
			) : null}
			{done ? (
				<Path
					color={c.check}
					end={checkEnd}
					path={CHECK}
					strokeCap="round"
					strokeJoin="round"
					strokeWidth={2.4}
					style="stroke"
				/>
			) : null}
			{popping
				? NODE.sparks.map((s) => (
						<Spark beat={beat} key={`${s[0]},${s[1]}`} s={s} />
					))
				: null}
		</Group>
	);
}
