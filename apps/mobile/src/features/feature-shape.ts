import path from "node:path";
import {
	featureOf,
	type Import,
	type ImportGraph,
	relative,
} from "@/features/import-graph";

const REPLACED_FEATURES = ["browse", "intake", "reach-me-on"];

const RESTYLED_FEATURES = ["purchases"];

const LEGACY_FEATURES: ReadonlySet<string> = new Set([
	...REPLACED_FEATURES,
	...RESTYLED_FEATURES,
]);

const HUBS: ReadonlySet<string> = new Set(["navigation"]);

const SHARED_FEATURES: Readonly<Record<string, string>> = {
	purchases: "the entitlements module: usePlusEntitlement, usePaywall",
};

export const isLegacyFeature = (feature: string) =>
	LEGACY_FEATURES.has(feature);

const isPortedFeature = (feature: string) =>
	!(isLegacyFeature(feature) || HUBS.has(feature));

const FEATURE_FOLDER = /^features\/([^/]+)\//;

const NEW_LAYERS = [
	"design/",
	"components/shared/",
	"components/settings-kit/",
	"components/xolace-face/",
	"lib/keyboard/",
	"lib/stream-chat/",
];

export function isNewCode(file: string): boolean {
	const feature = file.match(FEATURE_FOLDER)?.[1];
	return feature
		? isPortedFeature(feature)
		: NEW_LAYERS.some((layer) => file.startsWith(layer));
}

export const staleListings = (features: readonly string[]): string[] =>
	[...LEGACY_FEATURES, ...HUBS].filter((f) => !features.includes(f));

const BACKEND_PACKAGES = [
	/^convex\/react$/,
	/^convex-helpers\/react(\/|$)/,
	/^posthog-react-native$/,
	/^@xolace\/backend\/(convex\/_generated\/)?api$/,
];
const APP_WIDE_READS: Readonly<Record<string, string>> = {
	"lib/motion/use-effective-reduced-motion.ts":
		"the user's reduced-motion setting, read by every animated part",
};
const TOAST = { name: "useToast", specifier: "heroui-native" };
const TOAST_ENTRY = "components/shared/toast.tsx";
const DATA_HOOK = /^use-[^/]+\.ts$/;
const DEV_FOLDER = /^(features\/[^/]+\/(?:[^/]+\/)*?dev)\//;
const DEV_REGISTRY = "dev/";

const isDevCode = (file: string) =>
	file.startsWith(DEV_REGISTRY) || DEV_FOLDER.test(file);

type Edge = { file: string; imp: Import; target?: string };

function* edges(graph: ImportGraph): Generator<Edge> {
	for (const [file, imports] of graph) {
		for (const imp of imports) {
			if (imp.targets.length === 0) {
				yield { file, imp };
			}
			for (const target of imp.targets) {
				yield { file, imp, target };
			}
		}
	}
}

const show = ({ file, imp, target }: Edge) =>
	`${relative(file)} -> ${target ? relative(target) : imp.specifier}`;

const unique = (lines: string[]) => [...new Set(lines)];

export function oldFolderImportsFromNewCode(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const to = edge.target && featureOf(edge.target);
		if (
			to &&
			isLegacyFeature(to) &&
			!Object.hasOwn(SHARED_FEATURES, to) &&
			featureOf(edge.file) !== to &&
			isNewCode(relative(edge.file))
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

export function devImportsFromOutside(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		if (!(edge.target && DEV_FOLDER.test(relative(edge.target)))) {
			continue;
		}
		const from = relative(edge.file);
		const ownDev =
			DEV_FOLDER.test(from) && featureOf(edge.file) === featureOf(edge.target);
		if (!(ownDev || from.startsWith(DEV_REGISTRY))) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

const importsBackendPackage = (imp: Import) =>
	!imp.typeOnly &&
	(BACKEND_PACKAGES.some((p) => p.test(imp.specifier)) ||
		(imp.specifier === TOAST.specifier &&
			(imp.names.includes(TOAST.name) || imp.names.includes("*"))));

function backendWrappers(graph: ImportGraph): Set<string> {
	const outside = [...graph.keys()].filter(
		(file) =>
			featureOf(file) === undefined &&
			!Object.hasOwn(APP_WIDE_READS, relative(file))
	);
	const wrappers = new Set(
		outside.filter(
			(file) =>
				relative(file) === TOAST_ENTRY ||
				graph.get(file)?.some(importsBackendPackage)
		)
	);
	let grew = true;
	while (grew) {
		grew = false;
		for (const file of outside) {
			const reaches = graph
				.get(file)
				?.some(
					(imp) => !imp.typeOnly && imp.targets.some((t) => wrappers.has(t))
				);
			if (!wrappers.has(file) && reaches) {
				wrappers.add(file);
				grew = true;
			}
		}
	}
	return wrappers;
}

export function backendCallsOutsideDataHooks(graph: ImportGraph): string[] {
	const wrappers = backendWrappers(graph);
	const callsBackend = ({ imp, target }: Edge) =>
		importsBackendPackage(imp) ||
		(!imp.typeOnly && target !== undefined && wrappers.has(target));
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		if (
			from &&
			isPortedFeature(from) &&
			!DATA_HOOK.test(path.basename(edge.file)) &&
			callsBackend(edge)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

const DEV_BRIDGES = new Set([
	"dev/letters-slots.ts",
	"dev/session-end-slots.tsx",
]);

const isPortedTarget = (from: string, to: string | null | undefined) =>
	Boolean(to) &&
	from !== to &&
	!isLegacyFeature(to as string) &&
	!Object.hasOwn(SHARED_FEATURES, to as string);

export function crossFeatureImportsFromPorted(graph: ImportGraph): string[] {
	const found: string[] = [];
	const devReaches = new Map<string, Set<string>>();
	for (const edge of edges(graph)) {
		const to = edge.target && featureOf(edge.target);
		const file = relative(edge.file);
		if (file.startsWith(DEV_REGISTRY) && to) {
			devReaches.set(file, (devReaches.get(file) ?? new Set()).add(to));
		}
	}
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		if (!(from && isPortedFeature(from) && edge.target)) {
			continue;
		}
		const to = featureOf(edge.target);
		if (isPortedTarget(from, to)) {
			found.push(show(edge));
		}
		const target = relative(edge.target);
		if (target.startsWith(DEV_REGISTRY) && !DEV_BRIDGES.has(target)) {
			for (const reached of devReaches.get(target) ?? []) {
				if (isPortedTarget(from, reached)) {
					found.push(`${show(edge)} (reaches ${reached})`);
				}
			}
		}
	}
	return unique(found);
}

export function portedFolderImportsFromOldCode(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		const to = edge.target && featureOf(edge.target);
		if (
			from &&
			to &&
			from !== to &&
			isLegacyFeature(from) &&
			isPortedFeature(to) &&
			!Object.hasOwn(SHARED_FEATURES, to)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

export function devCodeInReleaseGraph(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		if (
			edge.target &&
			!edge.imp.typeOnly &&
			!edge.imp.devOnly &&
			isDevCode(relative(edge.target)) &&
			!isDevCode(relative(edge.file))
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}
