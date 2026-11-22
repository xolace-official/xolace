import { describe, expect, it } from "vitest";
import type { Doc } from "./_generated/dataModel";
import { EXERCISES } from "./seed";

// Two runners read this catalogue: the redesigned Sit with this and the one in
// store builds from before it. Both draw their own "You stayed." close and
// render every line verbatim, so the copy has to arrive finished.

const MIN_HAND_PULSE_S = 6;
const STAYED = /you stayed\.?$/i;
const STRAIGHT_QUOTE = /['"]/;
// Copy never promises an outcome or tells someone to relax.
const PROMISES = /\b(relax\w*|relief|reliev\w*|calm\w*)\b/i;
const MODERATE_ONLY = [
	"pause_before_acting",
	"slow_it_down",
	"not_only_you",
	"name_the_room",
];

type Step = Doc<"exercises">["steps"][number] & { exercise: string };

const steps: Step[] = EXERCISES.flatMap((e) =>
	e.steps.map((s) => ({ ...s, exercise: e.title }))
);
const lines = steps.flatMap((s) =>
	[s.content, s.defaultContent, s.promptPlaceholder].filter(
		(line): line is string => line !== undefined
	)
);

describe("the exercise seed", () => {
	it("never ends on “You stayed.”: the close screen says it", () => {
		for (const e of EXERCISES) {
			const last = [...e.steps].sort((a, b) => a.order - b.order).at(-1);
			expect(last?.content, e.title).not.toMatch(STAYED);
		}
	});

	it("sets its own curly apostrophes and quotes", () => {
		for (const line of lines) {
			expect(line).not.toMatch(STRAIGHT_QUOTE);
		}
	});

	it("gives a hand pulse a line and time for two pulses", () => {
		const pulses = steps.filter((s) => s.type === "haptic");
		expect(pulses.length).toBeGreaterThan(0);
		for (const s of pulses) {
			expect(s.content, s.exercise).not.toBe("");
			expect(s.durationSeconds ?? 0, s.exercise).toBeGreaterThanOrEqual(
				MIN_HAND_PULSE_S
			);
		}
	});

	it("ends Three breaths on one sign-off before the close", () => {
		const reset = EXERCISES.find((e) => e.title === "reset");
		const last = [...(reset?.steps ?? [])]
			.sort((a, b) => a.order - b.order)
			.at(-1);
		expect(last?.content).toBe("That was enough.");
	});

	it("asks a private prompt's question in its content", () => {
		for (const s of steps.filter((x) => x.type === "private_prompt")) {
			expect(s.content, s.exercise).toMatch(/\?$/);
			expect(s.promptPlaceholder, s.exercise).toBeTruthy();
		}
	});

	it("gives every slotted line a plain default", () => {
		for (const s of steps.filter((x) => x.slotKeys?.length)) {
			expect(s.defaultContent, s.exercise).toBeTruthy();
			expect(s.defaultContent, s.exercise).not.toMatch(/\{\{/);
		}
	});

	it("never promises relief or calm, or tells anyone to relax", () => {
		for (const line of lines) {
			expect(line).not.toMatch(PROMISES);
		}
	});

	it("seeds the four for moderate moments, ending before intensity 8", () => {
		for (const title of MODERATE_ONLY) {
			const e = EXERCISES.find((x) => x.title === title);
			expect(e, title).toBeDefined();
			expect(e?.intensityRange.max, title).toBeLessThan(8);
		}
	});

	it("never says “everyone” in Not only you", () => {
		const notOnlyYou = steps.filter((s) => s.exercise === "not_only_you");
		for (const s of notOnlyYou) {
			expect(`${s.content} ${s.defaultContent ?? ""}`).not.toMatch(
				/\beveryone\b/i
			);
		}
	});

	it("never asks for a held breath in Slow it down", () => {
		const slow = steps.filter((s) => s.exercise === "slow_it_down");
		for (const s of slow) {
			expect(s.content).not.toMatch(/\bhold/i);
			if (s.breathPattern !== undefined) {
				expect(["slow_exhale", "extended_exhale"]).toContain(s.breathPattern);
			}
		}
	});

	it("splits a two-line breath caption on one newline, in then out", () => {
		for (const s of steps.filter((x) => x.content.includes("\n"))) {
			expect(s.type, s.exercise).toBe("breath");
			expect(s.content.split("\n"), s.exercise).toHaveLength(2);
		}
	});
});
