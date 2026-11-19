import Svg, { Circle, Path, Rect } from "react-native-svg";

/** The Quotes board's own icons (its inline SVGs), so strokes and sizes match it exactly. */
export type QuoteIconName =
	| "close"
	| "pause"
	| "play"
	| "palette"
	| "star"
	| "pencil"
	| "heart"
	| "share"
	| "chevronRight"
	| "chevronLeft"
	| "check"
	| "lock"
	| "loopBadge"
	| "soundOn"
	| "soundOff";

type Props = {
	name: QuoteIconName;
	size: number;
	color: string;
	filled?: boolean;
	stroke?: number;
};

const HEART =
	"M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z";
const STAR =
	"M12 3.2l2.7 5.5 6 .9-4.35 4.25 1.03 6L12 17l-5.38 2.85 1.03-6L3.3 9.6l6-.9z";
export const HEART_PATH = HEART;

export function QuoteIcon({
	name,
	size,
	color,
	filled = false,
	stroke,
}: Props) {
	const line = {
		fill: "none",
		stroke: color,
		strokeLinecap: "round" as const,
		strokeLinejoin: "round" as const,
	};
	return (
		<Svg
			accessibilityElementsHidden
			height={size}
			importantForAccessibility="no"
			viewBox="0 0 24 24"
			width={size}
		>
			{name === "close" && (
				<Path d="M6 6l12 12M18 6L6 18" {...line} strokeWidth={stroke ?? 2.2} />
			)}
			{name === "pause" && (
				<>
					<Rect fill={color} height={14} rx={1.2} width={4} x={6} y={5} />
					<Rect fill={color} height={14} rx={1.2} width={4} x={14} y={5} />
				</>
			)}
			{name === "play" && (
				<Path
					d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5Z"
					fill={color}
				/>
			)}
			{name === "loopBadge" && <Path d="M7 4.5v15l13-7.5z" fill={color} />}
			{(name === "soundOn" || name === "soundOff") && (
				<Path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill={color} />
			)}
			{name === "soundOn" && (
				<Path
					d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"
					{...line}
					strokeWidth={1.9}
				/>
			)}
			{name === "soundOff" && (
				<Path d="M16 9.5l5 5M21 9.5l-5 5" {...line} strokeWidth={1.9} />
			)}
			{name === "palette" && (
				<>
					<Path
						d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1.4-3.4 1.5 1.5 0 0 1 1.1-2.6H18a3 3 0 0 0 3-3 9 9 0 0 0-9-9Z"
						{...line}
						strokeWidth={1.9}
					/>
					<Circle cx={7.5} cy={10.5} fill={color} r={1} />
					<Circle cx={11} cy={7} fill={color} r={1} />
					<Circle cx={16} cy={8.5} fill={color} r={1} />
				</>
			)}
			{name === "star" && (
				<Path
					d={STAR}
					{...line}
					fill={filled ? color : "none"}
					strokeWidth={1.9}
				/>
			)}
			{name === "heart" && (
				<Path
					d={HEART}
					{...line}
					fill={filled ? color : "none"}
					strokeWidth={1.9}
				/>
			)}
			{name === "pencil" && (
				<>
					<Path
						d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"
						{...line}
						strokeWidth={1.9}
					/>
					<Path d="M14 7l3 3" {...line} strokeWidth={1.9} />
				</>
			)}
			{name === "share" && (
				<Path
					d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"
					{...line}
					strokeWidth={1.9}
				/>
			)}
			{name === "chevronRight" && (
				<Path d="M9 6l6 6-6 6" {...line} strokeWidth={stroke ?? 2.4} />
			)}
			{name === "chevronLeft" && (
				<Path d="M15 6l-6 6 6 6" {...line} strokeWidth={stroke ?? 2.3} />
			)}
			{name === "check" && (
				<Path
					d="M5 12.5l4.5 4.5L19 7.5"
					{...line}
					strokeWidth={stroke ?? 2.4}
				/>
			)}
			{name === "lock" && (
				<>
					<Rect
						height={9}
						rx={2}
						width={14}
						x={5}
						y={11}
						{...line}
						strokeWidth={2.2}
					/>
					<Path d="M8 11V8a4 4 0 0 1 8 0v3" {...line} strokeWidth={2.2} />
				</>
			)}
		</Svg>
	);
}
