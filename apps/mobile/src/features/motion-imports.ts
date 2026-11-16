/** The motion rules (`AGENTS.md`, "Motion"), as checks over the import graph. Each returns
 * the offending imports as `file -> specifier`; empty means it holds. Run on the real graph
 * by `import-cycles.test.ts`. Node-only. */
import { isLegacyFeature } from "@/features/feature-shape";
import { type ImportGraph, relative } from "@/features/import-graph";

/** The one file that imports react-native-ease. */
const EASE_ENTRY = "design/ease.ts";
const EASE = /^react-native-ease(\/|$)/;

/**
 * Files outside the legacy feature folders that imported Ease before `ease.ts` existed. They
 * move to it when their screens are redone; this list only shrinks, and a file that no longer
 * imports Ease fails the test until it is dropped from here.
 */
const EASE_LEGACY_FILES: ReadonlySet<string> = new Set([
	"app/(protected)/index.tsx",
	"components/shared/resource-item.tsx",
	"components/ui/heatmap-chart/root.tsx",
]);

/** Folders outside `features/` that new redesign code lands in, held to the
 * reduced-motion rule like the v2 feature folders. */
const NEW_MOTION_FOLDERS = ["design/", "components/shared/"];
const REANIMATED = "react-native-reanimated";
const OS_REDUCED_MOTION = "useReducedMotion";
const FEATURE = /^features\/([^/]+)\//;

/** The feature a `src/`-relative path is in. */
const featureOfPath = (file: string) => file.match(FEATURE)?.[1];

const easeImports = (graph: ImportGraph) =>
	[...graph].flatMap(([file, imports]) =>
		imports
			.filter((imp) => EASE.test(imp.specifier))
			.map((imp) => ({ file: relative(file), specifier: imp.specifier }))
	);

/** 1. Only `src/design/ease.ts` imports react-native-ease (types too), apart from the
 * legacy folders and files. */
export function easeImportsOutsideEaseTs(graph: ImportGraph): string[] {
	return easeImports(graph)
		.filter(
			({ file }) =>
				!(
					file === EASE_ENTRY ||
					EASE_LEGACY_FILES.has(file) ||
					isLegacyFeature(featureOfPath(file) ?? "")
				)
		)
		.map(({ file, specifier }) => `${file} -> ${specifier}`);
}

/** Legacy Ease files that no longer import Ease: drop them from `EASE_LEGACY_FILES`. */
export function staleEaseListings(graph: ImportGraph): string[] {
	const importing = new Set(easeImports(graph).map(({ file }) => file));
	return [...EASE_LEGACY_FILES].filter((file) => !importing.has(file));
}

const isNewMotionCode = (file: string) => {
	const feature = featureOfPath(file);
	return feature
		? !isLegacyFeature(feature)
		: NEW_MOTION_FOLDERS.some((folder) => file.startsWith(folder));
};

/** Bindings that reach Reanimated's OS-only read: the hook itself, or the whole module
 * (`import * as Reanimated`, then `Reanimated.useReducedMotion()`). */
const OS_READS = [OS_REDUCED_MOTION, "*"];

/**
 * 2. New motion code reads reduced motion through `useEffectiveReducedMotion()`, never
 * Reanimated's `useReducedMotion` (the OS setting at launch, ignoring the in-app choice). Direct
 * `AccessibilityInfo` reads aren't checked: the same import makes screen-reader announcements,
 * and an import can't tell the two apart.
 */
export function osReducedMotionReads(graph: ImportGraph): string[] {
	return [...graph].flatMap(([file, imports]) =>
		imports
			.filter(
				(imp) => imp.specifier === REANIMATED && isNewMotionCode(relative(file))
			)
			.flatMap((imp) => imp.names.filter((name) => OS_READS.includes(name)))
			.map((name) => `${relative(file)} -> ${REANIMATED} ${name}`)
	);
}
