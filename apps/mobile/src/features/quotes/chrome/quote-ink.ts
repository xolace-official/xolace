import { useCSSVariable } from "uniwind";
import type { Ink } from "../quotes-model";

/**
 * The board's two inks (`.inkl` / `.inkd`): light text over a scrim on photos and loops, dark
 * text on the Poster. A printed object, so a fixed palette (`--color-quote-*` in global.css), the
 * same in every theme.
 */
const ROLES = [
	"text",
	"text-2",
	"glass",
	"glass-line",
	"glass-icon",
	"sheet",
	"sheet-text",
	"sheet-text-2",
	"fill",
	"line",
	"button",
	"button-text",
] as const;
const SHARED = [
	"night",
	"resonate",
	"plus",
	"plus-ink",
	"shadow",
	"drop",
	"kept-veil",
	"kept-ink",
	"kept-pill-ink",
	"kept-soft",
] as const;
const NAMES = [
	...ROLES.map((r) => `quote-light-${r}`),
	...ROLES.map((r) => `quote-dark-${r}`),
	...SHARED.map((s) => `quote-${s}`),
];

export type InkPalette = {
	/** The words and the small lines. */
	text: string;
	text2: string;
	/** Glass fill, hairline, icon. */
	glass: string;
	glassLine: string;
	glassIcon: string;
	/** Light ink's soft text shadow. */
	shadow: boolean;
	sheet: string;
	sheetText: string;
	sheetText2: string;
	fill: string;
	line: string;
	button: string;
	buttonText: string;
};

export type QuoteInk = {
	inks: Record<Ink, InkPalette>;
	night: string;
	resonate: string;
	plus: string;
	plusInk: string;
	shadowColor: string;
	drop: string;
	keptVeil: string;
	keptInk: string;
	keptPillInk: string;
	keptSoft: string;
};

/** Every quote colour JS needs, read once from the variables. */
export function useQuoteInk(): QuoteInk {
	const values = useCSSVariable(NAMES.map((n) => `--color-${n}`));
	const c = Object.fromEntries(
		NAMES.map((n, i) => [n, String(values[i] ?? "transparent")])
	);
	const palette = (ink: Ink): InkPalette => {
		const r = (role: (typeof ROLES)[number]) => c[`quote-${ink}-${role}`] ?? "";
		return {
			button: r("button"),
			buttonText: r("button-text"),
			fill: r("fill"),
			glass: r("glass"),
			glassIcon: r("glass-icon"),
			glassLine: r("glass-line"),
			line: r("line"),
			shadow: ink === "light",
			sheet: r("sheet"),
			sheetText: r("sheet-text"),
			sheetText2: r("sheet-text-2"),
			text: r("text"),
			text2: r("text-2"),
		};
	};
	const s = (n: (typeof SHARED)[number]) => c[`quote-${n}`] ?? "";
	return {
		drop: s("drop"),
		inks: { dark: palette("dark"), light: palette("light") },
		keptInk: s("kept-ink"),
		keptPillInk: s("kept-pill-ink"),
		keptSoft: s("kept-soft"),
		keptVeil: s("kept-veil"),
		night: s("night"),
		plus: s("plus"),
		plusInk: s("plus-ink"),
		resonate: s("resonate"),
		shadowColor: s("shadow"),
	};
}

/** Light ink's `0 1px 22px` shadow; `scale` grows it with a capture card. */
export const textShadow = (color: string, scale = 1) =>
	({
		textShadowColor: color,
		textShadowOffset: { height: scale, width: 0 },
		textShadowRadius: 22 * scale,
	}) as const;
