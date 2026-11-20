import { isLegacyFeature, isNewCode } from "@/features/feature-shape";
import { type ImportGraph, relative } from "@/features/import-graph";

const EASE_ENTRY = "design/ease.ts";
const EASE = /^react-native-ease(\/|$)/;

const EASE_LEGACY_FILES: ReadonlySet<string> = new Set([
	"components/shared/resource-item.tsx",
	"components/ui/heatmap-chart/root.tsx",
]);

const REANIMATED = "react-native-reanimated";
const OS_REDUCED_MOTION = "useReducedMotion";
const FEATURE = /^features\/([^/]+)\//;

const featureOfPath = (file: string) => file.match(FEATURE)?.[1];

const easeImports = (graph: ImportGraph) =>
	[...graph].flatMap(([file, imports]) =>
		imports
			.filter((imp) => EASE.test(imp.specifier))
			.map((imp) => ({ file: relative(file), specifier: imp.specifier }))
	);

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

export function staleEaseListings(graph: ImportGraph): string[] {
	const importing = new Set(easeImports(graph).map(({ file }) => file));
	return [...EASE_LEGACY_FILES].filter((file) => !importing.has(file));
}

const OS_READS = [OS_REDUCED_MOTION, "*"];

export function osReducedMotionReads(graph: ImportGraph): string[] {
	return [...graph].flatMap(([file, imports]) =>
		imports
			.filter(
				(imp) => imp.specifier === REANIMATED && isNewCode(relative(file))
			)
			.flatMap((imp) => imp.names.filter((name) => OS_READS.includes(name)))
			.map((name) => `${relative(file)} -> ${REANIMATED} ${name}`)
	);
}
