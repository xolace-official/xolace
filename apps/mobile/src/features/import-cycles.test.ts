/** Feature layering guard (migration plan Phase 5): no feature cycles, `purchases` imports no
 * feature, no runtime file cycles; and the feature-shape rules for v2 folders
 * (`feature-shape.ts`). Each failure lists the imports to move. */
import { describe, expect, it } from "vitest";
import {
	backendCallsOutsideDataHooks,
	crossFeatureImportsFromV2,
	devImportsFromOutside,
	staleListings,
	v2ImportsOfOldFolders,
} from "@/features/feature-shape";
import {
	buildGraph,
	featureOf,
	findCycles,
	type ImportGraph,
	relative,
} from "@/features/import-graph";

const ENTITLEMENTS_FEATURE = "purchases";
const graph = buildGraph();

/** `a -> b` feature pairs, each with the file imports that create it. */
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

	// The checks below pass trivially on an empty graph (drifted tsconfig
	// `include`, moved `src/`); pin the inputs so a silent pass cannot hide.
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
		// A failure names the file imports inside each cycle, not just the features.
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

	it("keeps each <name>-v2 folder off its old folder, which C3 deletes", () => {
		expect(
			v2ImportsOfOldFolders(graph),
			"Copy what the v2 folder needs into it, or move it down to src/lib or src/components"
		).toEqual([]);
	});

	it("imports a feature's dev/ only from that dev/ or src/dev/", () => {
		expect(
			devImportsFromOutside(graph),
			"Fixtures and dev states never ship: the dev state renders the screen, not the reverse"
		).toEqual([]);
	});

	it("calls Convex, PostHog and the toast only from use-*.ts in v2 folders", () => {
		expect(
			backendCallsOutsideDataHooks(graph),
			"Move the call into the feature's data hook (use-<feature>.ts) and pass the result down"
		).toEqual([]);
	});

	it("keeps v2 folders off other features; shared pieces move down a layer", () => {
		expect(
			crossFeatureImportsFromV2(graph),
			"Move the shared piece to src/lib, src/components/shared or a kit in src/components/<kit>; compose features in the route, not the screen"
		).toEqual([]);
	});
});
