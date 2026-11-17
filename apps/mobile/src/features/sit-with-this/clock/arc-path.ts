import { Skia, type SkPath } from "@shopify/react-native-skia";
import type { Box, Corners } from "./breath";

/**
 * One arc as a rounded rect with per-corner radii (xray-bag-scan's
 * `addRRect`). Skia scales the radii down when a side overflows, as the
 * board's `rrect` does.
 */
export function arcPath(b: Box, c: Corners): SkPath {
	"worklet";
	return Skia.PathBuilder.Make()
		.addRRect({
			bottomLeft: { x: b.r * c.bottomLeft[0], y: b.r * c.bottomLeft[1] },
			bottomRight: { x: b.r * c.bottomRight[0], y: b.r * c.bottomRight[1] },
			rect: Skia.XYWHRect(b.x, b.y, b.w, b.h),
			topLeft: { x: b.r * c.topLeft[0], y: b.r * c.topLeft[1] },
			topRight: { x: b.r * c.topRight[0], y: b.r * c.topRight[1] },
		})
		.build();
}
