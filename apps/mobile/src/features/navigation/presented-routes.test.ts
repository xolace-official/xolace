import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	isPresentedRoute,
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
		"/intake-plus-preview",
		"/settings/reach",
		"/follow-up",
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

describe("NESTED_SHEETS", () => {
	it.each(NESTED_SHEETS)("%s is a route", (name) => {
		expect(existsSync(path.join(PROTECTED, `${name}.tsx`))).toBe(true);
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
