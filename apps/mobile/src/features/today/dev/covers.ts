/**
 * Stand-ins for production's track covers in the dev states: the board's rail art (`.a1`–
 * `.a3`, two soft watercolour radials on a base), drawn as an SVG data URI that `CoverImage`
 * loads like any other cover. Fixed printed colours, dev only.
 */
const SIZE = 200;

type Blot = { color: string; x: number; y: number; r: number };

function art(base: string, a: Blot, b: Blot) {
	const radial = (id: string, blot: Blot) =>
		`<radialGradient id="${id}" cx="${blot.x}" cy="${blot.y}" r="${blot.r}"><stop offset="0" stop-color="${blot.color}"/><stop offset="1" stop-color="${blot.color}" stop-opacity="0"/></radialGradient>`;
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 1 1">`,
		`<defs>${radial("a", a)}${radial("b", b)}</defs>`,
		`<rect width="1" height="1" fill="${base}"/>`,
		`<rect width="1" height="1" fill="url(#a)"/>`,
		`<rect width="1" height="1" fill="url(#b)"/>`,
		"</svg>",
	].join("");
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** a1 peach / pink, a2 sky / lilac, a3 mint / teal. */
export const COVERS = {
	a1: art(
		"#FFC3A6",
		{ color: "#FFE3D1", r: 0.6, x: 0.3, y: 0.28 },
		{ color: "#F48FB1", r: 0.7, x: 0.75, y: 0.72 }
	),
	a2: art(
		"#B9C6F5",
		{ color: "#D4F2F8", r: 0.6, x: 0.3, y: 0.28 },
		{ color: "#9E8CF2", r: 0.7, x: 0.7, y: 0.76 }
	),
	a3: art(
		"#BFE6CF",
		{ color: "#ECF8DF", r: 0.6, x: 0.34, y: 0.3 },
		{ color: "#73C2AA", r: 0.7, x: 0.7, y: 0.72 }
	),
} as const;
