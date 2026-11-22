import type { AvatarOption } from "@/features/you/avatar-model";

const AVS = [
	["moon", "Moon", "#C9B8FF", "#7C6BD6"],
	["ember", "Ember", "#FFC27A", "#E8743A"],
	["tide", "Tide", "#9FD8F5", "#3D86C6"],
	["moss", "Moss", "#B8E6A0", "#4E9A5C"],
	["dusk", "Dusk", "#F2A9C7", "#8E4FA8"],
	["stone", "Stone", "#D8D2CB", "#8A8079"],
	["lantern", "Lantern", "#FFE3A0", "#D9822B"],
	["aurora", "Aurora", "#A8F0DC", "#6B5BD6"],
	["comet", "Comet", "#E0E6FF", "#4A4FE6"],
	["bloom", "Bloom", "#FFD1E0", "#D6467A"],
] as const;
const FREE = 6;

function art(light: string, deep: string): string {
	const svg = [
		'<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">',
		'<defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.8">',
		`<stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${deep}"/>`,
		"</radialGradient></defs>",
		'<rect width="192" height="192" fill="url(#g)"/>',
		"</svg>",
	].join("");
	return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const FIXTURE_AVATARS: AvatarOption[] = AVS.map(
	([key, label, light, deep], order) => ({
		isDefault: order === 0,
		key,
		label,
		order,
		tier: order < FREE ? "free" : "premium",
		url: art(light, deep),
	})
);
