/** Who may read the launch's shell (`shell.ts`). Its first read freezes it, so it must come
 * from inside `(protected)`, after sign-in, once PostHog has its flags; and a v2 feature
 * folder never reads it, since it only exists in the v2 shell. */
import { describe, expect, it } from "vitest";
import { buildGraph, relative } from "@/features/import-graph";

const SHELL = "lib/redesign/shell.ts";

/** Each allowed reader, with why it may read the shell. */
const READERS: readonly { match: RegExp; why: string }[] = [
	{
		match: /^app\/\(protected\)\//,
		why: "routes and layouts under (protected): its layout reads first",
	},
	{
		match: /^lib\/use-notifications\.ts$/,
		why: "the notification tap, subscribed by the (protected) layout",
	},
	{
		match: /^features\/settings\/components\/redesign-dev-row\.tsx$/,
		why: "the Dev tools row, under Account settings",
	},
];

describe("readers of the launch's shell", () => {
	const graph = buildGraph();
	const readers = [...graph]
		.filter(([, imports]) =>
			imports.some(
				(imp) => !imp.typeOnly && imp.targets.some((t) => relative(t) === SHELL)
			)
		)
		.map(([file]) => relative(file));

	it("sees the readers it is checking", () => {
		expect(readers).toContain("app/(protected)/_layout.tsx");
	});

	it("are only routes under (protected), the notification tap and the Dev tools row", () => {
		const others = readers.filter(
			(file) => !READERS.some(({ match }) => match.test(file))
		);
		expect(others).toEqual([]);
	});
});
