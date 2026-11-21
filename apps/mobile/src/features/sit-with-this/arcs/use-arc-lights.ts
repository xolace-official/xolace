import { vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import type { SitClock } from "../clock/use-sit-clock";
import { LIGHT as L } from "../sit-look";

export const BLEED = 80;
export const SEAM_PAD = 44;

export function useArcLights(
	clock: SitClock,
	W: number,
	edgeRange: readonly [number, number]
) {
	const { geo, g, lp } = clock;
	const edgeX = useDerivedValue(() => geo.get().bot.x + L.edge.inset - BLEED);
	const edgeY = useDerivedValue(
		() => geo.get().bot.y + geo.get().bot.h - L.edge.below - BLEED
	);
	const edgeW = useDerivedValue(
		() => Math.max(0, geo.get().bot.w - L.edge.inset * 2) + BLEED * 2
	);
	const [lo, hi] = edgeRange;
	const edgeO = useDerivedValue(() => lo + (hi - lo) * lp.get());
	const seamWNow = useDerivedValue(
		() => Math.min(geo.get().top.w, geo.get().bot.w) - L.seamInset
	);
	const seamX = useDerivedValue(() => (W - seamWNow.get()) / 2 - SEAM_PAD);
	const seamY = useDerivedValue(() => geo.get().seamY - SEAM_PAD);
	const seamDrawW = useDerivedValue(() => seamWNow.get() + SEAM_PAD * 2);
	const washA = useDerivedValue(() => vec(0, geo.get().top.y));
	const washB = useDerivedValue(() =>
		vec(0, geo.get().top.y + geo.get().top.h * L.washTo)
	);
	const floorA = useDerivedValue(() =>
		vec(0, geo.get().bot.y + geo.get().bot.h)
	);
	const floorB = useDerivedValue(() => {
		const b = geo.get().bot;
		return vec(0, b.y + b.h - (L.reach.from + L.reach.by * lp.get()) * b.h);
	});
	const rimC = useDerivedValue(() => vec(W / 2, geo.get().seamY));
	const rimR = useDerivedValue(() =>
		Math.max(1, Math.min(geo.get().top.w, geo.get().bot.w) * L.rimR)
	);
	const rimO = useDerivedValue(() => g.get() * L.rimOpacity);

	return {
		edgeO,
		edgeW,
		edgeX,
		edgeY,
		floorA,
		floorB,
		rimC,
		rimO,
		rimR,
		seamDrawW,
		seamX,
		seamY,
		washA,
		washB,
	};
}
