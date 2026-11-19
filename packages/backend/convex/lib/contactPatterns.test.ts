import { describe, expect, it } from "vitest";
import { contactLeakIn, urlIn } from "./contactPatterns";

describe("contactLeakIn", () => {
	it.each([
		["a phone number", "call me on 0244 123 4567 any time"],
		["an international number", "my number is +233 (24) 412-3456"],
		["a handle", "find me @quiet.river if you want"],
		["an app name", "we could talk on WhatsApp instead"],
		["a short app name after my/on/via", "dm me on snap"],
		["an email", "write to me at someone.kind@example.co.uk"],
	])("finds %s", (_label, text) => {
		expect(contactLeakIn(text)).toBe(true);
	});

	it.each([
		["a year range", "the years 2019-2023 were the hardest of my life"],
		["a short number", "it took me 3 years and 200 tries"],
		["counting", "1 2 3 4 5 6 7 8 9 10 steps, then breathe"],
		["the word signal", "that was the signal I needed to rest"],
		["an @ inside a word", "meet me there@noon, I mean"],
		["a kind letter", "You are not alone. It gets lighter, slowly."],
	])("leaves %s", (_label, text) => {
		expect(contactLeakIn(text)).toBe(false);
	});
});

describe("urlIn", () => {
	it.each([
		["a scheme", "this helped me: https://example.org/help"],
		["www", "look up www.something.net"],
		["a bare domain", "go to calmplace.app tonight"],
	])("finds %s", (_label, text) => {
		expect(urlIn(text)).toBe(true);
	});

	it.each([
		["an abbreviation", "e.g. a walk, a nap, a cup of tea"],
		["a sentence break", "I tried.Then I tried again."],
		["a sentence break before Me", "she said.Me too, I said."],
		["a sentence break before Co", "I stayed home.Co workers called."],
		["a plain letter", "Some nights are long. This one will end."],
	])("leaves %s", (_label, text) => {
		expect(urlIn(text)).toBe(false);
	});
});
