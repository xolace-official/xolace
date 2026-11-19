import { useScheme } from "@/design/scheme";
import { useTokenColors } from "@/lib/use-token-color";
import type { TintKey } from "../copy";

/** The board's own colours where the theme has none (handoff §2.3, §2.4): `--color-kindling-*`
 * in global.css, Daylight and a `-dark` Dusk twin. The rest are the theme's. */
const FIXED = [
	"kindling-road",
	"kindling-mark",
	"kindling-rim",
	"kindling-on-ember",
	"kindling-glow",
	"kindling-glow-mid",
	"kindling-glow-clear",
	"kindling-sit",
	"kindling-hear",
	"kindling-tell",
	"kindling-try",
	"kindling-fire",
] as const;
const THEME = [
	"background",
	"accent",
	"ember",
	"ember-ink",
	"subtle",
	"accent-foreground",
] as const;

export type KindlingColours = {
	day: boolean;
	road: string;
	mark: string;
	rim: string;
	onEmber: string;
	glow: [string, string, string];
	tints: Record<TintKey | "fire", string>;
	page: string;
	violet: string;
	ember: string;
	emberInk: string;
	ink3: string;
	onViolet: string;
};

export function useKindlingColours(): KindlingColours {
	const dark = useScheme() === "dark";
	const names = [...FIXED.map((n) => (dark ? `${n}-dark` : n)), ...THEME];
	const [
		road = "",
		mark = "",
		rim = "",
		onEmber = "",
		glow = "",
		glowMid = "",
		glowClear = "",
		sit = "",
		hear = "",
		tell = "",
		tryTint = "",
		fire = "",
		page = "",
		violet = "",
		ember = "",
		emberInk = "",
		ink3 = "",
		onViolet = "",
	] = useTokenColors(names);
	return {
		day: !dark,
		ember,
		emberInk,
		glow: [glow, glowMid, glowClear],
		ink3,
		mark,
		onEmber,
		onViolet,
		page,
		rim,
		road,
		tints: { fire, hear, sit, tell, try: tryTint },
		violet,
	};
}
