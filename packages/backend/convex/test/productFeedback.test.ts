// @vitest-environment edge-runtime
/**
 * Flag and Report both land in both places the maintainer looks (#343): the
 * concern tray (a `product_feedback` row) and Stream's moderation queue. The
 * message flag is written here and flagged in Stream by the client; the person
 * report is written here and schedules the Stream flag.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import {
	scheduled,
	scheduledCalls,
	seedConversation,
} from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import {
	aggregatesMock,
	noopJob,
	posthogMock,
	rateLimiterMock,
} from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(),
}));

// Asserted at the enqueue boundary (house style, see `scheduledCalls`); the
// action itself is one try/catch around `flagStreamUser`.
vi.mock("../productFeedbackFlags", async (orig) => ({
	...(await orig<typeof import("../productFeedbackFlags")>()),
	flagSubjectOnStream: noopJob(),
}));

const CONTEXT = {
	appVersion: "1",
	platform: "ios",
	route: "/chat/x",
	themeName: "quiet",
};

describe("productFeedback.flagMessage", () => {
	it("writes a flag row pointing at the message and the counterpart", async () => {
		const seeker = await asNewUser(1);
		const xolacer = await asNewUser(2, seeker.root);
		const conversationId = await seeker.root.run((ctx) =>
			ctx.db.insert("xolacer_conversations", {
				requestedAt: Date.now(),
				status: "open",
				userProfileId: seeker.profileId,
				xolacerProfileId: xolacer.profileId,
			})
		);

		await seeker.t.mutation(api.productFeedbackFlags.flagMessage, {
			context: CONTEXT,
			conversationId,
			messageId: "msg_1",
		});

		const rows = await seeker.root.run((ctx) =>
			ctx.db.query("product_feedback").collect()
		);
		expect(rows).toHaveLength(1);
		expect(rows[0]).toMatchObject({
			conversationId,
			emotionalProfileId: seeker.profileId,
			kind: "flag",
			messageId: "msg_1",
			subjectProfileId: xolacer.profileId,
			text: "",
		});
	});

	it("refuses a conversation the caller is not in", async () => {
		const owner = await asNewUser(1);
		const stranger = await asNewUser(2, owner.root);
		const conversationId = await seedConversation(owner.root, owner.profileId);
		await expect(
			stranger.t.mutation(api.productFeedbackFlags.flagMessage, {
				context: CONTEXT,
				conversationId,
				messageId: "msg_1",
			})
		).rejects.toThrow(/does not belong/);
	});
});

describe("productFeedback.submit (concern)", () => {
	it("schedules one Stream flag on the subject, on the reporter's behalf", async () => {
		const reporter = await asNewUser(1);
		const subject = await asNewUser(2, reporter.root);

		await reporter.t.mutation(api.productFeedback.submit, {
			context: CONTEXT,
			kind: "concern",
			subjectProfileId: subject.profileId,
			text: "this person crossed a line",
		});

		const calls = await scheduledCalls(reporter.root);
		const flags = calls.filter((c) => c.name.endsWith(":flagSubjectOnStream"));
		expect(flags).toHaveLength(1);
		expect(flags[0].args).toEqual({
			reporterProfileId: reporter.profileId,
			subjectProfileId: subject.profileId,
		});
	});

	it("a bug report never reaches Stream", async () => {
		const reporter = await asNewUser(1);
		await reporter.t.mutation(api.productFeedback.submit, {
			context: CONTEXT,
			kind: "bug",
			text: "the button is blue",
		});
		expect(
			scheduled(await scheduledCalls(reporter.root), ":flagSubjectOnStream")
		).toBeUndefined();
	});
});
