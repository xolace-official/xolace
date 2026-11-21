/** Where the reveal grows from, as fractions of the screen. */
const ORIGIN = { x: 0.5, y: 0.9 };
/** How far past the screen's half-diagonal the circle reaches, so its edge leaves every corner. */
const REACH = 1.5;

/** The reveal's full-size circle, in screen points. */
export function revealCircle(width: number, height: number) {
	const radius = REACH * Math.sqrt((width * width + height * height) / 2);
	const cx = width * ORIGIN.x;
	const cy = height * ORIGIN.y;
	return { cx, cy, left: cx - radius, radius, top: cy - radius };
}
