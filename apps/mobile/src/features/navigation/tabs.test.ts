import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { movedPath, movedRoots, TABS } from "@/features/navigation/tabs";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");
const TABS_DIR = path.join(PROTECTED, "(tabs)");

/** Every tab route: a folder under `(tabs)/`. */
const tabFolders = readdirSync(TABS_DIR, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();

const tabNames = TABS.map((tab) => tab.name);

describe("TABS", () => {
	it("is Today · Explore · Connect · You", () => {
		expect(tabNames).toEqual(["today", "explore", "connect", "you"]);
	});

	it("draws every tab folder, and each has a stack of its own", () => {
		expect(tabFolders).toEqual([...tabNames].sort());
		const missing = tabNames.filter(
			(name) => !existsSync(path.join(TABS_DIR, name, "_layout.tsx"))
		);
		expect(missing).toEqual([]);
	});
});

describe("moved paths", () => {
	it("each keep a route that sends them on, outside the tabs", () => {
		const missing = movedRoots().filter(
			(root) =>
				!(
					existsSync(path.join(PROTECTED, `${root}.tsx`)) ||
					existsSync(path.join(PROTECTED, root, "index.tsx"))
				)
		);
		expect(missing).toEqual([]);
	});

	it("never land on another moved path, or on a tab that isn't there", () => {
		for (const root of movedRoots()) {
			const to = movedPath(`/${root}`);
			expect(to && movedPath(to)).toBeNull();
			expect(tabNames).toContain(to?.split("/")[1]);
		}
	});

	it.each([
		["/discovery", "/today"],
		["/browse", "/explore"],
		["/browse/topics", "/explore/topics"],
		["/browse/topic/sleep", "/explore/topic/sleep"],
		["/browse/library/hub/grief", "/explore/library/hub/grief"],
		["/profile", "/you"],
	])("sends %s to %s", (from, to) => {
		expect(movedPath(from)).toBe(to);
	});

	it.each([
		"/profile/insights",
		"/today",
		"/explore/topics",
		"/connect",
		"/browse-player",
		"/",
	])("leaves %s where it is", (pathname) => {
		expect(movedPath(pathname)).toBeNull();
	});
});
