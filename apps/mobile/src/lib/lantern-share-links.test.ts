import { describe, expect, it } from "vitest";
import { lanternShareUrl, lanternSystemPath } from "@/lib/lantern-share-links";

describe("lanternShareUrl", () => {
	it("links to the entry's page on the site, tagged as a share", () => {
		expect(lanternShareUrl("losing-my-dad")).toBe(
			"https://www.xolaceinc.com/lantern/losing-my-dad?from=share"
		);
	});

	it("keeps a stray character from breaking the path", () => {
		expect(lanternShareUrl("a b/c")).toBe(
			"https://www.xolaceinc.com/lantern/a%20b%2Fc?from=share"
		);
	});

	it("opens in the app as the reader route", () => {
		expect(lanternSystemPath(lanternShareUrl("losing-my-dad"))).toBe(
			"/library/losing-my-dad?from=share"
		);
	});
});

describe("lanternSystemPath", () => {
	it.each([
		[
			"https://www.xolaceinc.com/lantern/calm?from=share",
			"/library/calm?from=share",
		],
		[
			"https://xolaceinc.com/lantern/calm?from=share",
			"/library/calm?from=share",
		],
		["HTTPS://WWW.XOLACEINC.COM/lantern/calm/", "/library/calm?from=share"],
		["https://www.xolaceinc.com/lantern/calm#top", "/library/calm?from=share"],
		["xolace://lantern/calm?from=share", "/library/calm?from=share"],
		["/lantern/calm", "/library/calm?from=share"],
		["lantern/calm?utm=x", "/library/calm?utm=x&from=share"],
		["/lantern/calm?from=today", "/library/calm?from=today"],
	])("%s → %s", (input, expected) => {
		expect(lanternSystemPath(input)).toBe(expected);
	});

	it.each([
		"https://www.xolaceinc.com/",
		"https://www.xolaceinc.com/lantern",
		"https://www.xolaceinc.com/lantern/calm/extra",
		"https://evil.example/lantern/calm",
		"https://xolaceinc.com.evil.example/lantern/calm",
		"xolace://library/calm?from=share",
		"xolace://crisis-resources?from=telegram",
		"/explore/library/hub/calm",
	])("leaves %s alone", (input) => {
		expect(lanternSystemPath(input)).toBe(input);
	});
});
