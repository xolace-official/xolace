import { useTokenColors } from "@/lib/use-token-color";

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

export type Covers = { a1: string; a2: string; a3: string };

export function useFixtureCovers(): Covers {
	const [peach, rose, lilac, sky, light] = useTokenColors([
		"peach",
		"rose",
		"lilac",
		"sky",
		"surface",
	]);
	const glow = (x: number, y: number): Blot => ({ color: light, r: 0.6, x, y });
	const wash = (color: string, x: number, y: number): Blot => ({
		color,
		r: 0.7,
		x,
		y,
	});
	return {
		a1: art(peach, glow(0.3, 0.28), wash(rose, 0.75, 0.72)),
		a2: art(sky, glow(0.3, 0.28), wash(lilac, 0.7, 0.76)),
		a3: art(lilac, glow(0.34, 0.3), wash(sky, 0.7, 0.72)),
	};
}
