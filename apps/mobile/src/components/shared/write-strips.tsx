import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";

export const WRITE_ON = {
	glow: { at: 0.45, max: 0.34, r: 8 },
	head: 56,
	lead: 160,
	line: 260,
	rowAfter: 420,
	rowMs: 400,
	sweep: 420,
} as const;

const lineStart = (line: number) => {
	"worklet";
	return WRITE_ON.lead + line * WRITE_ON.line;
};

export const writeEnd = (lines: number) => {
	"worklet";
	return (
		lineStart(Math.max(0, lines - 1)) +
		WRITE_ON.sweep +
		WRITE_ON.rowAfter +
		WRITE_ON.rowMs
	);
};

const clamp01 = (x: number) => {
	"worklet";
	return Math.min(1, Math.max(0, x));
};

const BLEED = { left: 4, right: 8 } as const;

export type Line = { x: number; y: number; width: number; height: number };

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
		const u = (write.get() - lineStart(index)) / WRITE_ON.sweep;
		return { transform: [{ translateX: clamp01(u) * (w + WRITE_ON.head) }] };
	});
	const shine = useAnimatedStyle(() => {
		if (!glow) {
			return { opacity: 1 };
		}
		const u = (write.get() - lineStart(index)) / WRITE_ON.sweep;
		const off = u <= 0 || u >= 1.4;
		return {
			opacity: off
				? 0
				: WRITE_ON.glow.max * Math.exp(-(((u - WRITE_ON.glow.at) / 0.3) ** 2)),
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
				style={[{ left: -(w + WRITE_ON.head), width: w + WRITE_ON.head }, head]}
			>
				<View style={{ backgroundColor: color, width: w }} />
				<LinearGradient
					colors={[color, clearOf(color)]}
					end={{ x: 1, y: 0.5 }}
					start={{ x: 0, y: 0.5 }}
					style={{ width: WRITE_ON.head }}
				/>
			</Animated.View>
		</Animated.View>
	);
}
