import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { EASING, EaseView, stateTransition } from "@/design/ease";
import { LT } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

/** Solid to the bar's bottom, then fading out this far below (Explore's `.top .edge`). */
const EDGE_FADE = 24;
const EDGE_TIMING = {
	duration: LT.barTitleMs,
	easing: EASING.inOutQuad,
	type: "timing",
} as const;

/**
 * The page colour behind the bar once the hub's cover has scrolled under it (the prototype's
 * Explore `FoldedEdge`, on Ease as it was there). A sibling after the scroll view, never its
 * wrapper: the native header tracks only a scroll view that is the screen's first child.
 */
export function FoldedEdge({
	on,
	barBottom,
}: {
	on: boolean;
	barBottom: number;
}) {
	const reduced = useEffectiveReducedMotion();
	const page = useTokenColor("background");
	const h = barBottom + EDGE_FADE;
	return (
		<EaseView
			animate={{ opacity: on ? 1 : 0 }}
			className="absolute inset-x-0 top-0"
			initialAnimate={{ opacity: 0 }}
			pointerEvents="none"
			style={{ height: h }}
			transition={stateTransition(reduced, EDGE_TIMING)}
		>
			<LinearGradient
				className="flex-1"
				colors={[page, page, clearOf(page)]}
				locations={[0, barBottom / h, 1]}
			/>
		</EaseView>
	);
}
