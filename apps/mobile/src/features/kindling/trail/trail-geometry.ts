import { Skia, type SkPath } from "@shopify/react-native-skia";
import { DESIGN_W, type TrailPoints, trailPoints } from "./trail-points";

export type Trail = TrailPoints & {
	width: number;
	/** One Skia path per leg, in the order of `legs`, with a key to draw it by. */
	roads: { key: string; path: SkPath }[];
};

const cache = new Map<string, Trail>();
const SX_STEPS = 1000;

/** The trail for this many twigs on this wide a phone: x stretches, strokes and circles don't. */
export function trailGeometry(width: number, count: number): Trail {
	const sx = Math.round((width / DESIGN_W) * SX_STEPS) / SX_STEPS;
	const key = `${count}:${sx}`;
	const hit = cache.get(key);
	if (hit) {
		return hit;
	}
	const points = trailPoints(count, sx);
	const roads = points.legs.map(([a, b, c, d], j) => ({
		key: `leg${j}`,
		path: Skia.PathBuilder.Make()
			.moveTo(a[0], a[1])
			.cubicTo(b[0], b[1], c[0], c[1], d[0], d[1])
			.build(),
	}));
	const trail = { ...points, roads, width };
	cache.set(key, trail);
	return trail;
}
