import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	backendCallsOutsideDataHooks,
	crossFeatureImportsFromPorted,
	devCodeInReleaseGraph,
	devImportsFromOutside,
	oldFolderImportsFromNewCode,
	portedFolderImportsFromOldCode,
	staleListings,
} from "@/features/feature-shape";
import { type Import, type ImportGraph, SRC } from "@/features/import-graph";

const file = (rel: string) => path.join(SRC, rel);

/** A local import of another `src/` file. */
const local = (rel: string, typeOnly = false): Import => ({
	devOnly: false,
	names: [],
	specifier: `@/${rel.replace(/\.tsx?$/, "")}`,
	targets: [file(rel)],
	typeOnly,
});

/** A `require()` of another `src/` file behind `__DEV__`. */
const devRequire = (rel: string): Import => ({
	...local(rel),
	devOnly: true,
});

/** A package import, with its named value bindings. */
const pkg = (specifier: string, names: string[] = []): Import => ({
	devOnly: false,
	names,
	specifier,
	targets: [],
	typeOnly: false,
});

const graphOf = (entries: Record<string, Import[]>): ImportGraph =>
	new Map(
		Object.entries(entries).map(([rel, imports]) => [file(rel), imports])
	);

describe("oldFolderImportsFromNewCode", () => {
	it("flags a ported folder or a lower layer importing an old folder, types included", () => {
		const graph = graphOf({
			"components/shared/card.tsx": [local("features/quotes/tile.tsx")],
			"design/type.ts": [local("features/streak/faces.ts", true)],
			"features/today/today-screen.tsx": [
				local("features/quotes/components/quotes-screen.tsx"),
			],
		});
		expect(oldFolderImportsFromNewCode(graph)).toEqual([
			"components/shared/card.tsx -> features/quotes/tile.tsx",
			"design/type.ts -> features/streak/faces.ts",
			"features/today/today-screen.tsx -> features/quotes/components/quotes-screen.tsx",
		]);
	});

	it("allows old folders among themselves, inside one folder, the hub, routes and purchases", () => {
		const graph = graphOf({
			"app/(protected)/(tabs)/today/index.tsx": [
				local("features/quotes/components/quotes-screen.tsx"),
			],
			"features/navigation/root-screens.ts": [
				local("features/streak/screens.ts"),
			],
			"features/quotes/quotes-screen.tsx": [
				local("features/browse/browse-home.tsx"),
				local("features/quotes/tile.tsx"),
			],
			"features/today/today-screen.tsx": [
				local("features/purchases/use-paywall.ts"),
			],
		});
		expect(oldFolderImportsFromNewCode(graph)).toEqual([]);
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

	it("finds dev/ at any depth in a big feature", () => {
		const graph = graphOf({
			"features/letters/read/read-screen.tsx": [
				local("features/letters/write/dev/drafts.ts"),
			],
			"features/letters/write/dev/states.tsx": [
				local("features/letters/write/dev/drafts.ts"),
			],
		});
		expect(devImportsFromOutside(graph)).toEqual([
			"features/letters/read/read-screen.tsx -> features/letters/write/dev/drafts.ts",
		]);
	});

	it("allows a big feature's dev/ folders to share, but not across features", () => {
		const graph = graphOf({
			"features/letters/write/dev/states.tsx": [
				local("features/letters/dev/fixtures.ts"),
			],
			"features/you/dev/states.tsx": [
				local("features/letters/dev/fixtures.ts"),
			],
		});
		expect(devImportsFromOutside(graph)).toEqual([
			"features/you/dev/states.tsx -> features/letters/dev/fixtures.ts",
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

describe("devCodeInReleaseGraph", () => {
	it("flags app code importing src/dev/ or a feature's dev/ outside a __DEV__ guard", () => {
		const graph = graphOf({
			"app/(protected)/dev/index.tsx": [local("dev/dev-index-screen.tsx")],
			"features/settings/dev-row.tsx": [
				local("features/reach-me-on/dev/fixtures.ts"),
			],
		});
		expect(devCodeInReleaseGraph(graph)).toEqual([
			"app/(protected)/dev/index.tsx -> dev/dev-index-screen.tsx",
			"features/settings/dev-row.tsx -> features/reach-me-on/dev/fixtures.ts",
		]);
	});

	it("allows a require behind __DEV__, type-only imports, and dev code among itself", () => {
		const graph = graphOf({
			"app/(protected)/dev/[feature]/[state].tsx": [
				devRequire("dev/dev-state-screen.tsx"),
			],
			"dev/dev-state-screen.tsx": [local("dev/registry.ts")],
			"dev/registry.ts": [local("features/reach-me-on/dev/states.tsx")],
			"features/reach-me-on/dev/states.tsx": [
				local("dev/dev-state.ts", true),
				local("features/reach-me-on/dev/fixtures.ts"),
				local("features/reach-me-on/reach-sheet-data.tsx"),
			],
			"features/reach-me-on/reach-view.ts": [local("dev/dev-state.ts", true)],
		});
		expect(devCodeInReleaseGraph(graph)).toEqual([]);
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
			"lib/convex/use-stable-query.ts": [pkg("convex/react", ["useQuery"])],
		});
		expect(backendCallsOutsideDataHooks(graph)).toHaveLength(5);
	});

	it("flags any app file that reaches the backend, and a namespace import of heroui", () => {
		const graph = graphOf({
			"features/today/hero/hero.tsx": [
				local("lib/speech/use-voice-input.ts"),
				local("lib/talk-helper.ts"),
				pkg("heroui-native", ["*"]),
			],
			"lib/speech/use-voice-input.ts": [pkg("convex/react", ["useAction"])],
			"lib/talk-helper.ts": [local("lib/speech/use-voice-input.ts")],
		});
		expect(backendCallsOutsideDataHooks(graph)).toEqual([
			"features/today/hero/hero.tsx -> lib/speech/use-voice-input.ts",
			"features/today/hero/hero.tsx -> lib/talk-helper.ts",
			"features/today/hero/hero.tsx -> heroui-native",
		]);
	});

	it("flags the app's toast() outside use-*.ts, and allows it in one", () => {
		const graph = graphOf({
			"components/shared/toast.tsx": [pkg("heroui-native", ["Toast"])],
			"features/today/hero/hero.tsx": [local("components/shared/toast.tsx")],
			"features/today/use-today.ts": [local("components/shared/toast.tsx")],
		});
		expect(backendCallsOutsideDataHooks(graph)).toEqual([
			"features/today/hero/hero.tsx -> components/shared/toast.tsx",
		]);
	});

	it("allows the listed app-wide reads", () => {
		const graph = graphOf({
			"features/today/hero/hero.tsx": [
				local("lib/motion/use-effective-reduced-motion.ts"),
			],
			"lib/motion/use-effective-reduced-motion.ts": [
				pkg("convex/react", ["useQuery"]),
			],
		});
		expect(backendCallsOutsideDataHooks(graph)).toEqual([]);
	});

	it("allows data hooks, type-only imports, other heroui parts and old folders", () => {
		const graph = graphOf({
			"features/streak/streak-card.tsx": [pkg("convex/react", ["useQuery"])],
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

describe("crossFeatureImportsFromPorted", () => {
	it("flags a ported folder importing another ported feature, types included", () => {
		const graph = graphOf({
			"features/today/today-screen.tsx": [
				local("features/letters/letter-card.tsx"),
				local("features/you/you-model.ts", true),
			],
		});
		expect(crossFeatureImportsFromPorted(graph)).toEqual([
			"features/today/today-screen.tsx -> features/letters/letter-card.tsx",
			"features/today/today-screen.tsx -> features/you/you-model.ts",
		]);
	});

	it("treats a new folder as ported without a listing", () => {
		const graph = graphOf({
			"features/peers/peers-screen.tsx": [local("features/you/x.ts")],
		});
		expect(crossFeatureImportsFromPorted(graph)).toEqual([
			"features/peers/peers-screen.tsx -> features/you/x.ts",
		]);
	});

	it("leaves an import of an old folder to oldFolderImportsFromNewCode", () => {
		const graph = graphOf({
			"features/today/today-screen.tsx": [local("features/streak/x.ts")],
		});
		expect(crossFeatureImportsFromPorted(graph)).toEqual([]);
	});

	it("allows the shared modules, lower layers, old folders and the navigation hub", () => {
		const graph = graphOf({
			"features/navigation/root-screens.ts": [
				local("features/today/screens.ts"),
			],
			"features/quotes/quote-screen.tsx": [local("features/streak/x.ts")],
			"features/today/today-screen.tsx": [
				local("features/purchases/use-paywall.ts"),
				local("components/shared/app-text.tsx"),
			],
		});
		expect(crossFeatureImportsFromPorted(graph)).toEqual([]);
	});
});

describe("staleListings", () => {
	it("names listed folders that no longer exist", () => {
		expect(staleListings(["navigation", "streak"])).toContain("quotes");
		expect(staleListings(["navigation", "streak"])).not.toContain("streak");
	});
});

describe("portedFolderImportsFromOldCode", () => {
	it("flags an old folder importing a ported one, types included", () => {
		const graph = graphOf({
			"features/quotes/library-strip.tsx": [
				local("features/today/rail/rail.tsx"),
				local("features/letters/letter-model.ts", true),
			],
		});
		expect(portedFolderImportsFromOldCode(graph)).toEqual([
			"features/quotes/library-strip.tsx -> features/today/rail/rail.tsx",
			"features/quotes/library-strip.tsx -> features/letters/letter-model.ts",
		]);
	});

	it("allows old folders among themselves, the hub, purchases and routes", () => {
		const graph = graphOf({
			"app/(protected)/(tabs)/today/index.tsx": [
				local("features/today/today-screen.tsx"),
			],
			"features/quotes/library-strip.tsx": [
				local("features/browse/use-open-track.ts"),
				local("features/navigation/tabs.ts"),
				local("features/purchases/use-paywall.ts"),
			],
		});
		expect(portedFolderImportsFromOldCode(graph)).toEqual([]);
	});
});
