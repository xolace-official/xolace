export const VENT_COLORS = {
	amber: "#E8A84C",
	ash: "#9399A8",
	cream: "#F5F0E8",
	ember: "#C4883F",
	flash: "#FFF3E0",
	lit: "#F0B860",
	page: "#0A0A0D",
	ring: "#FFECCD",
} as const;

export const amber = (a: number) => `rgba(232, 168, 76, ${a})`;
