import { describe, expect, it } from "vitest";
import { COPY } from "../copy";
import { nextText } from "./next-text";

describe("nextText", () => {
	it("gives both letter cards their own title and sub", () => {
		expect(nextText("letterRead", null)).toEqual(COPY.next.letterRead);
		expect(nextText("letterWrite", null)).toEqual(COPY.next.letterWrite);
		expect(COPY.next.letterRead.title).not.toBe(COPY.next.letterWrite.title);
	});
});
