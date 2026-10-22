import { describe, expect, it } from "vitest";
import { joinDictation } from "@/src/features/reflect/hooks/dictation-transcript";

/** Continuous on-device dictation (#554): finals are new segments, never cumulative. */
describe("joinDictation", () => {
	it("shows the live segment alone before anything is final", () => {
		expect(joinDictation("", "sentence one")).toBe("sentence one");
	});

	it("appends the live segment after the finalised ones", () => {
		expect(joinDictation("Sentence one.", "sentence two")).toBe(
			"Sentence one. sentence two"
		);
	});

	it("does not double the space iOS 18 prepends to post-pause segments", () => {
		expect(joinDictation("Sentence one.", " Sentence two.")).toBe(
			"Sentence one. Sentence two."
		);
	});

	it("keeps the finalised text when the live segment is empty", () => {
		expect(joinDictation("Sentence one.", "")).toBe("Sentence one.");
	});
});
