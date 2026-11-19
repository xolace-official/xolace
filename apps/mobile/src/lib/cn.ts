/**
 * `cn` with our class names taught to tailwind-merge. `@/lib/utils` re-exports
 * it, so every caller merges the same way (cn.test.ts).
 *
 * tailwind-merge only knows stock Tailwind. Without help it keeps both of
 * `type-body type-title`, reads `shadow-card` as a shadow colour, and reads
 * `font-normal` / `font-semibold` (here font families, the theme's body
 * faces) as weights, so `font-normal font-mirror` kept both and Uniwind,
 * which ranks classes by stylesheet order rather than className order, drew
 * `font-normal`. The config below makes every `font-<role>`, fixed face,
 * production font name and arbitrary `font-[Face]` one family group (plain
 * tailwind-merge filed `font-[Poppins-Medium]` with the weights, which is how
 * it used to beat `font-normal`), adds a `type` group, and knows the radius,
 * spacing and shadow tokens.
 *
 * Colours need nothing: tailwind-merge reads any unknown `bg-<x>` or
 * `text-<x>` as a colour. Listing them would hurt, because `card`, `surface`
 * and `field` would then also be shadow colours and fight `shadow-card`.
 *
 * `type-*` only conflicts with other `type-*`. A `type-body` next to a
 * `text-[17px]` or `font-semibold` keeps both, as AppText relies on: the
 * single-property class wins in the stylesheet, whatever the order here.
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

/** `type-display` … `type-poster` without the prefix. */
export const TYPE_NAMES = Object.values(TYPE_CLASS).map((c) =>
	c.replace(TYPE_PREFIX, "")
);

/**
 * Production's own font names in global.css, kept until the old screens that
 * use them go (`font-poppins-medium`).
 */
const LEGACY_FONT_NAMES = ["poppins-medium"];

/** Every `font-<x>` here is a family: the theme's roles, the fixed faces and the legacy names. */
export const FONT_NAMES = [
	...FONT_ROLES,
	...Object.keys(FIXED_FACES),
	...LEGACY_FONT_NAMES,
];

/**
 * Tailwind's other weight keywords. Old screens put `font-light` on an AppText
 * and plain tailwind-merge dropped AppText's `font-normal` for it, so the line
 * drew the system face, light. They stay in the family group so that still
 * happens: kept beside a role they'd pair a numeric weight with a custom face.
 * New code never uses them.
 */
const WEIGHT_KEYWORDS = ["thin", "extralight", "light", "extrabold", "black"];

/** `rounded-<x>`: ours (global.css) and HeroUI's `rounded-field`. */
export const RADIUS_NAMES = ["row", "tile", "card", "hero", "field"];

/** `p-<x>`, `gap-<x>` …: ours (global.css). */
export const SPACING_NAMES = ["gutter", "module", "section"];

/** `shadow-<x>`: ours and HeroUI's. */
export const SHADOW_NAMES = [
	"card",
	"dialog",
	"sheet",
	"surface",
	"overlay",
	"field",
];

const SAFE_OFFSET = /^safe-(or|offset)-/;

/** Uniwind's inset utilities: `pt-safe`, `pb-safe-or-4`, `top-safe-offset-2` … */
const isSafeInset = (value: string) =>
	value === "safe" || SAFE_OFFSET.test(value);

/**
 * The merge config, shaped for both tailwind-merge's `extendTailwindMerge`
 * and tailwind-variants' `twMergeConfig` (which accepts the same keys).
 */
const twMergeConfig = {
	extend: {
		classGroups: {
			...herouiMergeConfig.classGroups,
			"border-curve": ["border-continuous", "border-circular"],
			// Old screens name a face directly: `font-[Poppins-Medium]`.
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
			// Only a number is a weight. normal, medium, semibold and bold are font
			// families here (font roles), and so is an arbitrary `font-[Poppins-Medium]`.
			"font-weight": [{ font: [validators.isArbitraryNumber] }],
		},
	},
} as const;

const twMerge = extendTailwindMerge(
	twMergeConfig as Parameters<typeof extendTailwindMerge>[0]
);

// Every tailwind-variants `tv` called without its own config merges with ours.
defaultConfig.twMergeConfig = twMergeConfig as unknown as TWMergeConfig;

/** Joins class names and drops the ones a later class overrides. */
export function cn(...args: CnOptions): string {
	const merged = cx(args);
	return merged ? twMerge(merged) : "";
}

/** tailwind-variants' `tv` with our merge config on every call. Import it from
 * here, not from the package, so a variant merges the way `cn` does. */
export const tv: TV = (options, config) =>
	tvBase(options, {
		...config,
		twMerge: config?.twMerge ?? true,
		twMergeConfig: twMergeConfig as unknown as TWMergeConfig,
	});
