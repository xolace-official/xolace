// The previews' line icons, drawn on a 24 box at the board's weights.
import type { ReactNode } from "react";
import Svg, { Circle, Path } from "react-native-svg";

const ICONS = {
	briefcase: (c: string) => (
		<Path d="M4.5 8.5h15v10h-15zM9 8.5v-2h6v2" stroke={c} />
	),
	clock: (c: string) => (
		<>
			<Circle cx={12} cy={12} r={8.5} stroke={c} />
			<Path d="M12 7.5V12l3 2" stroke={c} />
		</>
	),
	heart: (c: string) => (
		<Path
			d="M12 18.5s-6.5-4-6.5-8.6A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 6.5 1.9c0 4.6-6.5 8.6-6.5 8.6z"
			stroke={c}
		/>
	),
	moon: (c: string) => (
		<Path d="M18.5 14.2A7 7 0 1 1 9.8 5.5a5.6 5.6 0 0 0 8.7 8.7z" stroke={c} />
	),
	person: (c: string) => (
		<>
			<Circle cx={12} cy={8.5} r={3.6} stroke={c} />
			<Path d="M5 19.5c1.2-3.6 3.8-5.2 7-5.2s5.8 1.6 7 5.2" stroke={c} />
		</>
	),
	wave: (c: string) => (
		<Path d="M4 12h1.5M8 8v8M11.5 5v14M15 9v6M18.5 11v2" stroke={c} />
	),
} as const satisfies Record<string, (c: string) => ReactNode>;

export type LineIconName = keyof typeof ICONS;

type Props = {
	color: string;
	name: LineIconName;
	size: number;
	weight: number;
};

export function LineIcon({ color, name, size, weight }: Props) {
	return (
		<Svg
			fill="none"
			height={size}
			strokeLinecap="round"
			strokeLinejoin="round"
			strokeWidth={weight}
			viewBox="0 0 24 24"
			width={size}
		>
			{ICONS[name](color)}
		</Svg>
	);
}
