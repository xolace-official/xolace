import {
	CARD_OFFSET,
	MAX_CARD_WIDTH,
	type Rect,
	SCREEN_MARGIN,
	type TourPlacement,
	type TourShape,
} from "@/components/ui/tour/types";

/** The screen with a rounded rectangle cut out, as one path: two subpaths with
 * `fillRule="evenodd"`. */
export function cutoutPath(
	screenWidth: number,
	screenHeight: number,
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number
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

/** The target's bounds grown into the hole's shape. A circle is squared around the centre to
 * stay round. */
export function spotlightFor(
	rect: Rect,
	shape: TourShape,
	padding: number,
	radius: number
): Rect & { radius: number } {
	if (shape === "circle") {
		const diameter = Math.max(rect.width, rect.height) + padding * 2;
		return {
			height: diameter,
			radius: diameter / 2,
			width: diameter,
			x: rect.x + rect.width / 2 - diameter / 2,
			y: rect.y + rect.height / 2 - diameter / 2,
		};
	}

	return {
		height: rect.height + padding * 2,
		radius,
		width: rect.width + padding * 2,
		x: rect.x - padding,
		y: rect.y - padding,
	};
}

/** Where the card goes: below the target when that fits, else above; centred with no target. */
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

	// Neither side fits (target taller than the room): clamp so the card stays on screen.
	const top = goBelow ? Math.min(below, maxY - height) : Math.max(above, minY);

	return { left, top: Math.max(minY, top), width };
}
