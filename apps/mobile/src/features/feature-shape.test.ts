import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	backendCallsOutsideDataHooks,
	crossFeatureImportsFromV2,
	devImportsFromOutside,
	v2ImportsOfOldFolders,
} from "@/features/feature-shape";
import { type Import, type ImportGraph, SRC } from "@/features/import-graph";

const file = (rel: string) => path.join(SRC, rel);

/** A local import of another `src/` file. */
const local = (rel: string, typeOnly = false): Import => ({
	names: [],
	specifier: `@/${rel.replace(/\.tsx?$/, "")}`,
	targets: [file(rel)],
	typeOnly,
});

/** A package import, with its named value bindings. */
const pkg = (specifier: string, names: string[] = []): Import => ({
	names,
	specifier,
	targets: [],
	typeOnly: false,
});

const graphOf = (entries: Record<string, Import[]>): ImportGraph =>
	new Map(
		Object.entries(entries).map(([rel, imports]) => [file(rel), imports])
	);

describe("v2ImportsOfOldFolders", () => {
	it("flags a <name>-v2 file importing <name>", () => {
		const graph = graphOf({
			"features/talk-v2/talk-screen.tsx": [local("features/talk/voice.ts")],
		});
		expect(v2ImportsOfOldFolders(graph)).toEqual([
			"features/talk-v2/talk-screen.tsx -> features/talk/voice.ts",
		]);
	});

	it("allows imports inside the v2 folder and from old folders into lower layers", () => {
		const graph = graphOf({
			"features/talk-v2/talk-screen.tsx": [local("features/talk-v2/copy.ts")],
			"features/talk/talk-screen.tsx": [local("lib/haptics.ts")],
		});
		expect(v2ImportsOfOldFolders(graph)).toEqual([]);
	});
});

describe("devImportsFromOutside", () => {
	it("flags a feature's dev/ imported by its own screen or another feature", () => {
		const graph = graphOf({
			"features/today/today-screen.tsx": [
				local("features/today/dev/states.ts"),
			],
			"features/you/you-screen.tsx": [local("features/today/dev/states.ts")],
		});
		expect(devImportsFromOutside(graph)).toEqual([
			"features/today/today-screen.tsx -> features/today/dev/states.ts",
			"features/you/you-screen.tsx -> features/today/dev/states.ts",
		]);
	});

	it("allows its own dev/ files and the src/dev registry", () => {
		const graph = graphOf({
			"dev/registry.ts": [local("features/today/dev/states.ts")],
			"features/today/dev/needs-plus.tsx": [
				local("features/today/dev/states.ts"),
			],
			"features/today/dev/states.ts": [
				local("features/today/today-screen.tsx"),
			],
		});
		expect(devImportsFromOutside(graph)).toEqual([]);
	});
});

describe("backendCallsOutsideDataHooks", () => {
	it("flags Convex, PostHog, the API, the toast and the app's wrappers outside use-*.ts", () => {
		const graph = graphOf({
			"features/today/hero/hero.tsx": [
				pkg("convex/react", ["useQuery"]),
				pkg("posthog-react-native", ["usePostHog"]),
				pkg("@xolace/backend/convex/_generated/api", ["api"]),
				pkg("heroui-native", ["useToast"]),
				local("lib/convex/use-stable-query.ts"),
			],
		});
		expect(backendCallsOutsideDataHooks(graph)).toHaveLength(5);
	});

	it("allows data hooks, type-only imports, other heroui parts and old folders", () => {
		const graph = graphOf({
			"features/reflect/compose.tsx": [pkg("convex/react", ["useQuery"])],
			"features/today/hero/hero.tsx": [
				{ ...pkg("@xolace/backend/convex/_generated/api"), typeOnly: true },
				pkg("heroui-native", ["Button"]),
			],
			"features/today/hero/use-hero.ts": [pkg("convex/react", ["useQuery"])],
			"features/today/use-today.ts": [pkg("convex/react", ["useMutation"])],
		});
		expect(backendCallsOutsideDataHooks(graph)).toEqual([]);
	});
});

describe("crossFeatureImportsFromV2", () => {
	it("flags a v2 folder importing another feature, types included", () => {
		const graph = graphOf({
			"features/today/today-screen.tsx": [
				local("features/streak/streak-ring.tsx"),
				local("features/you/you-model.ts", true),
			],
		});
		expect(crossFeatureImportsFromV2(graph)).toEqual([
			"features/today/today-screen.tsx -> features/streak/streak-ring.tsx",
			"features/today/today-screen.tsx -> features/you/you-model.ts",
		]);
	});

	it("allows the shared modules, lower layers and old folders", () => {
		const graph = graphOf({
			"features/reflect/reflect-screen.tsx": [local("features/streak/x.ts")],
			"features/today/today-screen.tsx": [
				local("features/purchases/use-paywall.ts"),
				local("components/shared/app-text.tsx"),
			],
		});
		expect(crossFeatureImportsFromV2(graph)).toEqual([]);
	});
});
