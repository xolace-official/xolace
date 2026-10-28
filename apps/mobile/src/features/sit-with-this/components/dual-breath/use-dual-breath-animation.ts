import { useDerivedValue, useSharedValue } from "react-native-reanimated";
import {
	BOT_CORNERS,
	GAP,
	SHAPE,
	TOP_CORNERS,
} from "@/features/sit-with-this/components/dual-breath/dual-breath.constants";

function lerp(a: number, b: number, t: number): number {
	"worklet";
	return a + (b - a) * t;
}

export function useDualBreathAnimation() {
	// 0 = exhale rest (tall top, small bottom)
	// 1 = inhale peak (small top, tall bottom)
	const progress = useSharedValue(0);

	// Oscillates during hold; applied to corner radii for an organic quality
	const wobbleAmt = useSharedValue(0);

	// Updated by Skia's onSize as the canvas dimensions are known
	const canvasSize = useSharedValue({ height: 0, width: 0 });

	// Intermediate height values shared between the pair-centering and the RRect builds
	const topH = useDerivedValue(() => {
		const { height } = canvasSize.get();
		return lerp(
			SHAPE.top.rest.hRatio * height,
			SHAPE.top.peak.hRatio * height,
			progress.get()
		);
	});

	const botH = useDerivedValue(() => {
		const { height } = canvasSize.get();
		return lerp(
			SHAPE.bot.rest.hRatio * height,
			SHAPE.bot.peak.hRatio * height,
			progress.get()
		);
	});

	// Both shapes move as a unit so they stay close together
	const pairStartY = useDerivedValue(() => {
		const { height } = canvasSize.get();
		return (height - topH.get() - GAP - botH.get()) / 2;
	});

	// Per-corner radii give the organic stone quality
	const topRRect = useDerivedValue(() => {
		const { width } = canvasSize.get();
		const p = progress.get();
		const w = lerp(
			SHAPE.top.rest.wRatio * width,
			SHAPE.top.peak.wRatio * width,
			p
		);
		const h = topH.get();
		const x = (width - w) / 2;
		const y = pairStartY.get();
		const r =
			lerp(SHAPE.top.rest.baseR, SHAPE.top.peak.baseR, p) + wobbleAmt.get();
		return {
			bottomLeft: {
				x: r * TOP_CORNERS.bottomLeft.x,
				y: r * TOP_CORNERS.bottomLeft.y,
			},
			bottomRight: {
				x: r * TOP_CORNERS.bottomRight.x,
				y: r * TOP_CORNERS.bottomRight.y,
			},
			rect: { height: h, width: w, x, y },
			topLeft: { x: r * TOP_CORNERS.topLeft.x, y: r * TOP_CORNERS.topLeft.y },
			topRight: {
				x: r * TOP_CORNERS.topRight.x,
				y: r * TOP_CORNERS.topRight.y,
			},
		};
	});

	// Anchored just below the top shape via the fixed GAP
	const botRRect = useDerivedValue(() => {
		const { width } = canvasSize.get();
		const p = progress.get();
		const w = lerp(
			SHAPE.bot.rest.wRatio * width,
			SHAPE.bot.peak.wRatio * width,
			p
		);
		const h = botH.get();
		const x = (width - w) / 2;
		const y = pairStartY.get() + topH.get() + GAP;
		const r =
			lerp(SHAPE.bot.rest.baseR, SHAPE.bot.peak.baseR, p) + wobbleAmt.get();
		return {
			bottomLeft: {
				x: r * BOT_CORNERS.bottomLeft.x,
				y: r * BOT_CORNERS.bottomLeft.y,
			},
			bottomRight: {
				x: r * BOT_CORNERS.bottomRight.x,
				y: r * BOT_CORNERS.bottomRight.y,
			},
			rect: { height: h, width: w, x, y },
			topLeft: { x: r * BOT_CORNERS.topLeft.x, y: r * BOT_CORNERS.topLeft.y },
			topRight: {
				x: r * BOT_CORNERS.topRight.x,
				y: r * BOT_CORNERS.topRight.y,
			},
		};
	});

	return { botRRect, canvasSize, progress, topRRect, wobbleAmt };
}
