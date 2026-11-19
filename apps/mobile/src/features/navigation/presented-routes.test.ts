import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	isPresentedRoute,
	NATIVE_PRESENTATIONS,
	NESTED_SHEETS,
	PRESENTED_ROUTES,
	routeMatches,
} from "@/features/navigation/presented-routes";

const PROTECTED = path.resolve(import.meta.dirname, "../../app/(protected)");

describe("isPresentedRoute", () => {
	it.each([
		"/steadiness-face-info",
		"/reader-appearance",
		"/xolacer-edit",
		"/settings/reach",
		"/check-in",
		"/welcome-back",
		"/talk-kept",
		"/talk-style",
		"/session-follow-up",
	])("knows %s is presented over the app", (pathname) => {
		expect(isPresentedRoute(pathname)).toBe(true);
	});

	it.each([
		"/",
		"/achievements",
		"/today",
		"/settings/notifications",
		"/library/a-piece",
	])("leaves %s, a pushed screen, alone", (pathname) => {
		expect(isPresentedRoute(pathname)).toBe(false);
	});

	it("reads presentation from each root screen's options, not a list", () => {
		expect(PRESENTED_ROUTES).toContain("steadiness-face-info");
		expect(PRESENTED_ROUTES).not.toContain("kindling/index");
	});
});

/** Every nested `_layout.tsx` under `(protected)`, as [its folder, its source]. */
function nestedLayouts(dir = PROTECTED, folder = ""): [string, string][] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		if (!entry.isDirectory()) {
			return [];
		}
		const sub = path.join(dir, entry.name);
		const name = folder ? `${folder}/${entry.name}` : entry.name;
		const layout = path.join(sub, "_layout.tsx");
		const own: [string, string][] = existsSync(layout)
			? [[name, readFileSync(layout, "utf8")]]
			: [];
		return [...own, ...nestedLayouts(sub, name)];
	});
}

const OPTIONS_CONST = /const (\w+)\s*=\s*\{([^}]*)\}/g;
const PRESENTATION = /presentation:\s*"(\w+)"/;
const SCREEN = /<Stack\.Screen\s+name="([^"]+)"\s+options=\{(\{[^}]*\}|\w+)\}/g;

/** The routes a nested layout presents natively, read from its `Stack.Screen` options. */
function presentedIn(folder: string, source: string): string[] {
	const native = (body: string) => {
		const kind = PRESENTATION.exec(body)?.[1];
		return kind !== undefined && NATIVE_PRESENTATIONS.has(kind);
	};
	const consts = new Map(
		[...source.matchAll(OPTIONS_CONST)].map(([, name, body]) => [name, body])
	);
	return [...source.matchAll(SCREEN)].flatMap(([, screen, options = ""]) => {
		const body = options.startsWith("{")
			? options
			: (consts.get(options) ?? "");
		// Route groups like `(tabs)` aren't part of the path.
		const route = `${folder}/${screen}`.replace(/\([^)]+\)\//g, "");
		return native(body) ? [route] : [];
	});
}

describe("NESTED_SHEETS", () => {
	it.each(NESTED_SHEETS)("%s is a route", (name) => {
		expect(existsSync(path.join(PROTECTED, `${name}.tsx`))).toBe(true);
	});

	it("lists every sheet a nested layout presents, so none slips past the arrival's gate", () => {
		const found = nestedLayouts().flatMap(([folder, source]) =>
			presentedIn(folder, source)
		);
		expect(found).toContain("settings/reach");
		expect(
			found.filter((route) => !NESTED_SHEETS.includes(route as never))
		).toEqual([]);
	});
});

describe("routeMatches", () => {
	it("matches params, index routes and catch-alls", () => {
		expect(routeMatches("chat/[conversationId]", "/chat/abc")).toBe(true);
		expect(routeMatches("chat/[conversationId]", "/chat")).toBe(false);
		expect(routeMatches("kindling/index", "/kindling")).toBe(true);
		expect(routeMatches("browse/[...rest]", "/browse/topic/sleep")).toBe(true);
		expect(routeMatches("talk", "/talk/more")).toBe(false);
	});
});
