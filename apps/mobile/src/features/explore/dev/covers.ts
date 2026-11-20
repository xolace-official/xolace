const SIZE = 400;

export function art(a: string, b: string) {
	const svg = [
		`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
		'<defs><linearGradient id="l" x1="0.33" y1="0" x2="0.67" y2="1">',
		`<stop offset="0" stop-color="${a}"/>`,
		`<stop offset="1" stop-color="${b}"/>`,
		"</linearGradient></defs>",
		`<rect width="${SIZE}" height="${SIZE}" fill="url(#l)"/>`,
		"</svg>",
	].join("");
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
