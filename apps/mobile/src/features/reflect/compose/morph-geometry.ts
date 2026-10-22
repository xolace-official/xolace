import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Where the one card sits at rest and where it sits composing (#256).
 *
 * Shared by the card and by Flux, who has to land exactly on the composer's
 * presence dot — two copies of these numbers is two chances for the handoff to
 * miss by a few points.
 *
 * Coordinates are local to the compose overlay, which starts at the top safe
 * inset (the reflect canvas pads itself by the insets), while the sizes are
 * proportions of the whole screen — the card's resting size is a fraction of
 * the phone, not of whatever is left after the notch.
 */

/** The morph. Slow and overshoot-free: the space opening, not a modal. */
export const MORPH_SPRING = { damping: 26, stiffness: 90, mass: 1.1 } as const;

export const FLUX_SIZE = 104;
export const DOT_SIZE = 12;
/** The expanded card's own padding — where its header row starts. */
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
    W,
    H,
    insetTop: insets.top,
    insetBottom: insets.bottom,
    restH,
    restW,
    restLeft: (W - restW) / 2,
    restTop: H * 0.32 - insets.top,
    expLeft: EXP_LEFT,
    expTop: EXP_TOP,
    expW: W - EXP_LEFT * 2,
    /** Flux's resting frame — he leans on the card's top-left shoulder. */
    fluxLeft: (W - restW) / 2 + 8,
    fluxTop: H * 0.32 - insets.top - FLUX_SIZE - 12,
    /** Perch: he straddles the card's top edge and the card paints his legs. */
    fluxPerch: { dy: 56, scale: 0.8 },
    /** Centre of the presence dot inside the expanded card's header row. */
    dotX: EXP_LEFT + CARD_PAD,
    dotY: EXP_TOP + CARD_PAD + DOT_SIZE / 2,
  };
}
