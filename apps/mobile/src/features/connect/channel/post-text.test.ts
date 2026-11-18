import { describe, expect, it } from "vitest";
import { plainText, postLinks, splitPost } from "./post-text";

describe("splitPost", () => {
	it("takes a short first paragraph over more as the title", () => {
		expect(
			splitPost(
				"A new Lantern hub is open\n\nEight short reads on sleep, written with people who've been up at 3am too."
			)
		).toEqual({
			body: "Eight short reads on sleep, written with people who've been up at 3am too.",
			title: "A new Lantern hub is open",
		});
	});

	it("leaves a one-paragraph post, or a long opening, all body", () => {
		expect(splitPost("Badges are here.")).toEqual({
			body: "Badges are here.",
			title: null,
		});
		const long = `${"x".repeat(81)}\n\nmore`;
		expect(splitPost(long).title).toBeNull();
		expect(splitPost("Two lines\nin one paragraph\n\nmore").title).toBeNull();
	});

	it("keeps a paragraph with a link in the body, where the link can be tapped", () => {
		for (const first of [
			"Read [the note](https://xolace.app/note)",
			"New at https://xolace.app/lantern",
		]) {
			expect(splitPost(`${first}\n\nmore`)).toEqual({
				body: `${first}\n\nmore`,
				title: null,
			});
		}
	});
});

describe("plainText", () => {
	it("reads the words, not the marks", () => {
		expect(plainText("a **b** __c__ ~~d~~ `e` *f* _g_ snake_case 2*3*4")).toBe(
			"a b c d e f g snake_case 2*3*4"
		);
	});

	it("drops a line's heading, quote and list marks", () => {
		expect(plainText("# Big news")).toBe("Big news");
		expect(plainText("###### Small print")).toBe("Small print");
		expect(plainText("> Said once\n> > said twice")).toBe(
			"Said once\nsaid twice"
		);
		expect(plainText("- one\n* two\n+ three\n1. four\n12. five")).toBe(
			"one\ntwo\nthree\nfour\nfive"
		);
		expect(plainText("#hashtag and 3 - 2")).toBe("#hashtag and 3 - 2");
	});

	it("keeps an image's words, not its mark", () => {
		expect(plainText("![a lantern at dusk](https://x.co/l.png)")).toBe(
			"a lantern at dusk"
		);
	});

	it("clears nested marks", () => {
		expect(plainText("***both*** and **bold _italic_** and ~~**gone**~~")).toBe(
			"both and bold italic and gone"
		);
	});

	it("keeps escaped marks as the characters they are", () => {
		expect(plainText("\\*not italic\\* and 2\\*3")).toBe(
			"*not italic* and 2*3"
		);
		expect(plainText("\\# not a heading")).toBe("# not a heading");
		expect(plainText("a \\\\ b")).toBe("a \\ b");
	});

	it("reads a link whose address has parentheses", () => {
		expect(
			plainText("[Foo](https://en.wikipedia.org/wiki/Foo_(bar)) here")
		).toBe("Foo here");
	});
});

describe("postLinks", () => {
	it("lists each link once, without the sentence's full stop", () => {
		expect(postLinks("See https://a.co/x. And https://a.co/x again")).toEqual([
			{ url: "https://a.co/x", words: "https://a.co/x" },
		]);
		expect(postLinks("No links here.")).toEqual([]);
	});

	it("keeps parentheses in an address, and leaves images out", () => {
		expect(
			postLinks(
				"[Foo](https://en.wikipedia.org/wiki/Foo_(bar)), https://en.wikipedia.org/wiki/Baz_(qux). ![pic](https://x.co/p.png)"
			)
		).toEqual([
			{ url: "https://en.wikipedia.org/wiki/Foo_(bar)", words: "Foo" },
			{
				url: "https://en.wikipedia.org/wiki/Baz_(qux)",
				words: "https://en.wikipedia.org/wiki/Baz_(qux)",
			},
		]);
	});
});
