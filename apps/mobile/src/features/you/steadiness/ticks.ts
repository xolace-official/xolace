/**
 * Tick paths for the dial, the half gauge and the meters, drawn in one Skia canvas each: one
 * path for the track, one for the lit ticks whose `end` follows one shared value (steadiness.md
 * §7). Production drew a worklet per tick.
 */
import { Skia, type SkPath } from "@shopify/react-native-skia";
import { type SharedValue, useDerivedValue } from "react-native-reanimated";
import { useTokenColor } from "@/lib/use-token-color";

/** A hair short of a whole tick, so a trimmed end never leaves a capped dot. */
const SNAP_EPS = 0.01;

/** `n` ticks on a circle from `start`° over `sweep`°, one contour each. */
export function tickPath(
	n: number,
	start: number,
	sweep: number,
	radius: number,
	len: number,
	cx: number,
	cy: number
): SkPath {
	const p = Skia.PathBuilder.Make();
	for (let i = 0; i < n; i++) {
		const a = ((start + (sweep / (n - 1)) * i) * Math.PI) / 180;
		p.moveTo(
			cx + Math.cos(a) * (radius - len),
			cy + Math.sin(a) * (radius - len)
		);
		p.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
	}
	return p.build();
}

/** The trim end for `lit` of `n` equal ticks, snapped to whole ticks, as `progress` runs 0–1. */
export function useSnappedEnd(
	progress: SharedValue<number>,
	lit: number,
	n: number
) {
	const end = useDerivedValue(() => {
		const k = Math.floor(progress.get() * lit + 1e-6);
		return k <= 0 ? 0 : (k - SNAP_EPS) / n;
	});
	const opacity = useDerivedValue(() => (progress.get() * lit >= 1 ? 1 : 0));
	return { end, opacity };
}

/** The unlit ticks' colour (production's `border`). */
export const useTrack = () => useTokenColor("border");
