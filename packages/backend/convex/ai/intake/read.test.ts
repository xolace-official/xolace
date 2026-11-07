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
	EMPTY_CATEGORIES,
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "../providers/moderation";
import { checkAnswerSafety, SAFETY_DEADLINE_MS } from "./read";

/** What every stubbed model call answers: the classifier and the reader alike. */
const stub = {
	limit: { ok: true },
	/** The model never answers, whatever `reply` says. */
	modelHangs: false,
	moderation: (): Promise<ModerationResult> =>
		Promise.resolve(MODERATION_UNAVAILABLE),
	/** Answers to give first, one per call, before falling back to `reply`. */
	replies: [] as string[],
	reply: JSON.stringify({
		fields: { weighingOn: { confidence: 0.9, value: ["work"] } },
	}) as string | Error,
	/** Each provider call's abort signal, as the code under test passed it. */
	signals: [] as (AbortSignal | undefined)[],
};

vi.mock("../../lib/aggregates", () => aggregatesMock());
vi.mock("../../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../../lib/rateLimits")>()),
	...rateLimiterMock(() => stub.limit),
}));
vi.mock("../providers/anthropic", async (orig) => {
	const answering = anthropicMock(
		() => stub.replies.shift() ?? stub.reply
	).getAnthropicClient();
	return {
		...(await orig<typeof import("../providers/anthropic")>()),
		getAnthropicClient: () => ({
			messages: {
				create: (_body: unknown, options?: { signal?: AbortSignal }) => {
					stub.signals.push(options?.signal);
					return stub.modelHangs ? hangs() : answering.messages.create();
				},
			},
		}),
	};
});
vi.mock("../providers/moderation", async (orig) => ({
	...(await orig<typeof import("../providers/moderation")>()),
	moderateInput: (_text: string, signal?: AbortSignal) => {
		stub.signals.push(signal);
		return stub.moderation();
	},
}));

/** A provider call that never answers. Hoisted: the mocks above close over it. */
function hangs() {
	return new Promise<never>(() => undefined);
}

/** Moderation sure of self-harm intent: the engine's crisis on its own. */
const SELF_HARM: ModerationResult = {
	categories: { ...EMPTY_CATEGORIES, "self-harm/intent": true },
	categoryScores: { "self-harm": 0.9, "self-harm/intent": 0.95 },
	flagged: true,
};

/** A classifier reply that escalates with no moderation behind it. */
const DESPAIRING = JSON.stringify({
	granularLabel: "despair",
	intensity: 9,
	primaryEmotion: "sadness",
});

beforeEach(() => {
	stub.limit = { ok: true };
	stub.modelHangs = false;
	stub.moderation = () => Promise.resolve(MODERATION_UNAVAILABLE);
	stub.signals = [];
	stub.replies = [];
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

describe("ai/intake/read.checkAnswerSafety's deadline", () => {
	// Words that hit no phrase: only the providers can flag them.
	const UNPHRASED = "I keep thinking everyone would cope fine without me";

	/** The verdict once the deadline has passed, on a clock nothing real waits on. */
	const pastDeadline = async () => {
		vi.useFakeTimers();
		try {
			const verdict = checkAnswerSafety(UNPHRASED);
			await vi.advanceTimersByTimeAsync(SAFETY_DEADLINE_MS);
			return await verdict;
		} finally {
			vi.useRealTimers();
		}
	};

	it("keeps moderation's flag when the classifier hangs", async () => {
		stub.modelHangs = true;
		stub.moderation = () => Promise.resolve(SELF_HARM);
		expect((await pastDeadline()).level).toBe("crisis");
	});

	it("keeps the classifier's read when moderation hangs", async () => {
		stub.moderation = hangs;
		stub.reply = DESPAIRING;
		expect((await pastDeadline()).level).toBe("elevated");
	});

	it("still answers when both providers hang, leaving the phrase floor", async () => {
		stub.modelHangs = true;
		stub.moderation = hangs;
		expect(await pastDeadline()).toEqual({ level: "none", resources: [] });
	});

	it("stops both providers once the deadline passes", async () => {
		stub.modelHangs = true;
		stub.moderation = hangs;
		await pastDeadline();
		expect(stub.signals).toHaveLength(2);
		expect(stub.signals.every((signal) => signal?.aborted)).toBe(true);
	});

	it("leaves a provider that answered in time alone", async () => {
		await pastDeadline();
		expect(stub.signals.some((signal) => signal?.aborted)).toBe(false);
	});

	it("ends well inside the client's 12s wait", () => {
		const CLIENT_WAIT_MS = 12_000;
		const ROOM_FOR_THE_ROUND_TRIP_MS = 3000;
		expect(SAFETY_DEADLINE_MS).toBeLessThanOrEqual(
			CLIENT_WAIT_MS - ROOM_FOR_THE_ROUND_TRIP_MS
		);
	});
});

describe("ai/intake/read.checkAnswerSafety's classifier", () => {
	it("asks again when the classifier answers in prose, not JSON", async () => {
		stub.replies = ["I can't classify this without more context."];
		stub.reply = DESPAIRING;
		expect(
			(await checkAnswerSafety("everyone would cope fine without me")).level
		).toBe("elevated");
	});
});
