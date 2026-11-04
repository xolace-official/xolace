import { describe, expect, it } from "vitest";
import {
	type IntakeV2Action,
	type IntakeV2State,
	initialIntakeV2State,
	intakeV2Reducer,
} from "@/features/intake/v2/machine";

const start = () => initialIntakeV2State("Camper 4127");

const run = (state: IntakeV2State, ...actions: IntakeV2Action[]) =>
	actions.reduce(intakeV2Reducer, state);

describe("ask", () => {
	it("opens on the question with the prefilled name", () => {
		expect(start()).toMatchObject({ name: "Camper 4127", step: "ask" });
	});

	it("goes to type from the composer", () => {
		expect(run(start(), { type: "START_TYPING" }).step).toBe("type");
	});

	it("reads a quick reply as the answer", () => {
		expect(
			run(start(), { text: "Work's been a lot", type: "QUICK_REPLY" })
		).toMatchObject({
			answer: "Work's been a lot",
			mode: "quick_reply",
			step: "interpret",
		});
	});

	it("skips straight to the name with nothing heard", () => {
		expect(run(start(), { type: "SKIP" })).toMatchObject({
			answer: "",
			heard: { weighingOn: [] },
			mode: "skipped",
			step: "name",
		});
	});

	it("ignores ask's actions once it has moved on", () => {
		const typing = run(start(), { type: "START_TYPING" });
		expect(run(typing, { type: "SKIP" })).toEqual(typing);
	});
});

describe("type", () => {
	const typing = () => run(start(), { type: "START_TYPING" });

	it("sends the trimmed words as a typed answer", () => {
		expect(
			run(
				typing(),
				{ text: "  I keep saying I'm fine  ", type: "DRAFT_CHANGE" },
				{ type: "SEND" }
			)
		).toMatchObject({
			answer: "I keep saying I'm fine",
			mode: "typed",
			step: "interpret",
		});
	});

	it("stays put on an empty send", () => {
		const blank = run(typing(), { text: "   ", type: "DRAFT_CHANGE" });
		expect(run(blank, { type: "SEND" })).toEqual(blank);
	});
});

const answered = () =>
	run(start(), { text: "I can't name it", type: "QUICK_REPLY" });

describe("interpret", () => {
	it("falls back to an empty pick-list when reading fails", () => {
		expect(run(answered(), { type: "READ_FAILED" })).toMatchObject({
			heard: { weighingOn: [] },
			read: "pick_list",
			step: "heard",
		});
	});
});

describe("heard", () => {
	const heard = () => run(answered(), { type: "READ_FAILED" });

	it("keeps what was picked on the way to the name", () => {
		expect(
			run(
				heard(),
				{ field: "weighingOn", type: "TOGGLE_CHIP", value: "work" },
				{ field: "intent", type: "TOGGLE_CHIP", value: "feel_less_alone" },
				{ type: "CONFIRM_HEARD" }
			)
		).toMatchObject({
			heard: { intent: "feel_less_alone", weighingOn: ["work"] },
			step: "name",
		});
	});

	it("says it again from an empty field, dropping what was heard", () => {
		expect(
			run(
				heard(),
				{ field: "weighingOn", type: "TOGGLE_CHIP", value: "work" },
				{ type: "SAY_AGAIN" }
			)
		).toMatchObject({
			draft: "",
			heard: { weighingOn: [] },
			read: null,
			step: "type",
		});
	});
});

describe("name", () => {
	const naming = () => run(start(), { type: "SKIP" });

	it("keeps the prefilled name", () => {
		expect(run(naming(), { type: "KEEP_NAME" })).toMatchObject({
			name: "Camper 4127",
			step: "done",
		});
	});

	it("holds an edit at 30 characters", () => {
		const long = "A".repeat(40);
		expect(
			run(naming(), { name: long, type: "NAME_CHANGE" }).name
		).toHaveLength(30);
	});

	it("takes a rerolled name", () => {
		expect(
			run(naming(), { name: "Quiet Ember", type: "NAME_CHANGE" }).name
		).toBe("Quiet Ember");
	});

	it("won't keep a blank name", () => {
		const blank = run(naming(), { name: "  ", type: "NAME_CHANGE" });
		expect(run(blank, { type: "KEEP_NAME" }).step).toBe("name");
	});

	it("keeps the name trimmed", () => {
		expect(
			run(
				naming(),
				{ name: "  Night Owl  ", type: "NAME_CHANGE" },
				{ type: "KEEP_NAME" }
			).name
		).toBe("Night Owl");
	});
});

describe("done", () => {
	it("goes back to the name when the save fails, keeping everything", () => {
		const done = run(
			answered(),
			{ type: "READ_FAILED" },
			{ field: "weighingOn", type: "TOGGLE_CHIP", value: "work" },
			{ type: "CONFIRM_HEARD" },
			{ type: "KEEP_NAME" }
		);
		expect(done.step).toBe("done");
		expect(run(done, { type: "COMPLETE_FAILED" })).toEqual({
			...done,
			step: "name",
		});
	});
});
