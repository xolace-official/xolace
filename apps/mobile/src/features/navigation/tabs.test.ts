import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	redirectedTabs,
	tabRedirect,
	V1_TABS,
	V2_TABS,
} from "@/features/navigation/tabs";

const SRC = path.resolve(import.meta.dirname, "../..");
const TABS_DIR = path.join(SRC, "app/(protected)/(tabs)");

/** Every tab route: a folder under `(tabs)/`. */
const tabFolders = readdirSync(TABS_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

const v2Names = V2_TABS.map((tab) => tab.name);

/** The triggers the old shell actually draws, read from its source. */
const appTabsTriggers = [
	...readFileSync(path.join(SRC, "components/app-tabs.tsx"), "utf8").matchAll(
		/<NativeTabs\.Trigger name="([^"]+)"/g
	),
].map((match) => match[1]);

describe("the tab routes", () => {
	it("match the old shell's triggers, in order", () => {
		expect(appTabsTriggers).toEqual([...V1_TABS]);
	});

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
		expect(shownIn("v1")).toEqual([...V1_TABS].sort());
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
				const target = String(tabRedirect(shell, `/${name}`)?.href);
				expect(tabRedirect(shell, target)).toBeNull();
			}
		}
	});
});

describe("tabRedirect", () => {
	// To another tab: replace inside the tabs. Out of them: go back to the route.
	it.each([
		["v2", "/discovery", "/today", "replace"],
		["v2", "/browse", "/explore", "replace"],
		["v2", "/browse/topic/sleep", "/explore", "replace"],
		["v1", "/explore", "/browse", "replace"],
		["v1", "/explore/topics", "/browse", "replace"],
		["v1", "/today", "/", "dismissTo"],
		["v1", "/you", "/profile", "dismissTo"],
	] as const)("in %s sends %s to %s by %s", (shell, pathname, href, method) => {
		expect(tabRedirect(shell, pathname)).toEqual({ href, method });
	});

	it.each([
		["v2", "/connect"],
		["v2", "/connect/archived"],
		["v2", "/today"],
		["v1", "/discovery"],
		["v1", "/browse/library"],
	] as const)("in %s leaves %s alone", (shell, pathname) => {
		expect(tabRedirect(shell, pathname)).toBeNull();
	});
});
