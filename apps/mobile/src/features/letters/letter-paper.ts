import { useCSSVariable, useUniwind } from "uniwind";
import { useScheme } from "@/design/scheme";
import { NIGHT_VARIANT } from "@/design/themes";

export type Light = "day" | "dusk" | "night";

function useLight(): Light {
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

export const LETTER_TYPE = {
	read: { fontSize: 17, lineHeight: 26 },
	row: { fontSize: 16.5, lineHeight: 22 },
	write: { fontSize: 18, lineHeight: 27 },
} as const;
export type LetterSize = keyof typeof LETTER_TYPE;
export const LETTER_MAX_SCALE = 1.6;

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
	"letter-mark-edge",
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
		emberFill: `radial-gradient(circle at 38% 34%, ${ember[0]}, ${ember[1]} 55%, ${ember[2]})`,
		emberMid: ember[1],
		glow: `radial-gradient(closest-side, ${c["letter-glow-1"]}, ${c["letter-glow-2"]} 55%, ${c["letter-glow-clear"]})`,
		heart: `radial-gradient(circle at 42% 38%, ${c["letter-heart-1"]}, ${c["letter-heart-2"]} 40%, ${ember[1]} 62%, ${c["letter-heart-clear"]} 72%)`,
		ink: c["letter-ink"],
		inkFaint: c["letter-ink-faint"],
		light,
		markAcknowledged: (surface: string) =>
			`0px 0px 0px 2.5px ${surface}, 0px 0px 0px 4px ${c["letter-ack-ring"]}`,
		markEdge: c["letter-mark-edge"],
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
export type LetterInk = ReturnType<typeof useLetterInk>;
