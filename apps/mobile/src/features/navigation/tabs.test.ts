import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	redirectedTabs,
	tabRedirect,
	V2_TABS,
} from "@/features/navigation/tabs";

const TABS_DIR = path.resolve(
	import.meta.dirname,
	"../../app/(protected)/(tabs)"
);

/** Every tab route: a folder under `(tabs)/` with its own stack. */
const tabFolders = readdirSync(TABS_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

/** The old shell's triggers, in `components/app-tabs.tsx`; it doesn't change until C3. */
const V1_TABS = ["browse", "connect", "discovery"];
const v2Names = V2_TABS.map((tab) => tab.name);

describe("the tab routes", () => {
	it("are folders with a stack of their own", () => {
		const missing = tabFolders.filter(
			(name) => !existsSync(path.join(TABS_DIR, name, "_layout.tsx"))
		);
		expect(tabFolders).toEqual(
			expect.arrayContaining([...V1_TABS, ...v2Names])
		);
		expect(missing).toEqual([]);
	});

	it("are each shown or sent elsewhere in both shells", () => {
		const shownIn = (shell: "v1" | "v2") =>
			tabFolders.filter((name) => !redirectedTabs(shell).includes(name));
		expect(shownIn("v1")).toEqual(V1_TABS);
		expect(shownIn("v2")).toEqual([...v2Names].sort());
	});

	it("never send a shell's own tab elsewhere", () => {
		expect(V1_TABS.map((name) => tabRedirect("v1", `/${name}`))).toEqual(
			V1_TABS.map(() => null)
		);
		expect(v2Names.map((name) => tabRedirect("v2", `/${name}`))).toEqual(
			v2Names.map(() => null)
		);
	});

	it("land somewhere the shell keeps", () => {
		for (const shell of ["v1", "v2"] as const) {
			for (const name of redirectedTabs(shell)) {
				const target = String(tabRedirect(shell, `/${name}`));
				expect(tabRedirect(shell, target)).toBeNull();
			}
		}
	});
});

describe("tabRedirect", () => {
	it.each([
		["v2", "/discovery", "/today"],
		["v2", "/browse", "/explore"],
		["v2", "/browse/topic/sleep", "/explore"],
		["v2", "/connect", null],
		["v2", "/connect/archived", null],
		["v2", "/today", null],
		["v1", "/you", "/profile"],
		["v1", "/today", "/"],
		["v1", "/explore", "/browse"],
		["v1", "/discovery", null],
		["v1", "/browse/library", null],
	] as const)("in %s sends %s to %s", (shell, pathname, target) => {
		expect(tabRedirect(shell, pathname)).toBe(target);
	});
});
