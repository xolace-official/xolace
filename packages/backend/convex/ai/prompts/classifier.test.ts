import { describe, expect, it } from "vitest";
import { entryForAi } from "./accumulatedInput";
import { buildClassifierPrompt } from "./classifier";

/** B10: the classifier reads the feeling words people pick, with their writing. */
const classify = (entryType: string, rawInput: string, textures?: string[]) =>
	buildClassifierPrompt(
		entryForAi({ entryType, rawInput, textures }),
		"",
		false,
		entryType,
		undefined,
		textures
	).user;

const BOTH_NOTE = "Feeling words were also picked alongside it";

describe("classifier — picked feeling words (B10)", () => {
	it("typed only: the text as before, no words note", () => {
		const user = classify("open_prompt", "work again, all week");
		expect(user).toContain("[Free text input]");
		expect(user).toContain("---\nwork again, all week\n---");
		expect(user).not.toContain(BOTH_NOTE);
	});

	it("words only: framed as tapped words, labelled as only picked", () => {
		const user = classify("word_cloud", "heavy, restless", [
			"heavy",
			"restless",
		]);
		expect(user).toContain("[Texture words — tapped, not typed.");
		expect(user).toContain("they only picked feeling words");
		expect(user).not.toContain(BOTH_NOTE);
	});

	it("both: their writing and the words, labelled, read together", () => {
		const user = classify("guided_entry", "work again, all week", [
			"heavy",
			"restless",
		]);
		expect(user).toContain(BOTH_NOTE);
		expect(user).toContain(
			"What they wrote:\nwork again, all week\n\nFeeling words they picked: heavy, restless"
		);
	});
});
