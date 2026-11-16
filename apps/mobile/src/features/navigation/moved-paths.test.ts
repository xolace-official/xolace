import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { movedPath, movedRoots } from "@/features/navigation/moved-paths";
import { navigationScreens } from "@/features/navigation/screens";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");

const exists = (route: string) =>
	existsSync(path.join(PROTECTED, `${route}.tsx`));

/** The route file a path opens: a root screen, or a tab under `(tabs)/`. */
const isRoute = (pathname: string) => {
	const route = pathname.slice(1);
	return [
		route,
		`${route}/index`,
		`(tabs)/${route}`,
		`(tabs)/${route}/index`,
	].some(exists);
};

/** The shim routes a moved root keeps: the path itself, and a catch-all for its subpaths. */
const shimsOf = (root: string) =>
	[root, `${root}/index`, `${root}/[...rest]`].filter(exists);

describe("MOVED", () => {
	it("keeps a shim at each old path, and a catch-all only where its subpaths moved", () => {
		for (const { root, subtree } of movedRoots()) {
			expect(exists(root) || exists(`${root}/index`), root).toBe(true);
			expect(exists(`${root}/[...rest]`), `${root}/[...rest]`).toBe(subtree);
		}
	});

	it("lists every shim in screens.ts, with no animation of its own", () => {
		const listed = new Map(
			navigationScreens.map((screen) => [screen.name, screen.options])
		);
		for (const { root } of movedRoots()) {
			for (const shim of shimsOf(root)) {
				expect(listed.get(shim), shim).toEqual({ animation: "none" });
			}
		}
	});

	it("sends each old path to a real route, never to another moved one", () => {
		for (const { root } of movedRoots()) {
			const to = movedPath(`/${root}`);
			expect(to && isRoute(to), `/${root} -> ${to}`).toBe(true);
			expect(to && movedPath(to)).toBeNull();
		}
	});
});

describe("movedPath", () => {
	it.each([
		["/discovery", "/today"],
		["/browse", "/explore"],
		["/browse/topics", "/explore/topics"],
		["/browse/topic/sleep", "/explore/topic/sleep"],
		["/browse/library/hub/grief", "/explore/library/hub/grief"],
		["/profile", "/you"],
		["/kindling-announcement", "/session-end"],
	])("sends %s to %s", (from, to) => {
		expect(movedPath(from)).toBe(to);
	});

	it.each([
		"/profile/insights",
		"/discovery/anything",
		"/today",
		"/explore/topics",
		"/connect",
		"/browse-player",
		"/",
	])("leaves %s where it is", (pathname) => {
		expect(movedPath(pathname)).toBeNull();
	});
});
