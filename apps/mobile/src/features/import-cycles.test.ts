import { describe, expect, it } from "vitest";
import {
	backendFilesInAppBundle,
	backendImportsOffList,
	serverOnlyCodeReached,
	staleBackendListings,
} from "@/features/backend-imports";
import {
	backendCallsOutsideDataHooks,
	crossFeatureImportsFromPorted,
	devCodeInReleaseGraph,
	devImportsFromOutside,
	oldFolderImportsFromNewCode,
	portedFolderImportsFromOldCode,
	staleListings,
} from "@/features/feature-shape";
import {
	buildGraph,
	featureOf,
	findCycles,
	type ImportGraph,
	relative,
} from "@/features/import-graph";
import {
	KIT_REPLACEMENTS,
	replacedPiecesInNewCode,
	staleKitListings,
} from "@/features/kit-imports";
import {
	easeImportsOutsideEaseTs,
	osReducedMotionReads,
	staleEaseListings,
} from "@/features/motion-imports";

const ENTITLEMENTS_FEATURE = "purchases";
const graph = buildGraph();

function featureEdges(importGraph: ImportGraph): Map<string, string[]> {
	const pairs = new Map<string, string[]>();
	for (const [file, imports] of importGraph) {
		const from = featureOf(file);
		for (const to of imports.flatMap((i) => i.targets)) {
			const target = featureOf(to);
			if (!(from && target) || from === target) {
				continue;
			}
			const key = `${from} -> ${target}`;
			pairs.set(key, [
				...(pairs.get(key) ?? []),
				`${relative(file)} -> ${relative(to)}`,
			]);
		}
	}
	return pairs;
}

describe("import graph", () => {
	const pairs = featureEdges(graph);
	const features = [
		...new Set([...graph.keys()].map(featureOf).filter((f) => f !== undefined)),
	];

	it("sees the source tree it is checking", () => {
		expect(graph.size).toBeGreaterThan(0);
		expect(features).toContain(ENTITLEMENTS_FEATURE);
		expect(pairs.size).toBeGreaterThan(0);
		const packages = [...graph.values()].flat().map((i) => i.specifier);
		expect(packages).toContain("convex/react");
	});

	it("has no cycles between feature folders", () => {
		const next = (f: string) =>
			[...pairs.keys()]
				.filter((k) => k.startsWith(`${f} -> `))
				.map((k) => k.slice(`${f} -> `.length));
		const report = findCycles(features, next).map((cycle) => ({
			cycle,
			imports: [...pairs]
				.filter(([k]) => k.split(" -> ").every((f) => cycle.includes(f)))
				.flatMap(([, files]) => files),
		}));
		expect(report).toEqual([]);
	});

	it("keeps purchases an entitlements module that imports no other feature", () => {
		const outgoing = [...pairs]
			.filter(([k]) => k.startsWith(`${ENTITLEMENTS_FEATURE} -> `))
			.flatMap(([, files]) => files);
		expect(outgoing).toEqual([]);
	});

	it("has no runtime import cycles between files", () => {
		const next = (file: string) =>
			(graph.get(file) ?? [])
				.filter((i) => !i.typeOnly)
				.flatMap((i) => i.targets)
				.filter((to) => graph.has(to));
		const cycles = findCycles([...graph.keys()], next).map((c) =>
			c.map(relative)
		);
		expect(cycles).toEqual([]);
	});
});

describe("feature shape (apps/mobile/AGENTS.md)", () => {
	it("lists only legacy folders and hubs that still exist", () => {
		const features = [
			...new Set(
				[...graph.keys()].map(featureOf).filter((f) => f !== undefined)
			),
		];
		expect(
			staleListings(features),
			"Remove deleted folders from LEGACY_FEATURES / HUBS in feature-shape.ts"
		).toEqual([]);
	});

	it("keeps new code off the old folders", () => {
		expect(
			oldFolderImportsFromNewCode(graph),
			"A folder your screen replaces (REPLACED_FEATURES): delete the old code, or replace the folder in place and take it off the list. Any old folder: move the piece new code needs down to src/lib or src/components"
		).toEqual([]);
	});

	it("keeps old folders off the ported ones", () => {
		expect(
			portedFolderImportsFromOldCode(graph),
			"Old screens still use a part of a folder that was replaced in place: move that part down to src/lib or src/components/shared and point both at it"
		).toEqual([]);
	});

	it("imports a feature's dev/ only from that dev/ or src/dev/", () => {
		expect(
			devImportsFromOutside(graph),
			"Fixtures and dev states never ship: the dev state renders the screen, not the reverse"
		).toEqual([]);
	});

	it("reaches dev states only behind __DEV__, so release builds drop them", () => {
		expect(
			devCodeInReleaseGraph(graph),
			'Open src/dev only from a dev route shim, or a fixture adapter seeding itself until its contract lands: `__DEV__ ? require("@/dev/…") : null`. A static import ships it'
		).toEqual([]);
		const guarded = [...graph.values()]
			.flat()
			.filter((i) => i.devOnly)
			.flatMap((i) => i.targets.map(relative));
		expect(guarded).toContain("dev/dev-state-screen.tsx");
	});

	it("calls Convex, PostHog and the toast only from use-*.ts in ported folders", () => {
		expect(
			backendCallsOutsideDataHooks(graph),
			"Move the call into the feature's data hook (use-<feature>.ts) and pass the result down"
		).toEqual([]);
	});

	it("keeps ported folders off each other; shared pieces move down a layer", () => {
		expect(
			crossFeatureImportsFromPorted(graph),
			"Move the shared piece to src/lib, src/components/shared or a kit in src/components/<kit>; compose features in the route, not the screen"
		).toEqual([]);
	});
});

describe("motion (apps/mobile/AGENTS.md)", () => {
	it("imports react-native-ease only in src/design/ease.ts", () => {
		expect(
			easeImportsOutsideEaseTs(graph),
			"Import EaseView and its types from @/design/ease, loops from @/design/ease-loops or ease-breath"
		).toEqual([]);
	});

	it("lists only legacy Ease files that still import it", () => {
		expect(
			staleEaseListings(graph),
			"Remove these from EASE_LEGACY_FILES in motion-imports.ts"
		).toEqual([]);
	});

	it("reads reduced motion through useEffectiveReducedMotion in new code", () => {
		expect(
			osReducedMotionReads(graph),
			"Use useEffectiveReducedMotion() from @/lib/motion/use-effective-reduced-motion: it honours the in-app setting"
		).toEqual([]);
	});
});

describe("shared kit (apps/mobile/AGENTS.md)", () => {
	it("keeps new code on the kit's piece, one of each", () => {
		expect(
			replacedPiecesInNewCode(graph),
			`Use the shared kit instead: ${KIT_REPLACEMENTS}`
		).toEqual([]);
	});

	it("lists only legacy kit files that still use an older piece", () => {
		expect(
			staleKitListings(graph),
			"Remove these from KIT_LEGACY_FILES in kit-imports.ts"
		).toEqual([]);
	});
});

describe("backend imports (packages/backend/AGENTS.md)", () => {
	it("imports values only from the api, the data model, shared and the listed client-safe modules", () => {
		expect(
			backendImportsOffList(graph),
			"Move the client-safe value into packages/backend/convex/lib/shared.ts and import it from @xolace/backend/shared; import types with `import type`"
		).toEqual([]);
	});

	it("lists only client-safe modules the app still imports", () => {
		expect(
			staleBackendListings(graph),
			"Remove these from BACKEND_LEGACY_MODULES in backend-imports.ts"
		).toEqual([]);
	});

	it("bundles no server-only backend code through those modules", () => {
		const entries = backendFilesInAppBundle(graph);
		expect(entries.some((f) => f.endsWith("/convex/lib/shared.ts"))).toBe(true);
		expect(
			serverOnlyCodeReached(entries),
			'A client-safe backend module imports server-only code at runtime: ElevenLabs ids, a "use node" file or process.env. Import it as a type, or move the value it needs into lib/shared.ts'
		).toEqual([]);
	});
});
