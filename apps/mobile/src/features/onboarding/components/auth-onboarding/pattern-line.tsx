/**
 * The Xolace+ beat's visual: scattered points, then the line through them.
 *
 *        ·        ·                              ·
 *     ●                                       ●
 *        ●     ●                        ●
 *              ·     ●     ●      ·
 *
 *     → then a line finds the seven that were never noise
 *
 */
import { View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle, Polyline } from "react-native-svg";

import { useDeckColor } from "./deck-color";

/** Viewbox units. The component scales to whatever width it is given. */
const W = 100;
const H = 40;

/**
 * The seven that turn out to be a shape — a dip and a recovery, read left to
 * right. Hand-placed: an even curve reads as a function plot, and the point is
 * that this came out of a life, not a formula.
 */
const SIGNAL = [
	[6, 14],
	[20, 22],
	[33, 30],
	[46, 33],
	[59, 28],
	[73, 18],
	[88, 9],
];

/** Off the curve, and they stay that way. See the note above. */
const NOISE = [
	[14, 34],
	[40, 8],
	[66, 36],
	[81, 30],
];

/** After the beat's own text has landed (see STEP/DUR in `plus-beat`). */
const FIND = 780;

export const PatternLine = ({ height = 116 }: { height?: number }) => {
	const ember = useDeckColor("ember");
	const foreground = useDeckColor("foreground");
	const reduced = useReducedMotion();

	const points = SIGNAL.map(([x, y]) => `${x},${y}`).join(" ");

	return (
		<View pointerEvents="none" style={{ height }}>
			<Svg
				height="100%"
				preserveAspectRatio="none"
				viewBox={`0 0 ${W} ${H}`}
				width="100%"
			>
				{[...SIGNAL, ...NOISE].map(([x, y]) => (
					<Circle
						cx={x}
						cy={y}
						fill={foreground}
						key={`${x}-${y}`}
						opacity={0.22}
						r={1.5}
					/>
				))}
			</Svg>

			<Animated.View
				className="absolute inset-0"
				entering={reduced ? undefined : FadeIn.delay(FIND).duration(1100)}
			>
				<Svg
					height="100%"
					preserveAspectRatio="none"
					viewBox={`0 0 ${W} ${H}`}
					width="100%"
				>
					<Polyline
						fill="none"
						points={points}
						stroke={ember}
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeOpacity={0.55}
						strokeWidth={0.7}
					/>
				</Svg>
			</Animated.View>

			<Animated.View
				className="absolute inset-0"
				entering={reduced ? undefined : FadeIn.delay(FIND + 220).duration(900)}
			>
				<Svg
					height="100%"
					preserveAspectRatio="none"
					viewBox={`0 0 ${W} ${H}`}
					width="100%"
				>
					{SIGNAL.map(([x, y]) => (
						<Circle
							cx={x}
							cy={y}
							fill={ember}
							key={`${x}-${y}`}
							opacity={0.9}
							r={1.7}
						/>
					))}
				</Svg>
			</Animated.View>
		</View>
	);
};
