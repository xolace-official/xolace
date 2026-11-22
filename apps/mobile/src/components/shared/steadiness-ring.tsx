import { SymbolView } from "expo-symbols";
import type { ComponentProps, ReactNode } from "react";
import { View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedProps,
} from "react-native-reanimated";
import Svg, {
	Circle,
	Defs,
	Line,
	Pattern,
	RadialGradient,
	Stop,
} from "react-native-svg";
import type { IconName } from "@/components/shared/icon";
import { useTokenColor } from "@/lib/use-token-color";

export type RingTone = "accent" | "ember" | "muted" | "subtle";

const SWEEP = 300;
const START = 90 + (360 - SWEEP) / 2;
const NOTCH_HALF = 6.5;
const NOTCH_W = 2.2;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
	size: number;
	stroke?: number;
	value: number | null;
	tone: RingTone;
	dashed?: boolean;
	icon: IconName;
	usual?: number | null;
	fill?: SharedValue<number>;
	children?: ReactNode;
};

export function SteadinessRing({
	size,
	stroke = 7,
	value,
	tone,
	dashed,
	icon,
	usual,
	fill,
	children,
}: Props) {
	const color = useTokenColor(tone);
	const track = useTokenColor("border");
	const fg = useTokenColor("foreground");

	const r = (size - stroke) / 2;
	const c = size / 2;
	const circ = 2 * Math.PI * r;
	const arc = (circ * SWEEP) / 360;
	const iconSize = Math.round(size * 0.16);
	const iconBottom = Math.max(0, stroke / 2 - 2);
	const discR = Math.min(
		r - stroke * 1.4,
		size - iconBottom - iconSize - 4 - c
	);
	const rotate = `rotate(${START} ${c} ${c})`;
	const lit = value === null ? 0 : (arc * value) / 100;
	const arcProps = {
		cx: c,
		cy: c,
		fill: "none",
		r,
		strokeLinecap: "round",
		strokeWidth: stroke,
		transform: rotate,
	} as const;
	const notch =
		usual == null ? null : ((START + (SWEEP * usual) / 100) * Math.PI) / 180;

	return (
		<View
			className="items-center justify-center"
			style={{ height: size, width: size }}
		>
			<Svg height={size} style={{ position: "absolute" }} width={size}>
				{!dashed && (
					<>
						<Defs>
							<RadialGradient cx="50%" cy="42%" id="disc" r="60%">
								<Stop offset="0" stopColor={color} stopOpacity={0.26} />
								<Stop offset="1" stopColor={color} stopOpacity={0.07} />
							</RadialGradient>
							<Pattern
								height={9}
								id="dots"
								patternUnits="userSpaceOnUse"
								width={9}
							>
								<Circle
									cx={4.5}
									cy={4.5}
									fill={fg}
									fillOpacity={0.09}
									r={0.8}
								/>
							</Pattern>
						</Defs>
						<Circle
							cx={c}
							cy={c}
							fill="url(#disc)"
							r={discR}
							stroke={color}
							strokeOpacity={0.18}
							strokeWidth={1}
						/>
						<Circle cx={c} cy={c} fill="url(#dots)" r={discR} />
					</>
				)}
				<Circle
					{...arcProps}
					opacity={dashed ? 1 : 0.7}
					stroke={track}
					strokeDasharray={dashed ? `2 ${stroke + 2}` : `${arc} ${circ}`}
				/>
				{value !== null && fill && (
					<FillArc
						arcProps={arcProps}
						color={color}
						dash={`${lit} ${circ}`}
						fill={fill}
						lit={lit}
					/>
				)}
				{value !== null && !fill && (
					<Circle
						{...arcProps}
						stroke={color}
						strokeDasharray={`${lit} ${circ}`}
					/>
				)}
				{notch === null ? null : (
					<Line
						stroke={fg}
						strokeLinecap="round"
						strokeWidth={NOTCH_W}
						x1={c + Math.cos(notch) * (r - NOTCH_HALF)}
						x2={c + Math.cos(notch) * (r + NOTCH_HALF)}
						y1={c + Math.sin(notch) * (r - NOTCH_HALF)}
						y2={c + Math.sin(notch) * (r + NOTCH_HALF)}
					/>
				)}
			</Svg>
			{children}
			<View style={{ bottom: iconBottom, position: "absolute" }}>
				<SymbolView
					name={icon}
					size={iconSize}
					tintColor={dashed ? track : color}
				/>
			</View>
		</View>
	);
}

function FillArc({
	arcProps,
	dash,
	lit,
	color,
	fill,
}: {
	arcProps: ComponentProps<typeof Circle>;
	dash: string;
	lit: number;
	color: string;
	fill: SharedValue<number>;
}) {
	const animated = useAnimatedProps(() => {
		const shown = lit * Math.min(1, Math.max(0, fill.get()));
		return { strokeDashoffset: lit - shown, strokeOpacity: shown > 0 ? 1 : 0 };
	});
	return (
		<AnimatedCircle
			{...arcProps}
			animatedProps={animated}
			stroke={color}
			strokeDasharray={dash}
		/>
	);
}
