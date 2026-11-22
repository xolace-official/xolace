import { describe, expect, it } from "vitest";
import { resolveContent, toExercise } from "./catalogue";
import {
	LET_IT_LAND,
	MAKE_ROOM,
	REFLECT_SLOTS,
	RESET,
	SOFTEN_TOWARD_IT,
	SPEAK_TO_IT,
} from "./dev/fixtures";

const land = toExercise(LET_IT_LAND, REFLECT_SLOTS);

describe("toExercise", () => {
	it("fills the slots into the catalogue's copy", () => {
		expect(land.name).toBe("Let it land");
		expect(land.beats.map((b) => b.k)).toEqual([
			"text",
			"mirror",
			"breath",
			"text",
			"text",
		]);
		expect(land.beats[0]).toMatchObject({
			s: 4,
			t: "You named it. Let’s just sit with that for a moment.",
		});
		expect(land.beats[1]).toMatchObject({ s: 3, t: REFLECT_SLOTS.mirror_line });
		expect(land.beats[2]).toEqual({
			cyc: 2,
			k: "breath",
			pat: "sigh",
			t: "Breathe with it.",
		});
		expect(land.beats[3]).toMatchObject({
			t: "Notice where in your body “one step behind” lives right now. Not to fix it. Just so it knows you heard it.",
		});
	});

	it("falls back to the default copy, as a plain line, when a slot is missing (kindling)", () => {
		const kindling = toExercise(LET_IT_LAND, {});
		expect(kindling.beats[1]).toEqual({
			k: "text",
			s: 3,
			t: "What you named is here with you.",
		});
		expect(kindling.beats[3]).toMatchObject({
			t: "Notice where this lives in your body right now. Not to fix it. Just so it knows you heard it.",
		});
	});

	it("splits Make room's caption into one line per phase", () => {
		const room = toExercise(MAKE_ROOM, REFLECT_SLOTS);
		expect(room.beats.map((b) => b.k)).toEqual([
			"mirror",
			"text",
			"breath",
			"sync",
		]);
		expect(room.beats[2]).toMatchObject({
			cyc: 3,
			pat: "ext",
			t: [
				"Breathing in, imagine giving it room.",
				"Breathing out, rest beside it.",
			],
		});
		expect(room.beats[3]).toEqual({
			cyc: 1,
			k: "sync",
			pat: "slow",
			t: "It doesn’t have to leave to stop hurting.",
		});
	});

	it("plays the hand pulse with its line, for its seeded length", () => {
		const soften = toExercise(SOFTEN_TOWARD_IT, REFLECT_SLOTS);
		expect(soften.beats.at(-1)).toMatchObject({
			k: "text",
			t: "That was kind.",
		});
		expect(soften.beats[3]).toEqual({
			intensity: "medium",
			k: "haptic",
			s: 9,
			t: "Feel your hand resting there.",
		});
	});

	it("makes the private prompt's content the heading", () => {
		const speak = toExercise(SPEAK_TO_IT, REFLECT_SLOTS);
		expect(speak.beats.map((b) => b.k)).toEqual([
			"text",
			"text",
			"text",
			"prompt",
			"text",
		]);
		expect(speak.beats[3]).toEqual({
			k: "prompt",
			t: "What does it want you to know?",
		});
		expect(speak.beats[0]).toMatchObject({ t: "Something in you is tired." });
	});

	it("keeps an empty breath caption empty (Three breaths)", () => {
		expect(toExercise(RESET, {}).beats[1]).toMatchObject({
			cyc: 3,
			k: "breath",
			t: "",
		});
	});
});

describe("resolveContent", () => {
	it("uses the default when any slot is missing", () => {
		const step = {
			content: "{{a}} {{b}}",
			defaultContent: "fallback",
			order: 1,
			slotKeys: ["a", "b"],
			type: "text" as const,
		};
		expect(resolveContent(step, { a: "x" })).toBe("fallback");
		expect(resolveContent(step, { a: "x", b: "y" })).toBe("x y");
	});
});
