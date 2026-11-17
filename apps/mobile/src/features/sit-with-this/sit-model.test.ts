import { describe, expect, it } from "vitest";
import {
	LET_IT_LAND,
	MAKE_ROOM,
	REFLECT_SLOTS,
	RESET,
	SOFTEN_TOWARD_IT,
	SPEAK_TO_IT,
} from "./dev/fixtures";
import {
	arcSize,
	canSwap,
	closeLabel,
	durOf,
	lengthLabel,
	resolveContent,
	shortLength,
	swapChoices,
	threadWeights,
	toExercise,
	typeset,
} from "./sit-model";

const land = toExercise(LET_IT_LAND, REFLECT_SLOTS);

describe("toExercise", () => {
	it("fills the slots and typesets the catalogue's quotes", () => {
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

	it("splits Make room's caption into one line per phase and drops the repeated “You stayed.”", () => {
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
				"Breathing in; imagine giving it room.",
				"Breathing out; rest beside it.",
			],
		});
		expect(room.beats[3]).toEqual({
			cyc: 1,
			k: "sync",
			pat: "slow",
			t: "It doesn’t have to leave to stop hurting.",
		});
	});

	it("keeps “That was kind.” and says the hand pulse for two pulses", () => {
		const soften = toExercise(SOFTEN_TOWARD_IT, REFLECT_SLOTS);
		expect(soften.beats.at(-1)).toMatchObject({
			k: "text",
			t: "That was kind.",
		});
		expect(soften.beats[3]).toEqual({
			intensity: "medium",
			k: "haptic",
			s: 6,
			t: "Feel your hand resting there.",
		});
	});

	it("makes the private prompt's question the heading", () => {
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

describe("resolveContent and typeset", () => {
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

	it("curls apostrophes and quoted phrases", () => {
		expect(typeset("You don't — 'one step' here")).toBe(
			"You don’t — “one step” here"
		);
	});
});

describe("durations", () => {
	it("writes a line in first, then holds it at least the catalogue's time", () => {
		// 11 words: (11 − 1)·120 + 700 = 1900, then max(4000, 1200 + 11·320) = 4720.
		expect(durOf(land.beats[0])).toBe(1900 + 4720);
	});

	it("breathes for whole cycles, and a prompt waits", () => {
		expect(durOf(land.beats[2])).toBe(2 * 13_000);
		expect(durOf({ k: "prompt", t: "?" })).toBe(Number.POSITIVE_INFINITY);
	});

	it("counts a prompt as 10 s on the thread", () => {
		const speak = toExercise(SPEAK_TO_IT, REFLECT_SLOTS);
		expect(threadWeights(speak.beats)[3]).toBe(10);
	});

	it("says each exercise's real length", () => {
		expect(lengthLabel(land)).toBe("About a minute. Stay with it.");
		expect(lengthLabel(toExercise(SPEAK_TO_IT, REFLECT_SLOTS))).toBe(
			"About 45 seconds. Stay with it."
		);
		expect(shortLength(toExercise(RESET, {}))).toBe("about a minute");
	});
});

describe("the screen around the beats", () => {
	it("sizes the arcs by beat", () => {
		expect(arcSize("pre", "breath")).toBe("small");
		expect(arcSize("play", "mirror")).toBe("small");
		expect(arcSize("play", "sync")).toBe("full");
		expect(arcSize("play", "haptic")).toBe("mid");
		expect(arcSize("play", "prompt")).toBe("gone");
		expect(arcSize("close", "prompt")).toBe("full");
	});

	it("labels close by where Sit came from", () => {
		expect(closeLabel("kindling", "pre")).toBe("Back to your kindling");
		expect(closeLabel("kindling", "play")).toBe("Leave Sit with this");
		expect(closeLabel("reflect", "pre")).toBe("Leave Sit with this");
	});

	it("offers “Something different” only within a reflection, twice at most", () => {
		const base = {
			from: "reflect",
			kind: "text",
			linkOn: true,
			sheetOpen: false,
			stage: "play",
			swaps: 0,
		} as const;
		expect(canSwap(base)).toBe(true);
		expect(canSwap({ ...base, linkOn: false })).toBe(false);
		expect(canSwap({ ...base, linkOn: false, stage: "pre" })).toBe(true);
		expect(canSwap({ ...base, from: "kindling" })).toBe(false);
		expect(canSwap({ ...base, swaps: 2 })).toBe(false);
		expect(canSwap({ ...base, kind: "prompt" })).toBe(false);
		expect(canSwap({ ...base, sheetOpen: true })).toBe(false);
		expect(canSwap({ ...base, stage: "close" })).toBe(false);
	});

	it("hides “Try something simpler” while Three breaths is playing", () => {
		const reset = toExercise(RESET, {});
		const room = toExercise(MAKE_ROOM, {});
		expect(
			swapChoices({ nextBest: room, reset }, "let_it_land").map((c) => c.title)
		).toEqual(["Try something simpler", "Try something else"]);
		expect(swapChoices({ nextBest: room, reset }, "reset")).toEqual([
			{
				id: room.key,
				sub: "Make room · about a minute",
				title: "Try something else",
			},
		]);
		expect(swapChoices({ nextBest: null, reset: null }, "x")).toEqual([]);
	});
});
