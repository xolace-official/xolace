type WashTokens = {
	accent: string;
	surface: string;
	surfaceTertiary: string;
	background: string;
};

/**
 * Nine stops 45° apart from 3 o'clock, peaking straight down; only `--accent` varies (#246).
 */
export const buildSweepStops = ({
	accent,
	surface,
	surfaceTertiary,
	background,
}: WashTokens) => [
	accent + "33", //   0° right
	accent + "4D", //  45° down-right
	accent + "73", //  90° down, the peak
	accent + "4D", // 135° down-left
	accent + "26", // 180° left
	surfaceTertiary, // 225° up-left
	surface, //        270° up
	accent + "14", // 315° up-right, the lift
	background, //     360° ≡ 0°, closing the turn
];
