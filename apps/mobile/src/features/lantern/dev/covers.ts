/**
 * Stand-ins for production's cover photos in the dev states: the board's `PHOTO(a, b, c, x, y,
 * glow)`, a three-stop gradient at 165° with a soft glow, drawn as an SVG data URI that
 * `CoverImage` loads like any other cover. Fixed printed colours, dev only.
 */
const SIZE = 400;
/** The glow fades out by 36% of the way to the farthest corner. */
const GLOW_REACH = 0.36;
const ANGLE = 165;

/** "rgba(255,222,160,.75)" → its colour and opacity, as SVG stops take them. */
function stop(color: string, offset: number) {
	const m = color.match(/rgba\(([^)]+)\)/);
	if (!m) {
		return `<stop offset="${offset}" stop-color="${color}"/>`;
	}
	const [r, g, b, a] = m[1].split(",").map((v) => v.trim());
	return `<stop offset="${offset}" stop-color="rgb(${r},${g},${b})" stop-opacity="${a}"/>`;
}

export function photo(
	a: string,
	b: string,
	c: string,
	x: number,
	y: number,
	glow: string
) {
	const rad = (ANGLE * Math.PI) / 180;
	const dx = Math.sin(rad) / 2;
	const dy = -Math.cos(rad) / 2;
	const cx = (x / 100) * SIZE;
	const cy = (y / 100) * SIZE;
	const far = Math.hypot(Math.max(cx, SIZE - cx), Math.max(cy, SIZE - cy));
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
		"<defs>",
		`<linearGradient id="l" x1="${0.5 - dx}" y1="${0.5 - dy}" x2="${0.5 + dx}" y2="${0.5 + dy}">`,
		stop(a, 0),
		stop(b, 0.56),
		stop(c, 1),
		"</linearGradient>",
		`<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${far * GLOW_REACH}">`,
		stop(glow, 0),
		stop("rgba(255,255,255,0)", 1),
		"</radialGradient>",
		"</defs>",
		`<rect width="${SIZE}" height="${SIZE}" fill="url(#l)"/>`,
		`<rect width="${SIZE}" height="${SIZE}" fill="url(#g)"/>`,
		"</svg>",
	].join("");
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
