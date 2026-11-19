import { describe, expect, it } from "vitest";
import { buildLetterCheckPrompt, parseLetterCheckResponse } from "./check";

const FLAGS_OFF = {
	contact: false,
	forced_positivity: false,
	graphic: false,
	identifying: false,
	link: false,
	medical: false,
	minimising: false,
	off_topic: false,
	preaching: false,
	selling: false,
};

describe("parseLetterCheckResponse", () => {
	it("reads a clean, fenced verdict", () => {
		expect(
			parseLetterCheckResponse(
				`\`\`\`json\n${JSON.stringify({ ...FLAGS_OFF, confidence: 0.92, hostile: false, language: "en" })}\n\`\`\``
			)
		).toEqual({
			confidence: 0.92,
			fixable: null,
			hostile: false,
			language: "en",
		});
	});

	it("picks the first fixable category in precedence order", () => {
		const verdict = parseLetterCheckResponse(
			JSON.stringify({
				...FLAGS_OFF,
				confidence: 0.8,
				hostile: false,
				language: "en",
				medical: true,
				off_topic: true,
				selling: true,
			})
		);
		expect(verdict?.fixable).toBe("selling");
	});

	it("reads a missing flag as false", () => {
		expect(
			parseLetterCheckResponse(
				'{"hostile":true,"language":"EN","confidence":2}'
			)
		).toEqual({ confidence: 1, fixable: null, hostile: true, language: "en" });
	});

	it("an odd language reads as unknown", () => {
		expect(
			parseLetterCheckResponse(
				'{"hostile":false,"language":"English","confidence":0.5}'
			)?.language
		).toBe("und");
	});

	it.each([
		["prose", "I can't classify this letter."],
		["broken JSON", '{"hostile": false,'],
		["no hostile answer", '{"language":"en","confidence":0.9}'],
		["a non-boolean hostile", '{"hostile":"no","language":"en"}'],
	])("is null for %s, never a pass", (_label, raw) => {
		expect(parseLetterCheckResponse(raw)).toBeNull();
	});
});

describe("buildLetterCheckPrompt", () => {
	it("wraps the letter and asks for every category by name", () => {
		const { system, user } = buildLetterCheckPrompt("You are not alone.");
		expect(user).toBe("<letter>\nYou are not alone.\n</letter>");
		for (const key of Object.keys(FLAGS_OFF)) {
			expect(system).toContain(`"${key}": boolean`);
		}
	});
});
