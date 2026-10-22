import {
  CARD_OFFSET,
  MAX_CARD_WIDTH,
  SCREEN_MARGIN,
  type Rect,
  type TourPlacement,
  type TourShape,
} from "@/src/components/ui/tour/types";

/**
 * The screen with a rounded rectangle taken out of it, as one path.
 *
 * Two subpaths and `fillRule="evenodd"`: the outer one covers the screen, the
 * inner one falls inside it, and even-odd makes the overlap a hole regardless
 * of which way either is wound. That last part is why the inner rectangle is
 * written in the natural direction rather than reversed — the winding is not
 * load-bearing, and a reversed path is the kind of thing that gets tidied up
 * by someone who cannot see why it was backwards.
 */
export function cutoutPath(
  screenWidth: number,
  screenHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): string {
  "worklet";
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const right = x + width;
  const bottom = y + height;

  return (
    `M0 0H${screenWidth}V${screenHeight}H0Z ` +
    `M${x + r} ${y}` +
    `H${right - r}A${r} ${r} 0 0 1 ${right} ${y + r}` +
    `V${bottom - r}A${r} ${r} 0 0 1 ${right - r} ${bottom}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${bottom - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`
  );
}

/**
 * The target's bounds grown into the shape the hole will take.
 *
 * A circle is squared around the target's centre rather than drawn inside its
 * bounds, because the controls that want one — an avatar, a floating action
 * button — are square already, and squaring off the longer side is what keeps
 * a hole round instead of letting it collapse to a slot.
 */
export function spotlightFor(
  rect: Rect,
  shape: TourShape,
  padding: number,
  radius: number,
): Rect & { radius: number } {
  if (shape === "circle") {
    const diameter = Math.max(rect.width, rect.height) + padding * 2;
    return {
      x: rect.x + rect.width / 2 - diameter / 2,
      y: rect.y + rect.height / 2 - diameter / 2,
      width: diameter,
      height: diameter,
      radius: diameter / 2,
    };
  }

  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
    radius,
  };
}

/**
 * Where the card goes, given the hole and the card's own height.
 *
 * Below the target when below fits, above it when it does not, and centred on
 * the screen when there is no target at all. The card is as wide as the safe
 * area allows up to a ceiling, because a card narrower than that on a phone
 * only means a shorter line length and one more thing to get wrong.
 */
export function cardFrame({
  spot,
  cardHeight,
  placement,
  screenWidth,
  screenHeight,
  insets,
}: {
  spot: Rect | null;
  cardHeight: number | null;
  placement: TourPlacement;
  screenWidth: number;
  screenHeight: number;
  insets: { top: number; bottom: number; left: number; right: number };
}): { left: number; top: number; width: number } {
  const minX = insets.left + SCREEN_MARGIN;
  const maxX = screenWidth - insets.right - SCREEN_MARGIN;
  const width = Math.min(maxX - minX, MAX_CARD_WIDTH);
  const left = minX + (maxX - minX - width) / 2;

  const minY = insets.top + SCREEN_MARGIN;
  const maxY = screenHeight - insets.bottom - SCREEN_MARGIN;
  const height = cardHeight ?? 0;

  if (!spot) {
    return { left, top: Math.max(minY, (screenHeight - height) / 2), width };
  }

  const below = spot.y + spot.height + CARD_OFFSET;
  const above = spot.y - CARD_OFFSET - height;
  const fitsBelow = below + height <= maxY;
  const fitsAbove = above >= minY;

  const goBelow =
    placement === "bottom"
      ? fitsBelow || !fitsAbove
      : placement === "top"
        ? !fitsAbove
        : fitsBelow;

  // Neither side fits — a target taller than the room around it. Clamping keeps
  // the card on screen and lets it overlap the dim rather than the other way
  // round, which is the lesser of the two failures.
  const top = goBelow ? Math.min(below, maxY - height) : Math.max(above, minY);

  return { left, top: Math.max(minY, top), width };
}
