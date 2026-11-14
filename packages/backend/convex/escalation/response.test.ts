// @vitest-environment edge-runtime
/**
 * #778: `recordUserResponse` moved to `escalation/response`, and app builds
 * already in users' hands still call `escalation.recordUserResponse`. Both
 * paths must record the response on the session's event, for its owner only.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

async function escalatedSession(user: SeededUser) {
	const sessionId = await seedSession(user.root, user.profileId);
	const eventId = await user.root.mutation(internal.escalation.events.create, {
		actionTaken: "crisis_line_presented",
		emotionalProfileId: user.profileId,
		resourcesPresented: [],
		sessionId,
		triggerConfidence: 0.9,
		triggerEvidence: "explicit_crisis_language at high confidence",
		triggerType: "explicit_crisis_language",
	});
	return { eventId, sessionId };
}

const PATHS = [
	["the new path", api.escalation.response.recordUserResponse],
	["the old path apps still call", api.escalation.recordUserResponse],
] as const;

describe.each(PATHS)(
	"recordUserResponse on %s",
	(_name, recordUserResponse) => {
		it("records the response on the session's escalation event", async () => {
			const user = await asNewUser();
			const { eventId, sessionId } = await escalatedSession(user);

			await expect(
				user.t.mutation(recordUserResponse, {
					sessionId,
					userResponse: "engaged",
				})
			).resolves.toBeNull();

			const event = await user.root.run((ctx) =>
				ctx.db.get("escalation_events", eventId)
			);
			expect(event?.userResponse).toBe("engaged");
		});

		it("refuses someone else's session", async () => {
			const owner = await asNewUser();
			const { sessionId } = await escalatedSession(owner);
			const stranger = await asNewUser(2, owner.root);

			await expect(
				stranger.t.mutation(recordUserResponse, {
					sessionId,
					userResponse: "dismissed",
				})
			).rejects.toThrow();
		});
	}
);
