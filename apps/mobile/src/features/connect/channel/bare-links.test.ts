import { describe, expect, it } from "vitest";
import { bareLinks } from "./bare-links";

describe("bareLinks", () => {
	it("finds web addresses with or without a scheme, and emails, in order", () => {
		expect(
			bareLinks(
				"Read xolace.app/lantern, write to hello@xolace.app, or see https://a.co/x."
			)
		).toEqual([
			{ url: "http://xolace.app/lantern", words: "xolace.app/lantern" },
			{ url: "mailto:hello@xolace.app", words: "hello@xolace.app" },
			{ url: "https://a.co/x", words: "https://a.co/x" },
		]);
	});

	it("doesn't find an email's domain or a web address's host twice", () => {
		expect(
			bareLinks("me@a.co and https://www.b.org/c").map((l) => l.url)
		).toEqual(["mailto:me@a.co", "https://www.b.org/c"]);
	});

	it("leaves file names, versions and words with dots alone", () => {
		expect(bareLinks("readme.md, Node.js, v1.2.3, e.g. this. End.")).toEqual(
			[]
		);
	});

	it("keeps parentheses in an address", () => {
		expect(bareLinks("en.wikipedia.org/wiki/Foo_(bar).")).toEqual([
			{
				url: "http://en.wikipedia.org/wiki/Foo_(bar)",
				words: "en.wikipedia.org/wiki/Foo_(bar)",
			},
		]);
	});
});
