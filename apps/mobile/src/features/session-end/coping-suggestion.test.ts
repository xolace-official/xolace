import { describe, expect, it } from "vitest";
import { copingSuggestion } from "./coping-suggestion";

describe("copingSuggestion", () => {
	it("sends someone who calms down to the soft sounds in Browse", () => {
		expect(copingSuggestion("calming_creative")).toEqual({
			family: "support",
			kind: "browse",
		});
	});

	it("sends someone who distracts themselves to music in Browse", () => {
		expect(copingSuggestion("distract")).toEqual({
			family: "music",
			kind: "browse",
		});
	});

	it("keeps Kindling for someone who leans on people", () => {
		expect(copingSuggestion("lean_on_people")).toEqual({ kind: "kindling" });
	});
});
