/** The feature-shape rules (`AGENTS.md`, "Feature shape"), as checks over the import
 * graph. Each returns the offending imports as `from -> to`; empty means it holds.
 * Run on the real graph by `import-cycles.test.ts`. Node-only. */
import path from "node:path";
import {
	featureOf,
	type Import,
	type ImportGraph,
	relative,
} from "@/features/import-graph";

/**
 * Redesign feature folders on a name no old folder holds. `<name>-v2` folders
 * are v2 without a listing. A v2 folder on a new free name is added here.
 */
const V2_FEATURES: ReadonlySet<string> = new Set([
	"explore",
	"letters",
	"return",
	"today",
	"you",
]);

/**
 * Features a v2 folder may import: lower-layer modules other features build
 * on, each with why. Anything else two features share moves down to
 * `src/lib`, `src/components/shared` or a kit in `src/components/<kit>`.
 */
const SHARED_FEATURES: Readonly<Record<string, string>> = {
	purchases: "the entitlements module: usePlusEntitlement, usePaywall",
};

const isV2Feature = (feature: string) =>
	feature.endsWith("-v2") || V2_FEATURES.has(feature);

/** Packages only a data hook may import (as values): Convex, PostHog, the API. */
const BACKEND_PACKAGES = [
	/^convex\/react$/,
	/^convex-helpers\/react(\/|$)/,
	/^posthog-react-native$/,
	/^@xolace\/backend\/(convex\/_generated\/)?api$/,
];
/** The app's own wrappers around those (`src/`-relative). */
const BACKEND_WRAPPERS = [
	/^lib\/convex\//,
	/^lib\/use-preference-mutation\.ts$/,
	/^config\/posthog\.ts$/,
];
/** The toast is a side effect of an action, so it lives in the data hook too. */
const TOAST = { name: "useToast", specifier: "heroui-native" };
const DATA_HOOK = /^use-[^/]+\.ts$/;
const DEV_FOLDER = /^features\/([^/]+)\/dev\//;
/** `src/dev/`: the dev-states registry, the one place outside a feature that
 * may import its `dev/` folder. */
const DEV_REGISTRY = "dev/";

type Edge = { file: string; imp: Import; target?: string };

/** Every import as an edge; one per in-repo target, or one with no target. */
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

/** 1. A `<name>-v2` folder never imports `<name>`: C3 deletes the old folder. */
export function v2ImportsOfOldFolders(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		const to = edge.target && featureOf(edge.target);
		if (from?.endsWith("-v2") && to === from.slice(0, -"-v2".length)) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

/** 2. A feature's `dev/` is imported only by its own `dev/` files and `src/dev/`,
 * so fixtures never ship inside a screen. */
export function devImportsFromOutside(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const owner = edge.target && relative(edge.target).match(DEV_FOLDER)?.[1];
		const from = relative(edge.file);
		if (
			owner &&
			!from.startsWith(`features/${owner}/dev/`) &&
			!from.startsWith(DEV_REGISTRY)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

const callsBackend = ({ imp, target }: Edge) =>
	!imp.typeOnly &&
	(BACKEND_PACKAGES.some((p) => p.test(imp.specifier)) ||
		(imp.specifier === TOAST.specifier && imp.names.includes(TOAST.name)) ||
		(target !== undefined &&
			BACKEND_WRAPPERS.some((p) => p.test(relative(target)))));

/** 3. In a v2 folder, only `use-*.ts` data hooks call Convex, PostHog or the toast. */
export function backendCallsOutsideDataHooks(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		if (
			from &&
			isV2Feature(from) &&
			!DATA_HOOK.test(path.basename(edge.file)) &&
			callsBackend(edge)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

/** 4. A v2 folder imports no other feature, except the shared modules above. */
export function crossFeatureImportsFromV2(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		const to = edge.target && featureOf(edge.target);
		if (
			from &&
			to &&
			from !== to &&
			isV2Feature(from) &&
			!Object.hasOwn(SHARED_FEATURES, to)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}
