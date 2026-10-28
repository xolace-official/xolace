import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Card geometry at rest and composing (#256), shared with Flux. Local to the compose overlay.
 */

/** The morph. Slow and overshoot-free: the space opening, not a modal. */
export const MORPH_SPRING = { damping: 26, mass: 1.1, stiffness: 90 } as const;

export const FLUX_SIZE = 104;
export const DOT_SIZE = 12;
/** The expanded card's own padding, where its header row starts. */
export const CARD_PAD = 20;
/** Progress at which Flux has fully become the presence dot. */
export const HANDOFF = 0.55;

/** The composing card's margins, in the overlay's local coordinates. */
const EXP_LEFT = 16;
const EXP_TOP = 8;

export function useMorphGeometry() {
	const { width: W, height: H } = useWindowDimensions();
	const insets = useSafeAreaInsets();

	const restH = H / 2.8;
	const restW = restH * 0.75;

	return {
		/** Centre of the presence dot inside the expanded card's header row. */
		dotX: EXP_LEFT + CARD_PAD,
		dotY: EXP_TOP + CARD_PAD + DOT_SIZE / 2,
		expLeft: EXP_LEFT,
		expTop: EXP_TOP,
		expW: W - EXP_LEFT * 2,
		/** Flux's resting frame: he leans on the card's top-left shoulder. */
		fluxLeft: (W - restW) / 2 + 8,
		/** Perch: he straddles the card's top edge and the card paints his legs. */
		fluxPerch: { dy: 56, scale: 0.8 },
		fluxTop: H * 0.32 - insets.top - FLUX_SIZE - 12,
		H,
		insetBottom: insets.bottom,
		insetTop: insets.top,
		restH,
		restLeft: (W - restW) / 2,
		restTop: H * 0.32 - insets.top,
		restW,
		W,
	};
}
