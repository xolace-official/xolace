import { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";
import { type ImportGraph, relative, SRC } from "@/features/import-graph";

const BACKEND = "@xolace/backend/";

const BACKEND_ENTRIES: ReadonlySet<string> = new Set([
	"@xolace/backend/api",
	"@xolace/backend/dataModel",
	"@xolace/backend/shared",
	"@xolace/backend/convex/_generated/api",
	"@xolace/backend/convex/_generated/dataModel",
]);

const BACKEND_LEGACY_MODULES: ReadonlySet<string> = new Set([
	"@xolace/backend/convex/ai/talk/audioTags",
	"@xolace/backend/convex/lib/chatNotifications",
	"@xolace/backend/convex/lib/conversationGating",
	"@xolace/backend/convex/lib/crisisResources",
	"@xolace/backend/convex/lib/displayName",
	"@xolace/backend/convex/lib/notificationSounds",
	"@xolace/backend/convex/lib/spaceName",
	"@xolace/backend/convex/lib/specialties",
	"@xolace/backend/convex/lib/streakFreezes",
	"@xolace/backend/convex/lib/streamSetup",
	"@xolace/backend/convex/lib/timeOfDay",
	"@xolace/backend/convex/lib/validators",
	"@xolace/backend/convex/streaks/milestones",
	"@xolace/backend/convex/talk/clock",
]);

const SERVER_ONLY_FILES = [
	/\/lib\/elevenLabsVoices\.ts$/,
	/\/ai\/providers\//,
	/\/jobs\//,
];
const SERVER_ONLY_SOURCE = [/^\s*["']use node["']/m, /\bprocess\.env\b/];

const isValueImportFromBackend = (specifier: string, typeOnly: boolean) =>
	specifier.startsWith(BACKEND) && !typeOnly;

function backendValueImports(graph: ImportGraph) {
	return [...graph].flatMap(([file, imports]) =>
		imports
			.filter((i) => isValueImportFromBackend(i.specifier, i.typeOnly))
			.map((i) => ({ file, imp: i }))
	);
}

export function backendImportsOffList(graph: ImportGraph): string[] {
	return backendValueImports(graph)
		.filter(
			({ imp }) =>
				!(
					BACKEND_ENTRIES.has(imp.specifier) ||
					BACKEND_LEGACY_MODULES.has(imp.specifier)
				)
		)
		.map(({ file, imp }) => `${relative(file)} -> ${imp.specifier}`)
		.sort();
}

export function staleBackendListings(graph: ImportGraph): string[] {
	const used = new Set(
		backendValueImports(graph).map(({ imp }) => imp.specifier)
	);
	return [...BACKEND_LEGACY_MODULES].filter((m) => !used.has(m));
}

const requireFromApp = createRequire(path.join(SRC, "app"));

function runtimeFileOf(specifier: string): string | undefined {
	try {
		return requireFromApp.resolve(specifier);
	} catch {
		return undefined;
	}
}

export function backendFilesInAppBundle(graph: ImportGraph): string[] {
	const specifiers = new Set(
		backendValueImports(graph).map(({ imp }) => imp.specifier)
	);
	const files = [...specifiers]
		.filter((s) => BACKEND_ENTRIES.has(s) || BACKEND_LEGACY_MODULES.has(s))
		.map(runtimeFileOf)
		.filter((file) => file !== undefined);
	return [...new Set(files)].sort();
}

type Read = (file: string) => string | undefined;

function runtimeRelativeImports(
	file: string,
	source: ts.SourceFile,
	read: Read
): string[] {
	const found: string[] = [];
	for (const node of source.statements) {
		const typeOnly =
			(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) ||
			(ts.isExportDeclaration(node) && node.isTypeOnly);
		const specifier =
			(ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
			node.moduleSpecifier &&
			ts.isStringLiteral(node.moduleSpecifier)
				? node.moduleSpecifier.text
				: undefined;
		if (!(specifier?.startsWith(".") && !typeOnly)) {
			continue;
		}
		const resolved = ts.resolveModuleName(
			specifier,
			file,
			{ moduleResolution: ts.ModuleResolutionKind.Bundler },
			{ fileExists: (f) => read(f) !== undefined, readFile: read }
		).resolvedModule?.resolvedFileName;
		if (resolved) {
			found.push(resolved);
		}
	}
	return found;
}

export function serverOnlyCodeReached(
	entries: string[],
	read: Read = ts.sys.readFile
): string[] {
	const seen = new Set<string>();
	const reached: string[] = [];
	const queue = [...entries];
	while (queue.length > 0) {
		const file = queue.pop();
		if (file === undefined || seen.has(file)) {
			continue;
		}
		seen.add(file);
		const text = read(file) ?? "";
		if (
			SERVER_ONLY_FILES.some((p) => p.test(file)) ||
			SERVER_ONLY_SOURCE.some((p) => p.test(text))
		) {
			reached.push(file.slice(file.indexOf("/convex/") + 1));
		}
		const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest);
		queue.push(...runtimeRelativeImports(file, source, read));
	}
	return reached.sort();
}
