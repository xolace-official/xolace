// @vitest-environment edge-runtime
/**
 * `recordPostSessionFeedback` with the mood slider's exact position (the
 * Xolace face placements doc, section 1). The word still drives everything
 * downstream; the position is an optional extra old clients never send.
 */
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { expectCode, seedSession } from "./fixtures.helpers";
import { asNewUser } from "./harness.helpers";
import { aggregatesMock, posthogMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());

async function completedSession() {
	const user = await asNewUser();
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	const read = () => user.root.run((ctx) => ctx.db.get("sessions", sessionId));
	return { read, sessionId, user };
}

describe("recordPostSessionFeedback moodPosition", () => {
	it("saves the position next to the word", async () => {
		const { read, sessionId, user } = await completedSession();
		await user.t.mutation(api.sessions.recordPostSessionFeedback, {
			moodPosition: 0.18,
			postSessionMood: "heavier",
			sessionId,
		});
		expect(await read()).toMatchObject({
			moodPosition: 0.18,
			postSessionMood: "heavier",
		});
	});

	it("leaves it unset for an old client that sends only the word", async () => {
		const { read, sessionId, user } = await completedSession();
		await user.t.mutation(api.sessions.recordPostSessionFeedback, {
			postSessionMood: "lighter",
			sessionId,
		});
		const session = await read();
		expect(session?.postSessionMood).toBe("lighter");
		expect(session?.moodPosition).toBeUndefined();
	});

	it("rejects a position off the slider", async () => {
		const { read, sessionId, user } = await completedSession();
		for (const moodPosition of [-0.1, 1.2, Number.NaN]) {
			await expectCode(
				() =>
					user.t.mutation(api.sessions.recordPostSessionFeedback, {
						moodPosition,
						postSessionMood: "same",
						sessionId,
					}),
				"mood_position_out_of_range"
			);
		}
		expect((await read())?.postSessionMood).toBeUndefined();
	});
});
