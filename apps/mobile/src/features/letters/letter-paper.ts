import { useCSSVariable, useUniwind } from "uniwind";
import { useScheme } from "@/design/scheme";
import { NIGHT_VARIANT } from "@/design/themes";

/**
 * The letter's paper and ember (handoff `letters.md` §4): a printed object, so a fixed palette
 * (`--color-letter-*` in global.css), not the theme's colours. Paper dims a little in Dusk (every
 * dark theme) and at Night. No ruled lines, no texture.
 */
export type Light = "day" | "dusk" | "night";

/** @public Read by the Letters screens (S20 PR 2). */
export function useLight(): Light {
	const { theme } = useUniwind();
	const dark = useScheme() === "dark";
	if (theme === NIGHT_VARIANT) {
		return "night";
	}
	return dark ? "dusk" : "day";
}

/** Literal classes, so Tailwind finds them. */
export const PAPER_CLASS: Record<Light, { paper: string; back: string }> = {
	day: { back: "bg-letter-back-day", paper: "bg-letter-paper-day" },
	dusk: { back: "bg-letter-back-dusk", paper: "bg-letter-paper-dusk" },
	night: { back: "bg-letter-back-night", paper: "bg-letter-paper-night" },
};

export const PAPER_RADIUS = 5;

/** The letter's type: upright Newsreader, 18/27 on the write sheet and 17/26 in the reader. */
export const LETTER_TYPE = {
	read: { fontSize: 17, lineHeight: 26 },
	/** A row's opening line on the Letters screen. */
	row: { fontSize: 16.5, lineHeight: 22 },
	write: { fontSize: 18, lineHeight: 27 },
} as const;
export type LetterSize = keyof typeof LETTER_TYPE;
/** Large text grows the letter, up to this. */
export const LETTER_MAX_SCALE = 1.6;

/** The sheets on the board's 390 pt phone: 342 wide at x 24, so a 24 pt margin each side. */
export const SHEET = {
	margin: 24,
	read: { height: 420, padH: 26, padV: 22 },
	write: { height: 330, padH: 24, padV: 20 },
} as const;

const NAMES = [
	"letter-paper-day",
	"letter-back-day",
	"letter-paper-dusk",
	"letter-back-dusk",
	"letter-paper-night",
	"letter-back-night",
	"letter-shadow-day",
	"letter-edge-day",
	"letter-shadow-dark",
	"letter-ink",
	"letter-ink-faint",
	"letter-crease",
	"letter-ember-1",
	"letter-ember-2",
	"letter-ember-3",
	"letter-seal-shadow",
	"letter-mark-glow",
	"letter-ack-ring",
	"letter-glow-1",
	"letter-glow-2",
	"letter-glow-clear",
	"letter-heart-1",
	"letter-heart-2",
	"letter-heart-clear",
	"letter-stamp-1",
	"letter-stamp-rim",
] as const;
type Name = (typeof NAMES)[number];

/** Every letter colour JS needs (shadows, gradients), read once from the theme's variables. */
export function useLetterInk() {
	const light = useLight();
	const values = useCSSVariable(NAMES.map((n) => `--color-${n}`));
	const c = Object.fromEntries(
		NAMES.map((n, i) => [n, String(values[i] ?? "transparent")])
	) as Record<Name, string>;
	const ember = [c["letter-ember-1"], c["letter-ember-2"], c["letter-ember-3"]];
	return {
		back: c[`letter-back-${light}`],
		crease: c["letter-crease"],
		/** The seal and the marks: a lit ember, lit from the upper left. */
		emberFill: `radial-gradient(circle at 38% 34%, ${ember[0]}, ${ember[1]} 55%, ${ember[2]})`,
		emberMid: ember[1],
		/** The glow behind the folded letter: drawn once; only its opacity moves. */
		glow: `radial-gradient(closest-side, ${c["letter-glow-1"]}, ${c["letter-glow-2"]} 55%, ${c["letter-glow-clear"]})`,
		/** The bright ember the sent letter shrinks into. */
		heart: `radial-gradient(circle at 42% 38%, ${c["letter-heart-1"]}, ${c["letter-heart-2"]} 40%, ${ember[1]} 62%, ${c["letter-heart-clear"]} 72%)`,
		ink: c["letter-ink"],
		inkFaint: c["letter-ink-faint"],
		light,
		markAcknowledged: (surface: string) =>
			`0px 0px 0px 2.5px ${surface}, 0px 0px 0px 4px ${c["letter-ack-ring"]}`,
		markGlow: `0px 0px 8px 1px ${c["letter-mark-glow"]}`,
		paper: c[`letter-paper-${light}`],
		sealShadow: `0px 2px 6px -2px ${c["letter-seal-shadow"]}`,
		shadow:
			light === "day"
				? `0px 12px 26px -18px ${c["letter-shadow-day"]}, 0px 0px 0px 0.5px ${c["letter-edge-day"]}`
				: `0px 16px 34px -18px ${c["letter-shadow-dark"]}`,
		spark: ember[0],
		stamp: `radial-gradient(circle at 40% 36%, ${c["letter-stamp-1"]}, ${ember[1]} 52%, ${ember[2]})`,
		stampShadow: `inset 0px 0px 0px 3px ${c["letter-stamp-rim"]}, 0px 4px 10px -4px ${c["letter-seal-shadow"]}`,
	};
}
/** @public Read by the Letters screens (S20 PR 2). */
export type LetterInk = ReturnType<typeof useLetterInk>;
