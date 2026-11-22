import { describe, expect, it } from "vitest";
import { gleamRows } from "./gleam-rows";

describe("gleamRows", () => {
	it("starts each word a step after the last, across rows", () => {
		expect(gleamRows(["You showed up", "for yourself"], 100, 160)).toEqual([
			[
				{ last: false, start: 100, text: "You" },
				{ last: false, start: 260, text: "showed" },
				{ last: true, start: 420, text: "up" },
			],
			[
				{ last: false, start: 580, text: "for" },
				{ last: true, start: 740, text: "yourself" },
			],
		]);
	});

	it("makes no empty words from extra spaces, and keeps repeated words", () => {
		const [row] = gleamRows(["  it was  it was\tit  "], 0, 10);
		expect(row?.map((w) => w.text)).toEqual(["it", "was", "it", "was", "it"]);
		expect(row?.map((w) => w.start)).toEqual([0, 10, 20, 30, 40]);
	});
});
