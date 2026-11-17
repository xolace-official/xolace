/**
 * The parts of Vent's fixed palette a `--color-vent-*` token can't express (global.css): the
 * values Skia, colour interpolation and Ease need as strings. Production's "printed object"
 * colours (handoff §1); the vent is the same dark room in every theme. Fixed on purpose.
 */
export const VENT_COLORS = {
	amber: "#E8A84C",
	ash: "#9399A8",
	cream: "#F5F0E8",
	ember: "#C4883F",
	/** The flash at the burst. */
	flash: "#FFF3E0",
	/** v2: a word as it catches (30% of its light). */
	lit: "#F0B860",
	page: "#0A0A0D",
	/** v2: the shock ring after the flash. */
	ring: "#FFECCD",
} as const;

/** Amber at an opacity: the glow under a lit word. */
export const amber = (a: number) => `rgba(232, 168, 76, ${a})`;
