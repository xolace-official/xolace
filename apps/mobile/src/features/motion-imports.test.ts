import path from "node:path";
import { describe, expect, it } from "vitest";
import { type Import, type ImportGraph, SRC } from "@/features/import-graph";
import {
	easeImportsOutsideEaseTs,
	osReducedMotionReads,
	staleEaseListings,
} from "@/features/motion-imports";

const pkg = (specifier: string, names: string[] = []): Import => ({
	devOnly: false,
	names,
	specifier,
	targets: [],
	typeOnly: false,
});

const graphOf = (entries: Record<string, Import[]>): ImportGraph =>
	new Map(
		Object.entries(entries).map(([rel, imports]) => [
			path.join(SRC, rel),
			imports,
		])
	);

const LEGACY_EASE_FILES = {
	"components/shared/resource-item.tsx": [pkg("react-native-ease/uniwind")],
	"components/ui/heatmap-chart/root.tsx": [pkg("react-native-ease")],
};

describe("easeImportsOutsideEaseTs", () => {
	it("flags Ease imported anywhere new: a ported folder, a hub, a shared component, types too", () => {
		const graph = graphOf({
			"components/shared/aura.tsx": [
				{ ...pkg("react-native-ease"), typeOnly: true },
			],
			"features/navigation/root-screens.ts": [pkg("react-native-ease")],
			"features/today/hero/glow.tsx": [pkg("react-native-ease/uniwind")],
		});
		expect(easeImportsOutsideEaseTs(graph)).toEqual([
			"components/shared/aura.tsx -> react-native-ease",
			"features/navigation/root-screens.ts -> react-native-ease",
			"features/today/hero/glow.tsx -> react-native-ease/uniwind",
		]);
	});

	it("allows ease.ts, the legacy folders and the listed legacy files", () => {
		const graph = graphOf({
			"design/ease.ts": [
				pkg("react-native-ease"),
				pkg("react-native-ease/uniwind"),
			],
			"features/streak/streak-card.tsx": [pkg("react-native-ease")],
			...LEGACY_EASE_FILES,
		});
		expect(easeImportsOutsideEaseTs(graph)).toEqual([]);
	});

	it("doesn't mistake another package for Ease", () => {
		const graph = graphOf({
			"features/today/glow.tsx": [pkg("react-native-easing-functions")],
		});
		expect(easeImportsOutsideEaseTs(graph)).toEqual([]);
	});
});

describe("staleEaseListings", () => {
	it("names a listed legacy file that no longer imports Ease", () => {
		const { "components/shared/resource-item.tsx": _, ...rest } =
			LEGACY_EASE_FILES;
		const graph = graphOf({
			...rest,
			"components/shared/resource-item.tsx": [pkg("react-native-reanimated")],
		});
		expect(staleEaseListings(graph)).toEqual([
			"components/shared/resource-item.tsx",
		]);
		expect(staleEaseListings(graphOf(LEGACY_EASE_FILES))).toEqual([]);
	});
});

describe("osReducedMotionReads", () => {
	it("flags Reanimated's useReducedMotion, or the whole module, in new motion code", () => {
		const graph = graphOf({
			"components/shared/aura.tsx": [
				pkg("react-native-reanimated", ["useReducedMotion", "withTiming"]),
			],
			"design/flux.tsx": [pkg("react-native-reanimated", ["useReducedMotion"])],
			"features/letters/seal.tsx": [pkg("react-native-reanimated", ["*"])],
			"features/today/hero/glow.tsx": [
				pkg("react-native-reanimated", ["useReducedMotion"]),
			],
		});
		expect(osReducedMotionReads(graph)).toEqual([
			"components/shared/aura.tsx -> react-native-reanimated useReducedMotion",
			"design/flux.tsx -> react-native-reanimated useReducedMotion",
			"features/letters/seal.tsx -> react-native-reanimated *",
			"features/today/hero/glow.tsx -> react-native-reanimated useReducedMotion",
		]);
	});

	it("leaves legacy folders and kits alone, and other Reanimated imports", () => {
		const graph = graphOf({
			"components/ui/thinking-orb.tsx": [
				pkg("react-native-reanimated", ["useReducedMotion"]),
			],
			"features/streak/campfire-mascot.tsx": [
				pkg("react-native-reanimated", ["useReducedMotion"]),
			],
			"features/today/hero/glow.tsx": [
				pkg("react-native-reanimated", ["withTiming", "ReduceMotion"]),
			],
		});
		expect(osReducedMotionReads(graph)).toEqual([]);
	});
});
