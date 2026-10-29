// The proof beat's visual: one ember per person, drawn literally so `count` is the
// claim. A deterministic jittered grid (random points clump and read as a group),
// lit in three depth bands; `VOICED` is held out and haloed to carry the review.
import { View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import { EmberGlow } from "./ember-glow";

export const VOICED = { x: 0.08, y: 0.78 };
/** Points cleared around it, so the speaking ember never sits in a crowd. */
const CLEARANCE = 52;

/** Bands, far to near. Past ~3pt a dot stops reading as a distant light. */
const BANDS = [
	{ delay: 0, opacity: 0.22, r: 1.1 },
	{ delay: 200, opacity: 0.4, r: 1.6 },
	{ delay: 400, opacity: 0.72, r: 2.2 },
];

/** After the beat's own text has landed — matches `PatternLine`'s FIND. */
const LIGHT = 700;

/** Deterministic 0..1 from an integer (fract(sin)); same on every render and platform. */
const noise = (n: number) => {
	const v = Math.sin(n * 12.9898) * 43_758.5453;
	return v - Math.floor(v);
};

/** One ember per grid cell, jittered within 78% of the cell so the grid never shows and
 * neighbours never touch. */
const scatter = (count: number, width: number, height: number) => {
	const cols = Math.max(1, Math.round(Math.sqrt((count * width) / height)));
	const rows = Math.max(1, Math.ceil(count / cols));
	const cw = 1 / cols;
	const ch = 1 / rows;

	const points: { x: number; y: number }[] = [];
	for (let i = 0; i < count; i += 1) {
		const x = (i % cols) * cw + cw * (0.11 + noise(i + 1) * 0.78);
		const y = Math.floor(i / cols) * ch + ch * (0.11 + noise(i + 91) * 0.78);
		// In points, not normalised units: a normalised radius would clear an ellipse.
		const dx = (x - VOICED.x) * width;
		const dy = (y - VOICED.y) * height;
		const dist = Math.hypot(dx, dy);

		// Points inside the clearance are projected onto its edge, never dropped:
		// the drawn count must equal `count`.
		const scale = dist < CLEARANCE ? CLEARANCE / Math.max(dist, 0.001) : 1;
		points.push({
			x: x * width + dx * (scale - 1),
			y: y * height + dy * (scale - 1),
		});
	}
	return points;
};

export const EmberField = ({
	count,
	color,
	width,
	height,
}: {
	/** How many people. Drawn literally. */
	count: number;
	color: string;
	width: number;
	height: number;
}) => {
	const reduced = useReducedMotion();
	const points = scatter(Math.max(0, count - 1), width, height);

	// Points, not viewbox units, so the halo does not stretch with the box.
	const halo = Math.min(width, height) * 0.42;

	return (
		<View pointerEvents="none" style={{ height, width }}>
			{BANDS.map((band, index) => (
				<Animated.View
					className="absolute inset-0"
					entering={
						reduced ? undefined : FadeIn.delay(LIGHT + band.delay).duration(900)
					}
					key={band.delay}
				>
					<Svg height={height} width={width}>
						{points
							// Round-robin, not contiguous slices: slices follow grid order and
							// would land each depth in its own horizontal stripe.
							.filter((_, i) => i % BANDS.length === index)
							.map((p) => (
								<Circle
									cx={p.x}
									cy={p.y}
									fill={color}
									key={`${p.x}-${p.y}`}
									opacity={band.opacity}
									r={band.r}
								/>
							))}
					</Svg>
				</Animated.View>
			))}

			{/* The voiced ember: last to arrive, the only one with a halo. */}
			<Animated.View
				className="absolute items-center justify-center"
				entering={
					reduced ? undefined : FadeIn.delay(LIGHT + 700).duration(1000)
				}
				style={{
					height: halo,
					left: VOICED.x * width - halo / 2,
					top: VOICED.y * height - halo / 2,
					width: halo,
				}}
			>
				<View className="absolute inset-0">
					<EmberGlow
						color={color}
						id="proof-voiced"
						opacity={0.4}
						size={halo}
					/>
				</View>
				<View
					className="h-1.5 w-1.5 rounded-full"
					style={{ backgroundColor: color }}
				/>
			</Animated.View>
		</View>
	);
};
