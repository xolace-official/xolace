import path from "node:path";
import { describe, expect, it } from "vitest";
import { type Import, type ImportGraph, SRC } from "@/features/import-graph";
import {
	replacedPiecesInNewCode,
	staleKitListings,
} from "@/features/kit-imports";

const file = (rel: string) => path.join(SRC, rel);

const pkg = (specifier: string, names: string[] = []): Import => ({
	devOnly: false,
	names,
	specifier,
	targets: [],
	typeOnly: false,
});

const local = (rel: string, names: string[]): Import => ({
	devOnly: false,
	names,
	specifier: `@/${rel.replace(/\.tsx?$/, "")}`,
	targets: [file(rel)],
	typeOnly: false,
});

const graphOf = (entries: Record<string, Import[]>): ImportGraph =>
	new Map(
		Object.entries(entries).map(([rel, imports]) => [file(rel), imports])
	);

const LEGACY = {
	"components/shared/resource-item.tsx": [
		pkg("heroui-native", ["PressableFeedback", "useToast"]),
	],
};

describe("replacedPiecesInNewCode", () => {
	it("flags each older piece in a ported folder, src/design and the shared kit", () => {
		const graph = graphOf({
			...LEGACY,
			"components/settings-kit/row.tsx": [
				local("lib/navigation-options.tsx", ["useLargeHeaderOptions"]),
			],
			"components/shared/card.tsx": [
				pkg("heroui-native", ["PressableFeedback"]),
			],
			"design/press.ts": [pkg("heroui-native", ["*"])],
			"features/today/hero/hero.tsx": [
				local("components/shared/segmented-control.tsx", ["SegmentedControl"]),
			],
			"features/today/use-today.ts": [pkg("heroui-native", ["useToast"])],
		});
		expect(replacedPiecesInNewCode(graph)).toEqual([
			"components/settings-kit/row.tsx -> lib/navigation-options.tsx useLargeHeaderOptions",
			"components/shared/card.tsx -> heroui-native PressableFeedback",
			"design/press.ts -> heroui-native PressableFeedback",
			"design/press.ts -> heroui-native useToast",
			"features/today/hero/hero.tsx -> components/shared/segmented-control.tsx SegmentedControl",
			"features/today/use-today.ts -> heroui-native useToast",
		]);
	});

	it("allows the old folders, the toast bridge, listed legacy files and other heroui parts", () => {
		const graph = graphOf({
			...LEGACY,
			"components/shared/toast-bridge.tsx": [
				pkg("heroui-native", ["useToast"]),
			],
			"features/intake/screen.tsx": [
				pkg("heroui-native", ["PressableFeedback"]),
			],
			"features/purchases/screens.ts": [
				local("lib/navigation-options.tsx", ["useLargeHeaderOptions"]),
			],
			"features/today/hero/hero.tsx": [
				pkg("heroui-native", ["Button", "Toast"]),
				local("lib/root-screen.ts", ["fitSheet"]),
			],
		});
		expect(replacedPiecesInNewCode(graph)).toEqual([]);
	});
});

describe("staleKitListings", () => {
	it("names a listed file that no longer imports an older piece, or no longer exists", () => {
		expect(staleKitListings(graphOf(LEGACY))).toEqual([]);
		expect(
			staleKitListings(
				graphOf({
					"components/shared/resource-item.tsx": [
						pkg("heroui-native", ["Button"]),
					],
				})
			)
		).toEqual(["components/shared/resource-item.tsx"]);
		expect(staleKitListings(graphOf({}))).toEqual([
			"components/shared/resource-item.tsx",
		]);
	});
});
