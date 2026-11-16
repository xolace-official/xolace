import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "../clear-of";
import { clamp01 } from "../timeline";
import { lineStart, WRITE } from "./quote-style";

/** An italic line's glyphs lean past its measured box: each strip covers a little more. */
const BLEED = { left: 4, right: 8 } as const;

export type Line = { x: number; y: number; width: number; height: number };

/** Under the quote's mask: one ink strip per line, its soft head sweeping left to right. */
type StripsProps = {
	lines: Line[];
	write: SharedValue<number>;
	color: string;
	glow?: boolean;
};

export function WriteStrips({
	lines,
	write,
	color,
	glow = false,
}: StripsProps) {
	return (
		<View className="absolute inset-0">
			{lines.map((l, i) => (
				<Strip
					color={color}
					glow={glow}
					index={i}
					key={`${l.y}`}
					line={l}
					write={write}
				/>
			))}
		</View>
	);
}

type StripProps = {
	index: number;
	line: Line;
	write: SharedValue<number>;
	color: string;
	glow: boolean;
};

function Strip({ index, line, write, color, glow }: StripProps) {
	const w = line.width + BLEED.left + BLEED.right;
	const head = useAnimatedStyle(() => {
		const u = (write.get() - lineStart(index)) / WRITE.sweep;
		return { transform: [{ translateX: clamp01(u) * (w + WRITE.head) }] };
	});
	const shine = useAnimatedStyle(() => {
		if (!glow) {
			return { opacity: 1 };
		}
		const u = (write.get() - lineStart(index)) / WRITE.sweep;
		const off = u <= 0 || u >= 1.4;
		return {
			opacity: off
				? 0
				: WRITE.glow.max * Math.exp(-(((u - WRITE.glow.at) / 0.3) ** 2)),
		};
	});
	return (
		<Animated.View
			className="absolute overflow-hidden"
			style={[
				{
					height: line.height,
					left: line.x - BLEED.left,
					top: line.y,
					width: w,
				},
				shine,
			]}
		>
			<Animated.View
				className="absolute inset-y-0 flex-row"
				style={[{ left: -(w + WRITE.head), width: w + WRITE.head }, head]}
			>
				<View style={{ backgroundColor: color, width: w }} />
				<LinearGradient
					colors={[color, clearOf(color)]}
					end={{ x: 1, y: 0.5 }}
					start={{ x: 0, y: 0.5 }}
					style={{ width: WRITE.head }}
				/>
			</Animated.View>
		</Animated.View>
	);
}
