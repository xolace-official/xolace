/** The app's import graph, read with the TypeScript compiler, for the layering tests
 * (`import-cycles.test.ts`). Node-only: never imported by app code. */
import path from "node:path";
import ts from "typescript";

const APP_ROOT = path.resolve(import.meta.dirname, "../..");
export const SRC = path.join(APP_ROOT, "src");
// Metro's lookup order per platform: `foo.ios.tsx`, then `foo.native.tsx`, then
// `foo.tsx`. An import is an edge to whatever each platform would load.
const PLATFORM_SUFFIXES = [
	[".ios", ".native", ""],
	[".android", ".native", ""],
	[".web", ""],
];
const TEST_FILE = /\.(test|spec)\.tsx?$/;

/** One import, export-from, `import()` or `require()` in a source file. */
export type Import = {
	/** The specifier as written: `convex/react`, `@/lib/haptics`. */
	specifier: string;
	/** Source files under `src/` it resolves to on any platform; empty for packages. */
	targets: string[];
	typeOnly: boolean;
	/** Named value bindings (`import { useToast } from ...`), without type-only ones. */
	names: string[];
};

/** Source file (absolute) → its imports. Test files are left out. */
export type ImportGraph = Map<string, Import[]>;

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

function importBindings(node: ts.ImportDeclaration) {
	const clause = node.importClause;
	if (!clause) {
		return { names: [], typeOnly: false };
	}
	const named = clause.namedBindings;
	const elements = named && ts.isNamedImports(named) ? named.elements : [];
	const names = clause.isTypeOnly
		? []
		: elements
				.filter((e) => !e.isTypeOnly)
				.map((e) => (e.propertyName ?? e.name).text);
	const typeOnly =
		clause.isTypeOnly ||
		(!clause.name &&
			elements.length > 0 &&
			elements.every((e) => e.isTypeOnly));
	return { names, typeOnly };
}

export function buildGraph(): ImportGraph {
	const config = readConfig();
	const host = ts.createCompilerHost(config.options);
	// Resolving per platform also catches an import backed only by
	// `foo.ios.tsx` + `foo.android.tsx`, which plain resolution drops.
	const platformOptions = PLATFORM_SUFFIXES.map((moduleSuffixes) => ({
		...config.options,
		moduleSuffixes,
	}));
	const files = config.fileNames.filter(
		(f) => f.startsWith(`${SRC}/`) && !f.endsWith(".d.ts") && !TEST_FILE.test(f)
	);
	const graph: ImportGraph = new Map();
	for (const file of files) {
		const source = ts.createSourceFile(
			file,
			ts.sys.readFile(file) ?? "",
			ts.ScriptTarget.Latest
		);
		const imports: Import[] = [];
		const add = (
			specifier: string,
			typeOnly: boolean,
			names: string[] = []
		) => {
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
			imports.push({ names, specifier, targets: [...targets], typeOnly });
		};
		const visit = (node: ts.Node) => {
			if (
				ts.isImportDeclaration(node) &&
				ts.isStringLiteral(node.moduleSpecifier)
			) {
				const { names, typeOnly } = importBindings(node);
				add(node.moduleSpecifier.text, typeOnly, names);
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
		graph.set(file, imports);
	}
	return graph;
}

/** Strongly connected components with more than one node (Tarjan). */
export function findCycles(nodes: string[], next: (n: string) => string[]) {
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

/** `src/`-relative path: `features/today/today-screen.tsx`. */
export const relative = (file: string) => path.relative(SRC, file);

export const featureOf = (file: string) =>
	relative(file).match(/^features\/([^/]+)\//)?.[1];
