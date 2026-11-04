import { describe, expect, it } from "vitest";
import { CRISIS_RESOURCES } from "../safeguard";
import {
	type ReadingDeps,
	readFirstAnswer,
	type SafetyVerdict,
} from "./reading";

const SAFE: SafetyVerdict = { level: "none", resources: [] };

/** What the reader model says, as JSON text. */
const said = (body: object) => JSON.stringify(body);

const deps = (overrides: Partial<ReadingDeps> = {}): ReadingDeps => ({
	checkSafety: async () => SAFE,
	readFields: async () => said({ fields: {} }),
	...overrides,
});

const CONFIDENT_WORK = said({
	fields: {
		intent: { confidence: 0.9, value: "get_through_hard_moment" },
		weighingOn: { confidence: 0.9, value: ["work"] },
	},
});

describe("safeguard veto", () => {
	it("routes a crisis answer to safety with no fields, whatever the reader says", async () => {
		const reading = await readFirstAnswer(
			{ answer: "I want to end my life" },
			deps({
				checkSafety: async () => ({
					level: "crisis",
					resources: CRISIS_RESOURCES,
				}),
				readFields: async () => CONFIDENT_WORK,
			})
		);
		expect(reading).toEqual({
			resources: CRISIS_RESOURCES,
			route: "safety",
			safeguardLevel: "crisis",
		});
	});

	it("routes an elevated answer to safety even when the reader fails", async () => {
		const reading = await readFirstAnswer(
			{ answer: "I don't want to wake up" },
			deps({
				checkSafety: async () => ({ level: "elevated", resources: [] }),
				readFields: () => Promise.reject(new Error("model down")),
			})
		);
		expect(reading).toMatchObject({
			route: "safety",
			safeguardLevel: "elevated",
		});
	});

	it("checks the follow-up reply too, not just the first answer", async () => {
		const seen: string[] = [];
		await readFirstAnswer(
			{
				answer: "tired",
				followUp: {
					question: "What's it mostly about?",
					reply: "my job, mostly",
				},
			},
			deps({
				checkSafety: async (text) => {
					seen.push(text);
					return SAFE;
				},
			})
		);
		expect(seen).toHaveLength(1);
		expect(seen[0]).toContain("tired");
		expect(seen[0]).toContain("my job, mostly");
	});

	it("lets a gentle answer through to the chips", async () => {
		const reading = await readFirstAnswer(
			{ answer: "Work has been brutal" },
			deps({
				checkSafety: async () => ({ level: "gentle", resources: [] }),
				readFields: async () => CONFIDENT_WORK,
			})
		);
		expect(reading).toMatchObject({ route: "heard", safeguardLevel: "gentle" });
	});
});

describe("fields", () => {
	const read = (body: object) =>
		readFirstAnswer(
			{ answer: "Work has been a lot and I can't switch off" },
			deps({ readFields: async () => said(body) })
		);

	it("keeps what the reader is confident of, with its confidence", async () => {
		expect(await read(JSON.parse(CONFIDENT_WORK))).toMatchObject({
			fields: {
				intent: { confidence: 0.9, value: "get_through_hard_moment" },
				weighingOn: { confidence: 0.9, value: ["work"] },
			},
			route: "heard",
		});
	});

	it("omits a field read with low confidence rather than guessing it", async () => {
		const reading = await read({
			fields: {
				disclosureStyle: { confidence: 0.3, value: "all_at_once" },
				weighingOn: { confidence: 0.85, value: ["work"] },
			},
		});
		expect(reading).toMatchObject({
			fields: { weighingOn: { value: ["work"] } },
		});
		expect(reading).not.toHaveProperty("fields.disclosureStyle");
	});

	it("drops values outside the intake's own answers", async () => {
		const reading = await read({
			fields: {
				emotionAwareness: { confidence: 0.9, value: "furious" },
				intent: { confidence: 0.9, value: "prefer_not_to_say" },
				weighingOn: { confidence: 0.9, value: ["work", "aliens", "money"] },
			},
		});
		expect(reading).toMatchObject({
			fields: { weighingOn: { value: ["work", "money"] } },
		});
		expect(reading).not.toHaveProperty("fields.emotionAwareness");
		expect(reading).not.toHaveProperty("fields.intent");
	});

	it("holds weighing-on to three topics", async () => {
		const reading = await read({
			fields: {
				weighingOn: {
					confidence: 0.9,
					value: ["work", "money", "family", "health"],
				},
			},
		});
		expect(reading).toMatchObject({
			fields: { weighingOn: { value: ["work", "money", "family"] } },
		});
	});

	it("rejects when the reader's text isn't a reading at all", async () => {
		await expect(
			readFirstAnswer(
				{ answer: "work" },
				deps({ readFields: async () => "Sorry, I can't help with that." })
			)
		).rejects.toThrow();
	});
});

describe("follow-up", () => {
	const VAGUE = "tired";
	const ASKS_TOPIC = {
		fields: { intent: { confidence: 0.8, value: "understand_feelings" } },
		followUp: {
			field: "weighingOn",
			question: "Is it mostly work, or something closer to home?",
		},
	};

	it("asks the reader's one question when a key field is missing", async () => {
		const reading = await readFirstAnswer(
			{ answer: VAGUE },
			deps({ readFields: async () => said(ASKS_TOPIC) })
		);
		expect(reading).toMatchObject({
			followUp: {
				field: "weighingOn",
				question: "Is it mostly work, or something closer to home?",
			},
		});
	});

	it("asks nothing once both key fields were read", async () => {
		const reading = await readFirstAnswer(
			{ answer: "Work's crushing me, I just need to get through tonight" },
			deps({
				readFields: async () =>
					said({
						...JSON.parse(CONFIDENT_WORK),
						followUp: { field: "disclosureStyle", question: "Fast or slow?" },
					}),
			})
		);
		expect(reading).not.toHaveProperty("followUp");
	});

	it("never asks a second follow-up", async () => {
		const reading = await readFirstAnswer(
			{
				answer: VAGUE,
				followUp: {
					question: "Is it mostly work, or something closer to home?",
					reply: "not sure",
				},
			},
			deps({ readFields: async () => said(ASKS_TOPIC) })
		);
		expect(reading).toMatchObject({ route: "heard" });
		expect(reading).not.toHaveProperty("followUp");
	});

	it("still asks about a missing key field when the reader asked about something else", async () => {
		const reading = await readFirstAnswer(
			{ answer: VAGUE },
			deps({
				readFields: async () =>
					said({
						fields: {},
						followUp: { field: "disclosureStyle", question: "Fast or slow?" },
					}),
			})
		);
		expect(reading).toMatchObject({ followUp: { field: "weighingOn" } });
		expect(reading).not.toHaveProperty("followUp.question", "Fast or slow?");
	});

	it("asks nothing of someone just looking around", async () => {
		const reading = await readFirstAnswer(
			{ answer: "just looking around" },
			deps({
				readFields: async () =>
					said({
						fields: { intent: { confidence: 0.95, value: "just_looking" } },
						followUp: {
							field: "weighingOn",
							question: "Anything on your mind?",
						},
					}),
			})
		);
		expect(reading).not.toHaveProperty("followUp");
	});
});
