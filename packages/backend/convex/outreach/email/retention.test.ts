// @vitest-environment edge-runtime
/**
 * #917: how long the Resend component keeps an email (ADR 0004). What can go
 * wrong: the cleanup runs more often than daily, or not at all; a cutoff
 * drifts, so an address sits in Convex longer than about 8 days.
 */
import resendTest from "@convex-dev/resend/test";
import { describe, expect, it } from "vitest";
import { internal } from "../../_generated/api";
import crons from "../../crons";
import { allScheduledCalls } from "../../test/fixtures.helpers";
import { asUnauthed } from "../../test/harness.helpers";

const DAY = 24 * 3_600_000;
const CLEANUP = "outreach/email/retention:cleanup";

describe("the daily email cleanup", () => {
	it("runs once a day, never more often", () => {
		const entries = Object.values(crons.crons).filter(
			(entry) => entry.name === CLEANUP
		);

		expect(entries).toEqual([
			{ args: [{}], name: CLEANUP, schedule: { hours: 24, type: "interval" } },
		]);
	});

	it("drops finished emails after 7 days and abandoned ones after 28", async () => {
		const t = asUnauthed();
		resendTest.register(t);

		await t.mutation(internal.outreach.email.retention.cleanup, {});

		expect(await allScheduledCalls(t)).toEqual(
			expect.arrayContaining([
				{
					args: { olderThan: 7 * DAY },
					name: expect.stringMatching(/cleanupOldEmails$/),
				},
				{
					args: { olderThan: 28 * DAY },
					name: expect.stringMatching(/cleanupAbandonedEmails$/),
				},
			])
		);
		expect(await allScheduledCalls(t)).toHaveLength(2);
	});
});
