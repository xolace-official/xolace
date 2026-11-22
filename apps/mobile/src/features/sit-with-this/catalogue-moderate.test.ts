import { describe, expect, it } from "vitest";
import { toExercise } from "./catalogue";
import { COPY } from "./copy";
import { REFLECT_SLOTS } from "./dev/fixtures";
import {
	NAME_THE_ROOM,
	NOT_ONLY_YOU,
	PAUSE_BEFORE_ACTING,
	SLOW_IT_DOWN,
} from "./dev/fixtures-moderate";

const kinds = (e: typeof PAUSE_BEFORE_ACTING, slots = REFLECT_SLOTS) =>
	toExercise(e, slots).beats.map((b) => b.k);

describe("the four moderate-only exercises", () => {
	it("each has its own name", () => {
		for (const e of [
			PAUSE_BEFORE_ACTING,
			SLOW_IT_DOWN,
			NOT_ONLY_YOU,
			NAME_THE_ROOM,
		]) {
			expect(COPY.names[e.title], e.title).toBeDefined();
			expect(toExercise(e, {}).name).not.toBe(COPY.unnamed);
		}
	});

	it("Pause before you act shows the mirror and the emotion, then asks", () => {
		expect(kinds(PAUSE_BEFORE_ACTING)).toEqual([
			"text",
			"text",
			"breath",
			"mirror",
			"text",
			"breath",
			"prompt",
			"text",
		]);
		const beats = toExercise(PAUSE_BEFORE_ACTING, REFLECT_SLOTS).beats;
		expect(beats[4]).toMatchObject({
			t: "Notice it: something in you is tired, and wants to do something.",
		});
		expect(beats[5]).toMatchObject({
			t: ["Feel the pull.", "Don’t follow it yet."],
		});
	});

	it("plays its defaults with no slots", () => {
		const beats = toExercise(PAUSE_BEFORE_ACTING, {}).beats;
		expect(beats[3]).toMatchObject({
			k: "text",
			t: "Something just happened that matters to you.",
		});
		expect(beats[4]).toMatchObject({
			t: "Notice it: something in you wants to do something.",
		});
	});

	it("Slow it down only breathes and reads, with no hand pulse", () => {
		expect(kinds(SLOW_IT_DOWN)).toEqual([
			"text",
			"breath",
			"text",
			"breath",
			"sync",
			"text",
		]);
	});

	it("Not only you opens on the mirror", () => {
		expect(kinds(NOT_ONLY_YOU)[0]).toBe("mirror");
		expect(kinds(NOT_ONLY_YOU, {})[0]).toBe("text");
	});

	it("Name the room asks where you are, then breathes", () => {
		expect(kinds(NAME_THE_ROOM)).toEqual([
			"text",
			"text",
			"text",
			"text",
			"text",
			"prompt",
			"text",
			"breath",
		]);
	});
});
