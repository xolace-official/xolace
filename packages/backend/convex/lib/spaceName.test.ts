import { describe, expect, it } from "vitest";
import { validateSpaceName } from "./spaceName";

// The space name is also the companion's name (#601): no AI products or
// providers, no clinician titles. People in their life are fine.
describe("validateSpaceName deny list", () => {
	it.each([
		"ChatGPT",
		"claude",
		"Gemini",
		"OpenAI",
		"Siri",
		"GPT4",
		"Claude-Juniper",
		"Therapist",
		"Dr-Maya",
		"DrJones",
		"Nurse",
		"counsellor",
	])("rejects %s", (name) => {
		expect(validateSpaceName(name).ok).toBe(false);
	});

	it.each([
		"Ember",
		"Juniper",
		"Mum",
		"Drew",
		"Therese",
		"Claudette",
		"Nana-Rose",
	])("allows %s", (name) => {
		expect(validateSpaceName(name)).toEqual({ ok: true, trimmed: name });
	});
});
