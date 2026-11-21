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

	it("leaves versions and words with dots alone", () => {
		expect(bareLinks("Node.js, v1.2.3, e.g. this. End.")).toEqual([]);
	});

	it("links a file name on a real top-level domain, as Stream's tap does", () => {
		expect(bareLinks("See readme.md")).toEqual([
			{ url: "http://readme.md", words: "readme.md" },
		]);
	});

	it("finds an address on any top-level domain, as Stream does", () => {
		expect(bareLinks("The studio moved to xolace.studio/camp.")).toEqual([
			{ url: "http://xolace.studio/camp", words: "xolace.studio/camp" },
		]);
	});

	it("leaves a name before an email alone, as Stream does", () => {
		expect(bareLinks("Thanks @sam.k@xolace.app")).toEqual([]);
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
