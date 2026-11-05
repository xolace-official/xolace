// @vitest-environment edge-runtime
/**
 * The profile Follow-ups tab queries: `profileOpenCards` (pinned groups) and
 * `listForProfilePage` (paginated history).
 *
 * Failure modes this guards: another user's cards leaking in, an open card
 * landing in the wrong group, groups or pages out of newest-first order, and
 * internal fields (workflowId, sessionId) reaching the client.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const HOUR = 3_600_000;

async function seedCard(
	user: SeededUser,
	status: Doc<"follow_up_cards">["status"],
	hoursAgo: number
) {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	return await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: `${status} ${hoursAgo}h`,
			createdAt: Date.now() - hoursAgo * HOUR,
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status,
			tier: "standard",
			workflowId: `wf_${status}_${hoursAgo}` as WorkflowId,
		})
	);
}

describe("followUps.profileOpenCards", () => {
	it("groups open cards by who acts next, newest first", async () => {
		const user = await asNewUser();
		await seedCard(user, "superseded", 30);
		await seedCard(user, "ready", 5);
		await seedCard(user, "shown", 10);
		await seedCard(user, "pending", 2);
		await seedCard(user, "resolved", 1);
		await seedCard(user, "expired", 3);

		const open = await user.t.query(api.followUps.profileOpenCards, {});

		expect(open.waiting.map((c) => c.cardText)).toEqual([
			"ready 5h",
			"shown 10h",
			"superseded 30h",
		]);
		expect(open.upcoming.map((c) => c.cardText)).toEqual(["pending 2h"]);
	});

	it("never returns another user's cards", async () => {
		const owner = await asNewUser();
		const other = await asNewUser(2, owner.root);
		await seedCard(owner, "ready", 1);

		const open = await other.t.query(api.followUps.profileOpenCards, {});

		expect(open).toEqual({ upcoming: [], waiting: [] });
	});
});

describe("followUps.listForProfilePage", () => {
	it("pages through every card newest first with slim rows", async () => {
		const user = await asNewUser();
		for (const hoursAgo of [4, 1, 3, 2]) {
			await seedCard(user, "resolved", hoursAgo);
		}

		const first = await user.t.query(api.followUps.listForProfilePage, {
			paginationOpts: { cursor: null, numItems: 3 },
		});
		const second = await user.t.query(api.followUps.listForProfilePage, {
			paginationOpts: { cursor: first.continueCursor, numItems: 3 },
		});

		expect(first.page.map((c) => c.cardText)).toEqual([
			"resolved 1h",
			"resolved 2h",
			"resolved 3h",
		]);
		expect(second.page.map((c) => c.cardText)).toEqual(["resolved 4h"]);
		expect(second.isDone).toBe(true);
		expect(first.page[0]).not.toHaveProperty("workflowId");
		expect(first.page[0]).not.toHaveProperty("sessionId");
	});

	it("never returns another user's cards", async () => {
		const owner = await asNewUser();
		const other = await asNewUser(2, owner.root);
		await seedCard(owner, "resolved", 1);

		const result = await other.t.query(api.followUps.listForProfilePage, {
			paginationOpts: { cursor: null, numItems: 10 },
		});

		expect(result.page).toEqual([]);
	});
});
