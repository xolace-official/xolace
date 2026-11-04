// @vitest-environment edge-runtime
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../_generated/api";
import { expectCode } from "../../test/fixtures.helpers";
import { asNewUser, asUnauthed } from "../../test/harness.helpers";
import {
	aggregatesMock,
	anthropicMock,
	rateLimiterMock,
} from "../../test/mocks.helpers";
import {
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "../providers/moderation";

/** What every stubbed model call answers: the classifier and the reader alike. */
const stub = {
	limit: { ok: true },
	moderation: (): Promise<ModerationResult> =>
		Promise.resolve(MODERATION_UNAVAILABLE),
	reply: JSON.stringify({
		fields: { weighingOn: { confidence: 0.9, value: ["work"] } },
	}) as string | Error,
};

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../../lib/rateLimits")>()),
	...rateLimiterMock(() => stub.limit),
}));
vi.mock("../providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../providers/anthropic")>()),
	...anthropicMock(() => stub.reply),
}));
vi.mock("../providers/moderation", async (orig) => ({
	...(await orig<typeof import("../providers/moderation")>()),
	moderateInput: () => stub.moderation(),
}));

/** A provider call that never answers. */
const hangs = () => new Promise<never>(() => undefined);

beforeEach(() => {
	stub.limit = { ok: true };
	stub.moderation = () => Promise.resolve(MODERATION_UNAVAILABLE);
	stub.reply = JSON.stringify({
		fields: { weighingOn: { confidence: 0.9, value: ["work"] } },
	});
});

describe("ai/intake/read.firstAnswer", () => {
	it("refuses a caller who isn't signed in", async () => {
		await expectCode(
			() =>
				asUnauthed().action(api.ai.intake.read.firstAnswer, {
					answer: "Work's been a lot",
				}),
			"not_authenticated"
		);
	});

	it("refuses a blank answer", async () => {
		const user = await asNewUser();
		await expectCode(
			() => user.t.action(api.ai.intake.read.firstAnswer, { answer: "   " }),
			"invalid_answer"
		);
	});

	it("counts the echoed follow-up question toward the length cap", async () => {
		const user = await asNewUser();
		await expectCode(
			() =>
				user.t.action(api.ai.intake.read.firstAnswer, {
					answer: "tired",
					followUp: { question: "x".repeat(5000), reply: "work" },
				}),
			"invalid_answer"
		);
	});

	it("reads the answer into fields", async () => {
		const user = await asNewUser();
		const reading = await user.t.action(api.ai.intake.read.firstAnswer, {
			answer: "Work's been a lot",
		});
		expect(reading).toMatchObject({
			fields: { weighingOn: { value: ["work"] } },
			route: "heard",
		});
	});

	it("still routes a crisis answer to safety when the models are down", async () => {
		stub.reply = new Error("model down");
		const user = await asNewUser();
		const reading = await user.t.action(api.ai.intake.read.firstAnswer, {
			answer: "I want to end my life",
		});
		expect(reading).toMatchObject({
			route: "safety",
			safeguardLevel: "crisis",
		});
	});

	it("routes a crisis phrase to safety without waiting on a hung moderation call", async () => {
		stub.moderation = hangs;
		const user = await asNewUser();
		const reading = await user.t.action(api.ai.intake.read.firstAnswer, {
			answer: "I want to end my life",
		});
		expect(reading).toMatchObject({
			route: "safety",
			safeguardLevel: "crisis",
		});
	});

	it("routes a loose distress phrase to safety even when moderation hangs", async () => {
		stub.moderation = hangs;
		const user = await asNewUser();
		const reading = await user.t.action(api.ai.intake.read.firstAnswer, {
			answer: "some days I want to die",
		});
		expect(reading).toMatchObject({
			route: "safety",
			safeguardLevel: "elevated",
		});
	});

	it("still routes a crisis answer to safety past the rate limit", async () => {
		stub.limit = { ok: false };
		const user = await asNewUser();
		const reading = await user.t.action(api.ai.intake.read.firstAnswer, {
			answer: "Honestly I'd be better off dead",
		});
		expect(reading).toMatchObject({
			route: "safety",
			safeguardLevel: "crisis",
		});
	});

	it("turns an ordinary answer away past the rate limit, for the pick-list", async () => {
		stub.limit = { ok: false };
		const user = await asNewUser();
		await expectCode(
			() =>
				user.t.action(api.ai.intake.read.firstAnswer, {
					answer: "Work's been a lot",
				}),
			"rate_limited"
		);
	});
});
