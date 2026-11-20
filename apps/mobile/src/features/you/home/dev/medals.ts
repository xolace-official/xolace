const ART = {
	ember: { face: "#FFF6E6", rim: ["#F5B04F", "#F2D27A", "#E8743A"] },
	mint: { face: "#EFFBF6", rim: ["#6EE7C8", "#F2D27A", "#F2A0B4"] },
	violet: { face: "#F1EDFF", rim: ["#B7A3FF", "#8FC3F0", "#9E8CF2"] },
} as const;

export type MedalTone = keyof typeof ART;

export function medalArt(tone: MedalTone): string {
	const { face, rim } = ART[tone];
	const svg = [
		'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">',
		'<defs><linearGradient id="r" x1="0.1" y1="0.9" x2="0.9" y2="0.1">',
		`<stop offset="0" stop-color="${rim[0]}"/><stop offset="0.5" stop-color="${rim[1]}"/><stop offset="1" stop-color="${rim[2]}"/>`,
		"</linearGradient></defs>",
		'<circle cx="60" cy="60" r="60" fill="url(#r)"/>',
		`<circle cx="60" cy="60" r="51" fill="${face}"/>`,
		"</svg>",
	].join("");
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
