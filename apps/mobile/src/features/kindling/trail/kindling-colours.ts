import { useScheme } from "@/design/scheme";
import { useTokenColors } from "@/lib/use-token-color";
import type { TintKey } from "../copy";

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

const FX = [
	"kindling-fx-glow",
	"kindling-fx-glow-warm",
	"kindling-fx-glow-edge",
	"kindling-fx-glow-clear",
	"kindling-fx-core",
	"kindling-fx-hot",
	"kindling-fx-warm",
	"kindling-fx-ember",
	"kindling-fx-flash",
	"kindling-fx-fire-ember",
] as const;

export type SparkColours = {
	glow: [string, string, string, string];
	core: string;
	hot: string;
	warm: string;
	ember: string;
	flash: string;
	fireEmber: string;
	smoke: string;
};

export function useSparkColours(): SparkColours {
	const dark = useScheme() === "dark";
	const [
		glow = "",
		glowWarm = "",
		glowEdge = "",
		glowClear = "",
		core = "",
		hot = "",
		warm = "",
		ember = "",
		flash = "",
		fireEmber = "",
		smoke = "",
	] = useTokenColors([
		...FX,
		dark ? "kindling-fx-smoke-dark" : "kindling-fx-smoke",
	]);
	return {
		core,
		ember,
		fireEmber,
		flash,
		glow: [glow, glowWarm, glowEdge, glowClear],
		hot,
		smoke,
		warm,
	};
}

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
