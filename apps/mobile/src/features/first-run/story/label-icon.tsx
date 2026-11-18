import Svg, { Circle, Path, Rect } from "react-native-svg";
import type { BeatId } from "../copy";

/** Board label icons (inline SVGs), in the beat's lit colour. */
export function LabelIcon({ id, color }: { id: BeatId; color: string }) {
	if (id === "dusk" || id === "proof") {
		return (
			<Svg
				height={id === "dusk" ? 16 : 15}
				viewBox="0 0 24 24"
				width={id === "dusk" ? 16 : 15}
			>
				<Path
					d="M12 2c1 4 6 6 6 12a6 6 0 1 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4-1-6 1-9z"
					fill={color}
				/>
			</Svg>
		);
	}
	if (id === "mirror") {
		return (
			<Svg height={15} viewBox="0 0 24 24" width={15}>
				<Path
					d="M10 2l1.6 4.9L16.5 8.5l-4.9 1.6L10 15l-1.6-4.9L3.5 8.5l4.9-1.6zM18 13l.9 2.6 2.6.9-2.6.9L18 20l-.9-2.6-2.6-.9 2.6-.9z"
					fill={color}
				/>
			</Svg>
		);
	}
	if (id === "vent") {
		return (
			<Svg
				fill="none"
				height={15}
				stroke={color}
				strokeLinecap="round"
				strokeWidth={2.2}
				viewBox="0 0 24 24"
				width={15}
			>
				<Rect height={11} rx={3} width={6} x={9} y={3} />
				<Path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
			</Svg>
		);
	}
	if (id === "xolacers") {
		return (
			<Svg height={15} viewBox="0 0 24 22" width={16}>
				<Circle cx={9} cy={6} fill={color} r={4} />
				<Circle cx={17} cy={7} fill={color} r={3} />
				<Path
					d="M1 20c0-4.4 3.6-7 8-7s8 2.6 8 7zM17.5 12c3 0 5.5 2 5.5 5.5V19h-4.5c0-2.6-.8-4.8-2.6-6.5.5-.3 1-.5 1.6-.5z"
					fill={color}
				/>
			</Svg>
		);
	}
	return (
		<Svg height={15} viewBox="0 0 24 24" width={15}>
			<Circle
				cx={12}
				cy={12}
				fill="none"
				r={10}
				stroke={color}
				strokeWidth={2}
			/>
			<Path
				d="M12 5.5c.6 2.4 3.6 3.6 3.6 7.2a3.6 3.6 0 1 1-7.2 0c0-1.8 1.2-3 1.8-3.6 0 1.2.6 1.8 1.2 1.8 0-2.4-.6-3.6.6-5.4z"
				fill={color}
			/>
		</Svg>
	);
}
