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
 * The feature folders that predate the shape, in their old layouts. Every other
 * folder is held to it, so a new one is checked from its first commit. This list
 * only shrinks: C3 deletes these folders, and a name with no folder fails the test.
 */
const LEGACY_FEATURES: ReadonlySet<string> = new Set([
	"achievements",
	"auth",
	"awareness-events",
	"browse",
	"consent",
	"crisis-resources",
	"discovery",
	"feedback-tray",
	"follow-up",
	"idle-menu",
	"insights",
	"intake",
	"kindling",
	"library",
	"night-mode",
	"onboarding",
	"peer-reflection",
	"profile",
	"purchases",
	"quotes",
	"reach-me-on",
	"reflect",
	"reflect-tour",
	"session-end",
	"settings",
	"sit-with-this",
	"starter-suggestions",
	"streak",
	"talk",
	"timeline",
	"trusted-bridge",
	"vent",
	"xolace-face",
	"xolacer-chat",
]);

/** Folders under `features/` that compose every feature rather than being one:
 * `navigation` spreads each feature's `screens.ts` into the stack. */
const HUBS: ReadonlySet<string> = new Set(["navigation"]);

/**
 * Features a v2 folder may import: lower-layer modules other features build
 * on, each with why. Anything else two features share moves down to
 * `src/lib`, `src/components/shared` or a kit in `src/components/<kit>`.
 */
const SHARED_FEATURES: Readonly<Record<string, string>> = {
	purchases: "the entitlements module: usePlusEntitlement, usePaywall",
};

/** A folder that predates the shape (and the motion rules in `motion-imports.ts`). */
export const isLegacyFeature = (feature: string) =>
	LEGACY_FEATURES.has(feature);

const isV2Feature = (feature: string) =>
	!(isLegacyFeature(feature) || HUBS.has(feature));

/** Listed legacy folders and hubs that no longer exist: drop them from the lists. */
export const staleListings = (features: readonly string[]): string[] =>
	[...LEGACY_FEATURES, ...HUBS].filter((f) => !features.includes(f));

/** Packages only a data hook may import (as values): Convex, PostHog, the API. */
const BACKEND_PACKAGES = [
	/^convex\/react$/,
	/^convex-helpers\/react(\/|$)/,
	/^posthog-react-native$/,
	/^@xolace\/backend\/(convex\/_generated\/)?api$/,
];
/**
 * App-wide reads a part may use directly, though they reach Convex inside, each
 * with why. Any other file outside `features/` that reaches Convex or PostHog
 * counts as calling the backend.
 */
const APP_WIDE_READS: Readonly<Record<string, string>> = {
	"lib/motion/use-effective-reduced-motion.ts":
		"the user's reduced-motion setting, read by every animated part",
};
/** The toast is a side effect of an action, so it lives in the data hook too. */
const TOAST = { name: "useToast", specifier: "heroui-native" };
const DATA_HOOK = /^use-[^/]+\.ts$/;
/** The nearest `dev/` inside a feature, at any depth (`letters/write/dev/`). */
const DEV_FOLDER = /^(features\/[^/]+\/(?:[^/]+\/)*?dev)\//;
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

/** 2. A `dev/` folder is imported only by its own files and `src/dev/`, so
 * fixtures never ship inside a screen. */
export function devImportsFromOutside(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const dev = edge.target && relative(edge.target).match(DEV_FOLDER)?.[1];
		const from = relative(edge.file);
		if (dev && !from.startsWith(`${dev}/`) && !from.startsWith(DEV_REGISTRY)) {
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

/** Files outside `features/` that reach the backend, directly or through each other. */
function backendWrappers(graph: ImportGraph): Set<string> {
	const outside = [...graph.keys()].filter(
		(file) =>
			featureOf(file) === undefined &&
			!Object.hasOwn(APP_WIDE_READS, relative(file))
	);
	const wrappers = new Set(
		outside.filter((file) => graph.get(file)?.some(importsBackendPackage))
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

/** 3. In a v2 folder, only `use-*.ts` data hooks call Convex, PostHog or the toast,
 * directly or through an app wrapper (`lib/convex/*`, `lib/speech/use-voice-input`…). */
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
