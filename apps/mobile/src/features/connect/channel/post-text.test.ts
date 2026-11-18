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
});

describe("plainText", () => {
	it("reads the words, not the marks", () => {
		expect(plainText("a **b** __c__ ~~d~~ `e` *f* _g_ snake_case 2*3*4")).toBe(
			"a b c d e f g snake_case 2*3*4"
		);
	});
});

describe("postLinks", () => {
	it("lists each link once, without the sentence's full stop", () => {
		expect(postLinks("See https://a.co/x. And https://a.co/x again")).toEqual([
			"https://a.co/x",
		]);
		expect(postLinks("No links here.")).toEqual([]);
	});
});
