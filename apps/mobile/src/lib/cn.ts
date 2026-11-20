/**
 * Colours need nothing: tailwind-merge reads any unknown `bg-<x>` or
 * `text-<x>` as a colour. Listing them would hurt, because `card`, `surface`
 * and `field` would then also be shadow colours and fight `shadow-card`.
 *
 * Importing `heroui-native/utils` sets tailwind-variants' global
 * `defaultConfig.twMergeConfig` to HeroUI's groups. The import below runs
 * before this module's body, so the assignment further down lands after it
 * and keeps both. HeroUI's own components pass their config on every `tv`
 * call; ours is a superset, so either one merges HeroUI's classes right.
 */
import { twMergeConfig as herouiMergeConfig } from "heroui-native/utils";
import { extendTailwindMerge, validators } from "tailwind-merge";
import {
	type CnOptions,
	cx,
	defaultConfig,
	type TV,
	type TWMergeConfig,
	tv as tvBase,
} from "tailwind-variants";
import { FIXED_FACES, FONT_ROLES } from "@/design/font-pairs";
import { TYPE_CLASS } from "@/design/type-classes.generated";

const TYPE_PREFIX = /^type-/;

export const TYPE_NAMES = Object.values(TYPE_CLASS).map((c) =>
	c.replace(TYPE_PREFIX, "")
);

const LEGACY_FONT_NAMES = ["poppins-medium"];

export const FONT_NAMES = [
	...FONT_ROLES,
	...Object.keys(FIXED_FACES),
	...LEGACY_FONT_NAMES,
];

const WEIGHT_KEYWORDS = ["thin", "extralight", "light", "extrabold", "black"];

export const RADIUS_NAMES = ["row", "tile", "card", "hero", "field"];

export const SPACING_NAMES = ["gutter", "module", "section"];

export const SHADOW_NAMES = [
	"card",
	"dialog",
	"sheet",
	"surface",
	"overlay",
	"field",
];

const SAFE_OFFSET = /^safe-(or|offset)-/;

const isSafeInset = (value: string) =>
	value === "safe" || SAFE_OFFSET.test(value);

const twMergeConfig = {
	extend: {
		classGroups: {
			...herouiMergeConfig.classGroups,
			"border-curve": ["border-continuous", "border-circular"],
			"font-family": [{ font: [validators.isArbitraryValue] }],
			type: [{ type: TYPE_NAMES }],
		},
		theme: {
			font: [...FONT_NAMES, ...WEIGHT_KEYWORDS],
			radius: RADIUS_NAMES,
			shadow: SHADOW_NAMES,
			spacing: [...SPACING_NAMES, isSafeInset],
		},
	},
	override: {
		classGroups: {
			"font-weight": [{ font: [validators.isArbitraryNumber] }],
		},
	},
} as const;

const twMerge = extendTailwindMerge(
	twMergeConfig as Parameters<typeof extendTailwindMerge>[0]
);

defaultConfig.twMergeConfig = twMergeConfig as unknown as TWMergeConfig;

export function cn(...args: CnOptions): string {
	const merged = cx(args);
	return merged ? twMerge(merged) : "";
}

export const tv: TV = (options, config) =>
	tvBase(options, {
		...config,
		twMerge: config?.twMerge ?? true,
		twMergeConfig: twMergeConfig as unknown as TWMergeConfig,
	});
