/**
 * Guards the feature layering (Phase 5 of docs/plan/workspace-migration-plan.md).
 *
 * - No feature folder may reach itself through other features. Hubs (settings,
 *   reflect) import the features they compose; shared pieces live in
 *   `src/lib`, `src/components/shared`, or the one feature that owns them.
 * - `purchases` is the entitlements module: features ask it "is this person
 *   Plus?" (`usePlusEntitlement`) or open its door (`usePaywall`). It never
 *   imports another feature.
 * - No runtime import cycle between files anywhere in `src`; those can hand a
 *   module `undefined` at load time. Type-only imports are erased, so they
 *   don't count there.
 *
 * Imports are read with the TypeScript compiler API against tsconfig.json, so
 * `@/` aliases resolve exactly as `tsc` sees them.
 */
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const APP_ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(APP_ROOT, "src");
// Metro's lookup order per platform: `foo.ios.tsx`, then `foo.native.tsx`, then
// `foo.tsx`. An import is an edge to whatever each platform would load.
const PLATFORM_SUFFIXES = [
	[".ios", ".native", ""],
	[".android", ".native", ""],
	[".web", ""],
];
const ENTITLEMENTS_FEATURE = "purchases";

type Edge = { to: string; typeOnly: boolean };

function readConfig(): ts.ParsedCommandLine {
	const config = ts.getParsedCommandLineOfConfigFile(
		path.join(APP_ROOT, "tsconfig.json"),
		{},
		{ ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined }
	);
	if (!config) {
		throw new Error("Could not read apps/mobile/tsconfig.json");
	}
	return config;
}

function isTypeOnlyImport(node: ts.ImportDeclaration): boolean {
	const clause = node.importClause;
	if (!clause) {
		return false;
	}
	if (clause.isTypeOnly) {
		return true;
	}
	const named = clause.namedBindings;
	return (
		!clause.name &&
		named !== undefined &&
		ts.isNamedImports(named) &&
		named.elements.length > 0 &&
		named.elements.every((e) => e.isTypeOnly)
	);
}

function buildGraph(): Map<string, Edge[]> {
	const config = readConfig();
	const host = ts.createCompilerHost(config.options);
	// Resolving per platform also catches an import backed only by
	// `foo.ios.tsx` + `foo.android.tsx`, which plain resolution drops.
	const platformOptions = PLATFORM_SUFFIXES.map((moduleSuffixes) => ({
		...config.options,
		moduleSuffixes,
	}));
	const files = config.fileNames.filter(
		(f) =>
			f.startsWith(`${SRC}/`) &&
			!f.endsWith(".d.ts") &&
			!/\.(test|spec)\.tsx?$/.test(f)
	);
	const graph = new Map<string, Edge[]>();
	for (const file of files) {
		const source = ts.createSourceFile(
			file,
			ts.sys.readFile(file) ?? "",
			ts.ScriptTarget.Latest
		);
		const edges: Edge[] = [];
		const add = (specifier: string, typeOnly: boolean) => {
			const targets = new Set<string>();
			for (const options of platformOptions) {
				const resolved = ts.resolveModuleName(
					specifier,
					file,
					options,
					host
				).resolvedModule;
				if (resolved && !resolved.isExternalLibraryImport) {
					targets.add(resolved.resolvedFileName);
				}
			}
			for (const to of targets) {
				edges.push({ to, typeOnly });
			}
		};
		const visit = (node: ts.Node) => {
			if (
				ts.isImportDeclaration(node) &&
				ts.isStringLiteral(node.moduleSpecifier)
			) {
				add(node.moduleSpecifier.text, isTypeOnlyImport(node));
			} else if (
				ts.isExportDeclaration(node) &&
				node.moduleSpecifier &&
				ts.isStringLiteral(node.moduleSpecifier)
			) {
				add(node.moduleSpecifier.text, node.isTypeOnly);
			} else if (
				ts.isCallExpression(node) &&
				node.arguments.length === 1 &&
				ts.isStringLiteral(node.arguments[0]) &&
				(node.expression.kind === ts.SyntaxKind.ImportKeyword ||
					(ts.isIdentifier(node.expression) &&
						node.expression.text === "require"))
			) {
				add(node.arguments[0].text, false);
			}
			ts.forEachChild(node, visit);
		};
		visit(source);
		graph.set(file, edges);
	}
	return graph;
}

/** Strongly connected components with more than one node (Tarjan). */
function findCycles(nodes: string[], next: (n: string) => string[]) {
	let counter = 0;
	const index = new Map<string, number>();
	const low = new Map<string, number>();
	const stack: string[] = [];
	const onStack = new Set<string>();
	const cycles: string[][] = [];
	const connect = (v: string) => {
		index.set(v, counter);
		low.set(v, counter);
		counter++;
		stack.push(v);
		onStack.add(v);
		for (const w of next(v)) {
			if (!index.has(w)) {
				connect(w);
				low.set(v, Math.min(low.get(v) ?? 0, low.get(w) ?? 0));
			} else if (onStack.has(w)) {
				low.set(v, Math.min(low.get(v) ?? 0, index.get(w) ?? 0));
			}
		}
		if (low.get(v) === index.get(v)) {
			const component: string[] = [];
			let w: string | undefined;
			do {
				w = stack.pop();
				if (w !== undefined) {
					onStack.delete(w);
					component.push(w);
				}
			} while (w !== undefined && w !== v);
			if (component.length > 1) {
				cycles.push(component.sort());
			}
		}
	};
	for (const n of nodes) {
		if (!index.has(n)) {
			connect(n);
		}
	}
	return cycles;
}

const relative = (file: string) => path.relative(SRC, file);
const featureOf = (file: string) =>
	relative(file).match(/^features\/([^/]+)\//)?.[1];

/** `a -> b` feature pairs, each with the file imports that create it. */
function featureEdges(graph: Map<string, Edge[]>): Map<string, string[]> {
	const pairs = new Map<string, string[]>();
	for (const [file, edges] of graph) {
		const from = featureOf(file);
		for (const { to } of edges) {
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
	const graph = buildGraph();
	const pairs = featureEdges(graph);
	const features = [
		...new Set([...graph.keys()].map(featureOf).filter((f) => f !== undefined)),
	];

	// The three checks below all pass trivially on an empty graph, which is what
	// a drifted tsconfig `include`, a moved `src/` or a path-separator mismatch
	// would produce. Pin the inputs so a silent pass can't hide behind them.
	it("sees the source tree it is checking", () => {
		expect(graph.size).toBeGreaterThan(0);
		expect(features).toContain(ENTITLEMENTS_FEATURE);
		expect(pairs.size).toBeGreaterThan(0);
	});

	it("has no cycles between feature folders", () => {
		const next = (f: string) =>
			[...pairs.keys()]
				.filter((k) => k.startsWith(`${f} -> `))
				.map((k) => k.slice(`${f} -> `.length));
		// Each cycle comes with the file imports inside it, so a failure names the
		// lines to move rather than just the features.
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
				.filter((e) => !e.typeOnly && graph.has(e.to))
				.map((e) => e.to);
		const cycles = findCycles([...graph.keys()], next).map((c) =>
			c.map(relative)
		);
		expect(cycles).toEqual([]);
	});
});
