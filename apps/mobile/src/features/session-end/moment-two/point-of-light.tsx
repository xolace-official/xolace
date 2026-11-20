import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import type { SessionColors } from "../session-colors";
import { EASE, TS } from "../session-look";
import { clamp01 } from "../timeline";

type Pt = { x: number; y: number };
const SIZE = 11;
const SAMPLES = 48;
const TABLE = 96;

const KEYS = [0, 0.12, 0.88, 1] as const;
const SCALE = [0.2, 1.15, 0.8, 0.7] as const;
const ALPHA = [0, 1, 1, 0] as const;

function keyed(u: number, values: readonly number[]) {
	"worklet";
	for (let i = 1; i < KEYS.length; i++) {
		if (u <= KEYS[i]) {
			const f = EASE.line((u - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]));
			return values[i - 1] + (values[i] - values[i - 1]) * f;
		}
	}
	return values[values.length - 1];
}

function evenTable(p0: Pt, p1: Pt, p2: Pt, p3: Pt): Pt[] {
	const pts: Pt[] = [];
	const dist: number[] = [];
	let len = 0;
	for (let i = 0; i <= SAMPLES; i++) {
		const u = i / SAMPLES;
		const v = 1 - u;
		const p = {
			x:
				v * v * v * p0.x +
				3 * v * v * u * p1.x +
				3 * v * u * u * p2.x +
				u * u * u * p3.x,
			y:
				v * v * v * p0.y +
				3 * v * v * u * p1.y +
				3 * v * u * u * p2.y +
				u * u * u * p3.y,
		};
		if (i > 0) {
			len += Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y);
		}
		pts.push(p);
		dist.push(len);
	}
	const out: Pt[] = [];
	let c = 1;
	for (let s = 0; s < TABLE; s++) {
		const want = (s / (TABLE - 1)) * len;
		while (c < dist.length - 1 && dist[c] < want) {
			c++;
		}
		const span = dist[c] - dist[c - 1];
		const f = span > 0 ? (want - dist[c - 1]) / span : 1;
		out.push({
			x: pts[c - 1].x + (pts[c].x - pts[c - 1].x) * f,
			y: pts[c - 1].y + (pts[c].y - pts[c - 1].y) * f,
		});
	}
	return out;
}

type Props = {
	ox: number;
	y: (v: number) => number;
	startY: number;
	colors: SessionColors;
	cs: SharedValue<number>;
};

export function PointOfLight({ ox, y, startY, colors, cs }: Props) {
	const d = startY - y(352);
	const table = evenTable(
		{ x: ox + 195, y: startY },
		{ x: ox + 140, y: y(300) + d },
		{ x: ox + 250, y: y(230) },
		{ x: ox + 195, y: y(158) }
	);
	const style = useAnimatedStyle(() => {
		const u = (cs.get() - TS.point.at) / TS.point.ms;
		if (u <= 0 || u >= 1) {
			return {
				opacity: 0,
				transform: [
					{ translateX: table[0].x },
					{ translateY: table[0].y },
					{ scale: 0.2 },
				],
			};
		}
		const at = table[Math.round(EASE.line(clamp01(u)) * (TABLE - 1))];
		return {
			opacity: keyed(u, ALPHA),
			transform: [
				{ translateX: at.x },
				{ translateY: at.y },
				{ scale: keyed(u, SCALE) },
			],
		};
	});
	const [core, glow, halo] = colors.point;
	return (
		<Animated.View
			accessibilityElementsHidden
			className="absolute z-13 rounded-full"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={[
				{
					backgroundColor: core,
					boxShadow: `0 0 9px 3px ${glow}, 0 0 22px 8px ${halo}`,
					height: SIZE,
					left: -SIZE / 2,
					top: -SIZE / 2,
					width: SIZE,
				},
				style,
			]}
		/>
	);
}
