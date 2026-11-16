import { describe, expect, it } from "vitest";
import type { DevState } from "@/dev/dev-state";
import { devRegistry, findDevState } from "@/dev/registry";

const Screen = () => null;
const state = (id: string): DevState => ({ id, Screen, title: id });
const file = (path: string, ids: string[]) => ({
	exports: { devStates: ids.map(state) },
	path,
});
const ids = (files: Parameters<typeof devRegistry>[0]) =>
	devRegistry(files).features.map((f) => [
		f.feature,
		f.states.map((s) => s.id),
	]);

describe("devRegistry", () => {
	it("groups states by feature folder, nested dev/ included, sorted", () => {
		const { features, problems } = devRegistry([
			file("./reach-me-on/dev/states.tsx", ["not-linked", "needs-plus"]),
			file("./letters/write/dev/states.tsx", ["draft"]),
			file("./letters/read/dev/states.tsx", ["unread"]),
		]);
		expect(features.map((f) => [f.feature, f.states.map((s) => s.id)])).toEqual(
			[
				["letters", ["draft", "unread"]],
				["reach-me-on", ["not-linked", "needs-plus"]],
			]
		);
		expect(problems).toEqual([]);
	});

	it("leaves out a file that breaks the contract, names it and the fix, and keeps the rest", () => {
		const { problems } = devRegistry([
			file("./today/states.tsx", ["a"]),
			{ exports: { states: [] }, path: "./you/dev/states.tsx" },
			{
				exports: { devStates: [{ id: "a", title: "A" }] },
				path: "./explore/dev/states.tsx",
			},
		]);
		expect(problems).toEqual([
			{
				message: "dev states live in src/features/<feature>/dev/states.tsx",
				path: "./today/states.tsx",
			},
			{
				message:
					"export `devStates: readonly DevState[]` (src/dev/dev-state.ts)",
				path: "./you/dev/states.tsx",
			},
			{
				message:
					"export `devStates: readonly DevState[]` (src/dev/dev-state.ts)",
				path: "./explore/dev/states.tsx",
			},
		]);
		expect(
			ids([
				{ exports: {}, path: "./you/dev/states.tsx" },
				file("./today/dev/states.tsx", ["empty"]),
			])
		).toEqual([["today", ["empty"]]]);
	});

	it("leaves out an id that can't be a link segment", () => {
		const registry = devRegistry([
			file("./today/dev/states.tsx", ["Needs plus", "empty"]),
		]);
		expect(registry.problems).toEqual([
			{
				message: '"Needs plus" isn\'t a kebab-case id',
				path: "./today/dev/states.tsx",
			},
		]);
		expect(registry.features[0]?.states.map((s) => s.id)).toEqual(["empty"]);
	});

	it("keeps the first of an id used twice in one feature, across its dev/ folders too", () => {
		const registry = devRegistry([
			file("./letters/write/dev/states.tsx", ["empty"]),
			file("./letters/read/dev/states.tsx", ["empty"]),
		]);
		expect(registry.problems).toEqual([
			{
				message: 'letters already has "empty"',
				path: "./letters/read/dev/states.tsx",
			},
		]);
		expect(registry.features[0]?.states).toHaveLength(1);
	});
});

describe("findDevState", () => {
	const { features } = devRegistry([
		file("./reach-me-on/dev/states.tsx", ["linked"]),
	]);

	it("finds the state a link names", () => {
		expect(findDevState(features, "reach-me-on", "linked")?.id).toBe("linked");
	});

	it("is undefined for an unknown feature or state", () => {
		expect(findDevState(features, "today", "linked")).toBeUndefined();
		expect(findDevState(features, "reach-me-on", "paused")).toBeUndefined();
	});
});
