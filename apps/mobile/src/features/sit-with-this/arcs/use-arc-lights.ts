import { vec } from "@shopify/react-native-skia";
import { useDerivedValue } from "react-native-reanimated";
import type { SitClock } from "../clock/use-sit-clock";
import { LIGHT as L } from "../sit-look";

/** Room around the arcs for the edge light's blur (σ 22), as card-light's bleed. */
export const BLEED = 80;
/** Room above and below the seam texture for its widest blur (σ 14). */
export const SEAM_PAD = 44;

/**
 * Where the arcs' lights sit this frame, from the clock's geometry and light
 * (handoff §4): only positions, sizes and opacities, so the baked textures
 * and gradients never rebuild.
 */
export function useArcLights(
	clock: SitClock,
	W: number,
	edgeRange: readonly [number, number]
) {
	const { geo, g, lp } = clock;
	// Edge light: x = bottom.x + 40, width = bottom.w − 80, top = bottom.y + bottom.h − 30.
	const edgeX = useDerivedValue(() => geo.get().bot.x + L.edge.inset - BLEED);
	const edgeY = useDerivedValue(
		() => geo.get().bot.y + geo.get().bot.h - L.edge.below - BLEED
	);
	const edgeW = useDerivedValue(
		() => Math.max(0, geo.get().bot.w - L.edge.inset * 2) + BLEED * 2
	);
	const [lo, hi] = edgeRange;
	const edgeO = useDerivedValue(() => lo + (hi - lo) * lp.get());
	// Seam: centred on the gap, as long as the narrower arc less 24.
	const seamWNow = useDerivedValue(
		() => Math.min(geo.get().top.w, geo.get().bot.w) - L.seamInset
	);
	const seamX = useDerivedValue(() => (W - seamWNow.get()) / 2 - SEAM_PAD);
	const seamY = useDerivedValue(() => geo.get().seamY - SEAM_PAD);
	const seamDrawW = useDerivedValue(() => seamWNow.get() + SEAM_PAD * 2);
	// Top wash: from the top, clear at .7 of the arc.
	const washA = useDerivedValue(() => vec(0, geo.get().top.y));
	const washB = useDerivedValue(() =>
		vec(0, geo.get().top.y + geo.get().top.h * L.washTo)
	);
	// Floor light: from the floor, clear at `reach` (.35 → .80 with the light's progress).
	const floorA = useDerivedValue(() =>
		vec(0, geo.get().bot.y + geo.get().bot.h)
	);
	const floorB = useDerivedValue(() => {
		const b = geo.get().bot;
		return vec(0, b.y + b.h - (L.reach.from + L.reach.by * lp.get()) * b.h);
	});
	// Rim catch (touch-glow-button): a radial centred on the gap.
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
