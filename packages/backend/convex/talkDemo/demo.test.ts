// @vitest-environment edge-runtime
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import {
	MODERATION_UNAVAILABLE,
	type ModerationResult,
} from "../ai/providers/moderation";
import { expectCode } from "../test/fixtures.helpers";
import { asNewUser, asUnauthed } from "../test/harness.helpers";
import {
	aggregatesMock,
	anthropicMock,
	revenuecatMock,
} from "../test/mocks.helpers";
import { DEMO_CAP_MS, DEMO_OPENING } from "./demo";

const QUESTION =
	"That stings. Was it the credit, or that nobody in the room noticed it was yours?";

/** What every stubbed model call answers: the classifier and the reply writer alike. */
const stub = {
	moderation: (): Promise<ModerationResult> =>
		Promise.resolve(MODERATION_UNAVAILABLE),
	reply: QUESTION as string | Error,
};

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());
vi.mock("../ai/providers/anthropic", async (orig) => ({
	...(await orig<typeof import("../ai/providers/anthropic")>()),
	...anthropicMock(() => stub.reply),
}));
vi.mock("../ai/providers/moderation", async (orig) => ({
	...(await orig<typeof import("../ai/providers/moderation")>()),
	moderateInput: () => stub.moderation(),
}));

const LINE = "my manager took credit for my work again. in front of everyone.";
const CRISIS = "honestly i want to kill myself";

beforeEach(() => {
	stub.moderation = () => Promise.resolve(MODERATION_UNAVAILABLE);
	stub.reply = QUESTION;
});

afterEach(() => {
	vi.useRealTimers();
});

describe("talkDemo", () => {
	it("opens on Flux's line, then answers the one thing said with a question", async () => {
		const user = await asNewUser();
		const opened = await user.t.mutation(api.talkDemo.demo.open, {});
		expect(opened).toEqual({ msLeft: DEMO_CAP_MS, opening: DEMO_OPENING });

		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "wren",
		});
		expect(reply).toEqual({ audioUrl: null, route: "reply", text: QUESTION });
	});

	it("refuses a second turn", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "wren",
		});
		await expectCode(
			() =>
				user.t.action(api.ai.talkDemo.reply.reply, {
					line: "and another thing",
					voice: "wren",
				}),
			"turn_taken"
		);
	});

	it("refuses a second demo once one was spoken in", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "sage",
		});
		await expectCode(
			() => user.t.mutation(api.talkDemo.demo.open, {}),
			"demo_used"
		);
	});

	it("lets a demo closed before a word was said open again", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		const again = await user.t.mutation(api.talkDemo.demo.open, {});
		expect(again.opening).toBe(DEMO_OPENING);
	});

	it("refuses a turn without an open demo", async () => {
		const user = await asNewUser();
		await expectCode(
			() =>
				user.t.action(api.ai.talkDemo.reply.reply, {
					line: LINE,
					voice: "wren",
				}),
			"demo_not_open"
		);
	});

	it("refuses a turn past the time cap", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		vi.setSystemTime(Date.now() + DEMO_CAP_MS + 1000);
		await expectCode(
			() =>
				user.t.action(api.ai.talkDemo.reply.reply, {
					line: LINE,
					voice: "wren",
				}),
			"demo_expired"
		);
	});

	it("refuses a blank or overlong line without spending the turn", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		await expectCode(
			() =>
				user.t.action(api.ai.talkDemo.reply.reply, {
					line: "  ",
					voice: "wren",
				}),
			"invalid_line"
		);
		await expectCode(
			() =>
				user.t.action(api.ai.talkDemo.reply.reply, {
					line: "x".repeat(5000),
					voice: "wren",
				}),
			"invalid_line"
		);
		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "wren",
		});
		expect(reply.route).toBe("reply");
	});

	it("writes nothing to the timeline", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "wren",
		});
		const timeline = await user.t.query(api.sessions.listForTimeline, {
			paginationOpts: { cursor: null, numItems: 10 },
		});
		expect(timeline.page).toEqual([]);
		const sessions = await user.root.run((ctx) =>
			ctx.db
				.query("sessions")
				.withIndex("by_profile_time", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.collect()
		);
		expect(sessions).toEqual([]);
	});

	it("ends the demo on crisis support instead of a reply", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: CRISIS,
			voice: "wren",
		});
		expect(reply).toMatchObject({ route: "safety", safeguardLevel: "crisis" });
		expect(reply.route === "safety" && reply.resources.length).toBeGreaterThan(
			0
		);
		await expectCode(
			() => user.t.mutation(api.talkDemo.demo.open, {}),
			"demo_used"
		);
	});

	it("ends the demo on support when the line reads as elevated", async () => {
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: "some nights i don't want to wake up",
			voice: "sage",
		});
		expect(reply).toMatchObject({
			route: "safety",
			safeguardLevel: "elevated",
		});
	});

	it("asks a plain deeper question when the writer names the feeling", async () => {
		stub.reply = "Is that guilt, more than anything?";
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "ash",
		});
		expect(reply.route === "reply" && reply.text).not.toMatch(/guilt/i);
		expect(reply.route === "reply" && reply.text.endsWith("?")).toBe(true);
	});

	it("still asks a question when the writer fails", async () => {
		stub.reply = new Error("overloaded");
		const user = await asNewUser();
		await user.t.mutation(api.talkDemo.demo.open, {});
		const reply = await user.t.action(api.ai.talkDemo.reply.reply, {
			line: LINE,
			voice: "vesper",
		});
		expect(reply.route === "reply" && reply.text.endsWith("?")).toBe(true);
	});

	it("refuses a caller who isn't signed in", async () => {
		await expectCode(
			() => asUnauthed().mutation(api.talkDemo.demo.open, {}),
			"not_authenticated"
		);
	});
});
