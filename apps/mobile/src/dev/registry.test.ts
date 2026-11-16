import { describe, expect, it } from "vitest";
import type { DevState } from "@/dev/dev-state";
import { devFeatures, findDevState } from "@/dev/registry";

const Screen = () => null;
const state = (id: string): DevState => ({ id, Screen, title: id });
const file = (path: string, ids: string[]) => ({
	exports: { devStates: ids.map(state) },
	path,
});

describe("devFeatures", () => {
	it("groups states by feature folder, nested dev/ included, sorted", () => {
		const features = devFeatures([
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
	});

	it("names the file and the fix when a file breaks the contract", () => {
		expect(() => devFeatures([file("./today/states.tsx", ["a"])])).toThrow(
			"./today/states.tsx: dev states live in src/features/<feature>/dev/states.tsx"
		);
		expect(() =>
			devFeatures([{ exports: { states: [] }, path: "./today/dev/states.tsx" }])
		).toThrow("export `devStates: readonly DevState[]`");
		expect(() =>
			devFeatures([
				{
					exports: { devStates: [{ id: "a", title: "A" }] },
					path: "./today/dev/states.tsx",
				},
			])
		).toThrow("export `devStates: readonly DevState[]`");
	});

	it("rejects an id that can't be a link segment", () => {
		expect(() =>
			devFeatures([file("./today/dev/states.tsx", ["Needs plus"])])
		).toThrow('"Needs plus" isn\'t a kebab-case id');
	});

	it("rejects an id used twice in one feature, across its dev/ folders too", () => {
		expect(() =>
			devFeatures([
				file("./letters/write/dev/states.tsx", ["empty"]),
				file("./letters/read/dev/states.tsx", ["empty"]),
			])
		).toThrow('./letters/read/dev/states.tsx: letters already has "empty"');
	});
});

describe("findDevState", () => {
	const features = devFeatures([
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
