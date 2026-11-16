/** "One of each" (`AGENTS.md`, "Shared kit"), as a check over the import graph: new code
 * uses the shared kit's piece, never the older one it replaced. Returns the offending
 * imports as `file -> specifier name`; empty means it holds. Run on the real graph by
 * `import-cycles.test.ts`. Node-only. */
import { isLegacyFeature } from "@/features/feature-shape";
import { type ImportGraph, relative } from "@/features/import-graph";

/** An older piece and how it is imported: by its name from a package, or by its file. */
type Replaced = { name: string; from: string; use: string };

/** Each older piece, where it comes from (a package, or a `src/`-relative file), and its
 * replacement. */
const REPLACED: readonly Replaced[] = [
	{ from: "heroui-native", name: "PressableFeedback", use: "PressScale" },
	{ from: "heroui-native", name: "useToast", use: "toast()" },
	{
		from: "components/shared/segmented-control.tsx",
		name: "SegmentedControl",
		use: "Segmented",
	},
	{ from: "lib/root-screen.ts", name: "legacyFitSheet", use: "fitSheet" },
	{
		from: "lib/navigation-options.tsx",
		name: "useLargeHeaderOptions",
		use: "useHeaderOptions",
	},
];

/** Folders outside `features/` that hold new code: the redesign's lower layers. */
const NEW_CODE_FOLDERS = [
	"design/",
	"components/shared/",
	"components/settings-kit/",
	"lib/keyboard/",
];

/** The one file that reads heroui's toast manager, to hand it to `toast()`. */
const TOAST_BRIDGE = "components/shared/toast-bridge.tsx";

/**
 * Shared files that predate the kit and still use an older piece. They move over in
 * cleanup (C1); this list only shrinks, and a file that no longer needs its listing fails
 * the test until it is dropped.
 */
const KIT_LEGACY_FILES: ReadonlySet<string> = new Set([
	"components/shared/resource-item.tsx",
]);

const FEATURE = /^features\/([^/]+)\//;

const isNewCode = (file: string) => {
	if (file === TOAST_BRIDGE || KIT_LEGACY_FILES.has(file)) {
		return false;
	}
	const feature = file.match(FEATURE)?.[1];
	return feature
		? !isLegacyFeature(feature)
		: NEW_CODE_FOLDERS.some((folder) => file.startsWith(folder));
};

/** The older pieces one file imports, as `file -> from name`. */
function replacedImports(file: string, graph: ImportGraph): string[] {
	const found: string[] = [];
	for (const imp of graph.get(file) ?? []) {
		const targets = imp.targets.map(relative);
		for (const piece of REPLACED) {
			const source =
				imp.specifier === piece.from || targets.includes(piece.from);
			const named = imp.names.includes(piece.name) || imp.names.includes("*");
			if (source && named) {
				found.push(`${relative(file)} -> ${piece.from} ${piece.name}`);
			}
		}
	}
	return found;
}

/** New code (v2 folders, `src/design`, the shared kit) imports none of the older pieces. */
export function replacedPiecesInNewCode(graph: ImportGraph): string[] {
	return [...graph.keys()]
		.filter((file) => isNewCode(relative(file)))
		.flatMap((file) => replacedImports(file, graph));
}

/** Listed legacy kit files that no longer import an older piece: drop them from the list. */
export function staleKitListings(graph: ImportGraph): string[] {
	const files = new Map(
		[...graph.keys()].map((file) => [relative(file), file] as const)
	);
	return [...KIT_LEGACY_FILES].filter((rel) => {
		const file = files.get(rel);
		return !file || replacedImports(file, graph).length === 0;
	});
}

/** What to use instead, for the test's failure message. */
export const KIT_REPLACEMENTS = REPLACED.map(
	(piece) => `${piece.name} -> ${piece.use}`
).join(", ");
