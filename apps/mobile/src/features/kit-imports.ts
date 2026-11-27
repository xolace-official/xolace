import { isNewCode } from "@/features/feature-shape";
import { type ImportGraph, relative } from "@/features/import-graph";

type Replaced = { name: string; from: string; use: string };

const REPLACED: readonly Replaced[] = [
	{ from: "heroui-native", name: "PressableFeedback", use: "PressScale" },
	{ from: "heroui-native", name: "useToast", use: "toast()" },
	{
		from: "components/shared/segmented-control.tsx",
		name: "SegmentedControl",
		use: "Segmented",
	},
	{
		from: "lib/navigation-options.tsx",
		name: "useLargeHeaderOptions",
		use: "useHeaderOptions",
	},
];

const TOAST_BRIDGE = "components/shared/toast-bridge.tsx";

const KIT_LEGACY_FILES: ReadonlySet<string> = new Set([
	"components/shared/resource-item.tsx",
	// Moved into `plus` without a restyle (the paywall is in store review); the kit's
	// PressScale and Segmented would change how they look and feel.
	"features/plus/first-look/talk-demo/demo-listen.tsx",
	"features/plus/first-look/talk-demo/talk-demo.tsx",
	"features/plus/first-look/talk-demo/use-talk-demo.ts",
	"features/plus/paywall/paywall-header-actions.tsx",
	"features/plus/paywall/paywall-period-picker.tsx",
]);

const heldToKit = (file: string) =>
	file !== TOAST_BRIDGE && !KIT_LEGACY_FILES.has(file) && isNewCode(file);

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

export function replacedPiecesInNewCode(graph: ImportGraph): string[] {
	return [...graph.keys()]
		.filter((file) => heldToKit(relative(file)))
		.flatMap((file) => replacedImports(file, graph));
}

export function staleKitListings(graph: ImportGraph): string[] {
	const files = new Map(
		[...graph.keys()].map((file) => [relative(file), file] as const)
	);
	return [...KIT_LEGACY_FILES].filter((rel) => {
		const file = files.get(rel);
		return !file || replacedImports(file, graph).length === 0;
	});
}

export const KIT_REPLACEMENTS = REPLACED.map(
	(piece) => `${piece.name} -> ${piece.use}`
).join(", ");
