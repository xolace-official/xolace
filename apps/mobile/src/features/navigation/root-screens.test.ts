import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT_SCREENS } from "@/features/navigation/root-screens";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");

/** A stack entry names a route file (`quotes/index`) or a folder with its own layout. */
const routeExists = (name: string) =>
	existsSync(path.join(PROTECTED, `${name}.tsx`)) ||
	existsSync(path.join(PROTECTED, name, "_layout.tsx"));

describe("ROOT_SCREENS", () => {
	it("names only routes that exist under (protected)", () => {
		const missing = ROOT_SCREENS.map((s) => s.name).filter(
			(name) => !routeExists(name)
		);
		expect(missing).toEqual([]);
	});

	it("lists each route once, apart from the two the layout lists itself", () => {
		const names = ROOT_SCREENS.map((s) => s.name);
		const repeated = names.filter((name, i) => names.indexOf(name) !== i);
		expect(repeated).toEqual([]);
		expect(names).not.toContain("index");
		expect(names).not.toContain("(tabs)");
	});
});
