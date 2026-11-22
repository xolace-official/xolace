import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { TABS } from "@/features/navigation/tabs";

const TABS_DIR = path.resolve(
	import.meta.dirname,
	"../../app/(protected)/(tabs)"
);

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
