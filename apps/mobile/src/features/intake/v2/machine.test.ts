import { describe, expect, it } from "vitest";
import type { Reading } from "@/features/intake/v2/heard";
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

describe("listen", () => {
	it("opens from the mic in ask", () => {
		expect(run(start(), { type: "START_LISTENING" }).step).toBe("listen");
	});

	it("reads what was said as a voice answer once stopped", () => {
		expect(
			run(
				start(),
				{ type: "START_LISTENING" },
				{ transcript: "  work won't leave my head  ", type: "LISTEN_DONE" }
			)
		).toMatchObject({
			answer: "work won't leave my head",
			mode: "voice",
			step: "interpret",
		});
	});

	it("offers typing when nothing was heard", () => {
		expect(
			run(
				start(),
				{ type: "START_LISTENING" },
				{ transcript: "  ", type: "LISTEN_DONE" }
			)
		).toMatchObject({
			answer: "",
			listenFailed: "nothing_heard",
			mode: null,
			step: "type",
		});
	});

	it("drops into typing on a denied mic, keeping what was typed", () => {
		expect(
			run(
				start(),
				{ type: "START_TYPING" },
				{ text: "half a thought", type: "DRAFT_CHANGE" },
				{ type: "START_LISTENING" },
				{ reason: "denied", type: "MIC_UNAVAILABLE" }
			)
		).toMatchObject({
			draft: "half a thought",
			listenFailed: "denied",
			step: "type",
		});
	});

	it("won't open again once the mic is off", () => {
		const off = run(
			start(),
			{ type: "START_LISTENING" },
			{ reason: "unavailable", type: "MIC_UNAVAILABLE" }
		);
		expect(run(off, { type: "START_LISTENING" })).toEqual(off);
	});

	it("says it again by talking, and the new take replaces the answer", () => {
		const again = run(
			start(),
			{ type: "START_LISTENING" },
			{ transcript: "rushed first try", type: "LISTEN_DONE" },
			{ type: "READ_FAILED" },
			{ field: "weighingOn", type: "TOGGLE_CHIP", value: "work" },
			{ type: "SAY_AGAIN" }
		);
		expect(again).toMatchObject({
			heard: { weighingOn: [] },
			read: null,
			step: "listen",
		});
		expect(
			run(again, { transcript: "what I meant", type: "LISTEN_DONE" })
		).toMatchObject({ answer: "what I meant", step: "interpret" });
	});

	it("can try again after hearing nothing, dropping the old note", () => {
		expect(
			run(
				start(),
				{ type: "START_LISTENING" },
				{ transcript: "", type: "LISTEN_DONE" },
				{ type: "START_LISTENING" }
			)
		).toMatchObject({ listenFailed: null, step: "listen" });
	});

	it("holds a long take to a typed answer's length", () => {
		expect(
			run(
				start(),
				{ type: "START_LISTENING" },
				{ transcript: "a".repeat(1500), type: "LISTEN_DONE" }
			).answer
		).toHaveLength(1000);
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

	it("keeps the prefilled name and goes on to Xolace+", () => {
		expect(run(naming(), { entitled: false, type: "KEEP_NAME" })).toMatchObject(
			{
				name: "Camper 4127",
				step: "plus",
			}
		);
	});

	it("skips Xolace+ for someone who already has it", () => {
		expect(run(naming(), { entitled: true, type: "KEEP_NAME" })).toMatchObject({
			plusOutcome: "entitled",
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
		expect(run(blank, { entitled: false, type: "KEEP_NAME" }).step).toBe(
			"name"
		);
	});

	it("keeps the name trimmed", () => {
		expect(
			run(
				naming(),
				{ name: "  Night Owl  ", type: "NAME_CHANGE" },
				{ entitled: false, type: "KEEP_NAME" }
			).name
		).toBe("Night Owl");
	});
});

describe("plus", () => {
	const atPlus = () =>
		run(start(), { type: "SKIP" }, { entitled: false, type: "KEEP_NAME" });

	it("completes the intake after a purchase", () => {
		expect(
			run(atPlus(), { outcome: "purchased", type: "PLUS_EXIT" })
		).toMatchObject({ plusOutcome: "purchased", step: "done" });
	});

	it("completes the intake on Continue free", () => {
		expect(
			run(atPlus(), { outcome: "dismissed", type: "PLUS_EXIT" })
		).toMatchObject({ plusOutcome: "dismissed", step: "done" });
	});

	it("steps aside when Xolace+ turns out to be owned already", () => {
		expect(
			run(atPlus(), { outcome: "entitled", type: "PLUS_EXIT" })
		).toMatchObject({ plusOutcome: "entitled", step: "done" });
	});

	it("ignores an exit from anywhere but plus", () => {
		const naming = run(start(), { type: "SKIP" });
		expect(run(naming, { outcome: "dismissed", type: "PLUS_EXIT" })).toEqual(
			naming
		);
	});
});

describe("done", () => {
	it("goes back to the name when the save fails, keeping everything", () => {
		const done = run(
			answered(),
			{ type: "READ_FAILED" },
			{ field: "weighingOn", type: "TOGGLE_CHIP", value: "work" },
			{ type: "CONFIRM_HEARD" },
			{ entitled: true, type: "KEEP_NAME" }
		);
		expect(done.step).toBe("done");
		expect(run(done, { type: "COMPLETE_FAILED" })).toEqual({
			...done,
			step: "name",
		});
	});

	it("goes back to Xolace+ when the save after it fails", () => {
		const done = run(
			start(),
			{ type: "SKIP" },
			{ entitled: false, type: "KEEP_NAME" },
			{ outcome: "dismissed", type: "PLUS_EXIT" }
		);
		expect(run(done, { type: "COMPLETE_FAILED" }).step).toBe("plus");
	});

	it("keeps the first outcome when Continue follows a failed save", () => {
		expect(
			run(
				start(),
				{ type: "SKIP" },
				{ entitled: false, type: "KEEP_NAME" },
				{ outcome: "entitled", type: "PLUS_EXIT" },
				{ type: "COMPLETE_FAILED" },
				{ outcome: "dismissed", type: "PLUS_EXIT" }
			).plusOutcome
		).toBe("entitled");
	});

	it("keeps a purchase as the outcome when Continue free follows a failed save", () => {
		expect(
			run(
				start(),
				{ type: "SKIP" },
				{ entitled: false, type: "KEEP_NAME" },
				{ outcome: "purchased", type: "PLUS_EXIT" },
				{ type: "COMPLETE_FAILED" },
				{ outcome: "dismissed", type: "PLUS_EXIT" }
			).plusOutcome
		).toBe("purchased");
	});
});

const WORK_READING = {
	fields: {
		intent: { confidence: 0.9, value: "get_through_hard_moment" },
		weighingOn: { confidence: 0.85, value: ["work"] },
	},
	route: "heard",
	safeguardLevel: "none",
} as const satisfies Reading;

const ASKS_TOPIC = {
	fields: { intent: { confidence: 0.8, value: "understand_feelings" } },
	followUp: { field: "weighingOn", question: "Is it mostly work, or home?" },
	route: "heard",
	safeguardLevel: "none",
} as const satisfies Reading;

const CRISIS = {
	resources: [
		{
			label: "Ghana Emergency Line",
			priority: 3,
			source: "crisis_line",
			type: "phone",
			value: "112",
		},
	],
	route: "safety",
	safeguardLevel: "crisis",
} as const satisfies Reading;

const done = (reading: Reading): IntakeV2Action => ({
	reading,
	type: "READ_DONE",
});

describe("reading", () => {
	it("shows what was read as chips to tap off", () => {
		expect(run(answered(), done(WORK_READING))).toMatchObject({
			heard: { intent: "get_through_hard_moment", weighingOn: ["work"] },
			read: "model",
			step: "heard",
		});
	});

	it("remembers what was read, apart from what the user taps", () => {
		expect(
			run(answered(), done(WORK_READING), {
				field: "weighingOn",
				type: "TOGGLE_CHIP",
				value: "work",
			})
		).toMatchObject({
			heard: { weighingOn: [] },
			readAs: { intent: "get_through_hard_moment", weighingOn: ["work"] },
		});
	});

	it("shows the pick-list when nothing was read clearly", () => {
		expect(
			run(answered(), done({ ...WORK_READING, fields: {} }))
		).toMatchObject({
			heard: { weighingOn: [] },
			read: "pick_list",
			step: "heard",
		});
	});

	it("asks the one follow-up when a key field was unclear", () => {
		expect(run(answered(), done(ASKS_TOPIC))).toMatchObject({
			followUp: {
				field: "weighingOn",
				question: "Is it mostly work, or home?",
			},
			step: "followUp",
		});
	});

	it("goes to safety with no chips on an elevated or crisis answer", () => {
		const safety = run(answered(), done(CRISIS));
		expect(safety).toMatchObject({
			heard: { weighingOn: [] },
			resources: CRISIS.resources,
			step: "safety",
		});
		expect(
			run(safety, { field: "weighingOn", type: "TOGGLE_CHIP", value: "work" })
		).toEqual(safety);
	});
});

describe("followUp", () => {
	const asked = () => run(answered(), done(ASKS_TOPIC));

	it("reads the answer again with the reply", () => {
		expect(
			run(
				asked(),
				{ text: " my job, mostly ", type: "FOLLOW_UP_DRAFT_CHANGE" },
				{ type: "FOLLOW_UP_SEND" }
			)
		).toMatchObject({ followUpReply: "my job, mostly", step: "interpret" });
	});

	it("never asks a second follow-up", () => {
		const reread = run(
			asked(),
			{ text: "not sure", type: "FOLLOW_UP_DRAFT_CHANGE" },
			{ type: "FOLLOW_UP_SEND" },
			done(ASKS_TOPIC)
		);
		expect(reread.step).toBe("heard");
	});

	it("keeps the first reading's chips when skipped", () => {
		expect(run(asked(), { type: "FOLLOW_UP_SKIP" })).toMatchObject({
			heard: { intent: "understand_feelings", weighingOn: [] },
			read: "model",
			step: "heard",
		});
	});

	it("keeps the first reading's chips when the second read fails", () => {
		expect(
			run(
				asked(),
				{ text: "work", type: "FOLLOW_UP_DRAFT_CHANGE" },
				{ type: "FOLLOW_UP_SEND" },
				{ type: "READ_FAILED" }
			)
		).toMatchObject({
			heard: { intent: "understand_feelings" },
			read: "model",
			step: "heard",
		});
	});

	it("can still route to safety on the reply", () => {
		expect(
			run(
				asked(),
				{ text: "I want to die", type: "FOLLOW_UP_DRAFT_CHANGE" },
				{ type: "FOLLOW_UP_SEND" },
				done(CRISIS)
			)
		).toMatchObject({ heard: { weighingOn: [] }, step: "safety" });
	});

	it("gives a new answer its own follow-up after saying it again", () => {
		const again = run(
			asked(),
			{ type: "FOLLOW_UP_SKIP" },
			{ type: "SAY_AGAIN" },
			{ text: "still tired", type: "DRAFT_CHANGE" },
			{ type: "SEND" }
		);
		expect(again).toMatchObject({ followUp: null, followUpReply: null });
		expect(run(again, done(ASKS_TOPIC)).step).toBe("followUp");
	});
});

describe("safety", () => {
	it("offers nothing on the safety path, even to someone who has Xolace+", () => {
		expect(
			run(
				answered(),
				done(CRISIS),
				{ type: "SAFETY_CONTINUE" },
				{ entitled: true, type: "KEEP_NAME" }
			)
		).toMatchObject({ plusOutcome: null, step: "done" });
	});

	it("goes on to the name with nothing heard, and never past it to Xolace+", () => {
		const named = run(
			answered(),
			done(CRISIS),
			{ type: "SAFETY_CONTINUE" },
			{ entitled: false, type: "KEEP_NAME" }
		);
		expect(named).toMatchObject({
			heard: { weighingOn: [] },
			safetyRouted: true,
			step: "done",
		});
	});
});
