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
 * Old folders whose screens the redesign replaces. A screen PR takes a folder off
 * this list when it replaces it in place (rewritten under the same name, in the
 * shape) or deletes it.
 */
const REPLACED_FEATURES = [
	"achievements",
	"awareness-events",
	"browse",
	"discovery",
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
	"quotes",
	"reach-me-on",
	"reflect",
	"reflect-tour",
	"session-end",
	"settings",
	"sit-with-this",
	"starter-suggestions",
	"streak",
	"timeline",
	"trusted-bridge",
	"xolacer-chat",
];

/**
 * Old folders the redesign keeps: the sweep (C1) restyles them and brings them
 * into the shape, then takes them off this list.
 */
const RESTYLED_FEATURES = [
	"auth",
	"crisis-resources",
	"feedback-tray",
	"purchases",
];

/**
 * The old feature folders, which predate the shape. Every other folder is
 * ported, held to the shape from its first commit. Both lists only shrink, and a
 * name with no folder fails the test.
 */
const LEGACY_FEATURES: ReadonlySet<string> = new Set([
	...REPLACED_FEATURES,
	...RESTYLED_FEATURES,
]);

/** Folders under `features/` that compose every feature rather than being one:
 * `navigation` spreads each feature's `screens.ts` into the stack. */
const HUBS: ReadonlySet<string> = new Set(["navigation"]);

/**
 * Features new code may import: lower-layer modules other features build
 * on, each with why. Anything else two features share moves down to
 * `src/lib`, `src/components/shared` or a kit in `src/components/<kit>`.
 */
const SHARED_FEATURES: Readonly<Record<string, string>> = {
	purchases: "the entitlements module: usePlusEntitlement, usePaywall",
};

/** An old folder: it predates the shape (and the motion rules in `motion-imports.ts`). */
export const isLegacyFeature = (feature: string) =>
	LEGACY_FEATURES.has(feature);

/** A ported folder: written in the shape, or rewritten into it by its screen PR. */
const isPortedFeature = (feature: string) =>
	!(isLegacyFeature(feature) || HUBS.has(feature));

const FEATURE_FOLDER = /^features\/([^/]+)\//;

/** Folders outside `features/` that hold new code: the redesign's lower layers. */
const NEW_LAYERS = [
	"design/",
	"components/shared/",
	"components/settings-kit/",
	"components/xolace-face/",
	"lib/keyboard/",
];

/** New code: a ported feature folder or one of the redesign's lower layers
 * (`src/`-relative path). */
export function isNewCode(file: string): boolean {
	const feature = file.match(FEATURE_FOLDER)?.[1];
	return feature
		? isPortedFeature(feature)
		: NEW_LAYERS.some((layer) => file.startsWith(layer));
}

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
/** The toast is a side effect of an action, so it lives in the data hook too: the
 * app's `toast()` (new code) and heroui's `useToast` (the old screens). */
const TOAST = { name: "useToast", specifier: "heroui-native" };
const TOAST_ENTRY = "components/shared/toast.tsx";
const DATA_HOOK = /^use-[^/]+\.ts$/;
/** The nearest `dev/` inside a feature, at any depth (`letters/write/dev/`). */
const DEV_FOLDER = /^(features\/[^/]+\/(?:[^/]+\/)*?dev)\//;
/** `src/dev/`: the dev-states registry, the one place outside a feature that
 * may import its `dev/` folder. */
const DEV_REGISTRY = "dev/";

/** Dev-build code: `src/dev/` and every feature's `dev/` (`src/`-relative path). */
const isDevCode = (file: string) =>
	file.startsWith(DEV_REGISTRY) || DEV_FOLDER.test(file);

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

/**
 * 1. New code never imports old code: a ported folder or a lower layer imports
 * no folder still on `LEGACY_FEATURES` (bar the shared modules below). A screen
 * PR deletes the old code it replaces, or replaces the folder in place; a piece
 * new code needs from an old folder moves down a layer.
 */
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

/** 2. A feature's `dev/` folders are imported only by its own `dev/` folders (a
 * big feature's `write/dev/states.tsx` may use its root `dev/` fixtures) and
 * `src/dev/`, so fixtures never ship inside a screen. */
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

/** Files outside `features/` that reach the backend, directly or through each other. */
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

/** 3. In a ported folder, only `use-*.ts` data hooks call Convex, PostHog or the toast,
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
			isPortedFeature(from) &&
			!DATA_HOOK.test(path.basename(edge.file)) &&
			callsBackend(edge)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

/** 4. A ported folder imports no other ported feature, except the shared modules
 * above: features meet in routes. (An old folder it imports is check 1.) */
export function crossFeatureImportsFromPorted(graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const edge of edges(graph)) {
		const from = featureOf(edge.file);
		const to = edge.target && featureOf(edge.target);
		if (
			from &&
			to &&
			from !== to &&
			isPortedFeature(from) &&
			!isLegacyFeature(to) &&
			!Object.hasOwn(SHARED_FEATURES, to)
		) {
			found.push(show(edge));
		}
	}
	return unique(found);
}

/**
 * 5. Old code never imports a ported folder: an old folder imports nothing a
 * screen PR has rewritten (bar the shared modules and the hub). So a folder
 * replaced in place while other old screens still used parts of it had those
 * parts moved down a layer first, and nothing imports a half-replaced folder.
 */
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

/**
 * 6. Dev states never reach a release build: code outside `src/dev/` and the
 * features' `dev/` folders reaches them only through a `require()` behind
 * `__DEV__` (the dev route shims), which a release build folds away before
 * Metro collects its dependencies. A static import would ship them.
 */
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
