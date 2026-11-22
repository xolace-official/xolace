// @vitest-environment edge-runtime
/**
 * #761: one core resolves a follow-up card for every surface (the app now,
 * Telegram taps next), so "first response wins" holds across them.
 *
 * What can go wrong: a second response overwrites the first, a tap on a closed
 * card (expired, superseded) resolves it from a surface that only accepts open
 * cards, a card is resolved for someone who doesn't own it, or the core throws
 * for an ordinary stale or duplicate tap instead of saying what happened.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { resolveCardCore } from "./resolve";

vi.mock("../lib/aggregates", () => aggregatesMock());

// Resolving schedules the stretch evaluation; fake timers keep it from firing
// after the test (it has its own coverage in compounding/stretches.test.ts).
beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

async function seedCard(
	user: SeededUser,
	fields: Partial<Doc<"follow_up_cards">> = {}
) {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	return await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "How's it sitting now?",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "shown",
			tier: "standard",
			workflowId: "wf1" as WorkflowId,
			...fields,
		})
	);
}

const readCard = (user: SeededUser, cardId: Doc<"follow_up_cards">["_id"]) =>
	user.root.run((ctx) => ctx.db.get("follow_up_cards", cardId));

const readResponses = (
	user: SeededUser,
	cardId: Doc<"follow_up_cards">["_id"]
) =>
	user.root.run((ctx) =>
		ctx.db
			.query("follow_up_responses")
			.withIndex("by_card", (q) => q.eq("cardId", cardId))
			.collect()
	);

/** Run the core as `user`, the way a mutation would after `requireAuth`. */
const resolve = (
	user: SeededUser,
	args: Omit<Parameters<typeof resolveCardCore>[1], "profileId">
) =>
	user.root.run((ctx) =>
		resolveCardCore(ctx, { ...args, profileId: user.profileId })
	);

describe("resolveCardCore", () => {
	it("resolves an open card", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, { status: "ready" });

		const outcome = await resolve(user, {
			cardId,
			response: "lighter",
			source: "telegram",
		});

		expect(outcome).toBe("accepted");
		expect(await readCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "lighter",
		});
	});

	it("keeps the first response and reports a later one as already resolved", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, {
			resolvedAt: 1,
			status: "resolved",
			userResponse: "lighter",
		});

		const outcome = await resolve(user, {
			cardId,
			response: "heavier",
			source: "telegram",
		});

		expect(outcome).toBe("already_resolved");
		expect(await readCard(user, cardId)).toMatchObject({
			resolvedAt: 1,
			status: "resolved",
			userResponse: "lighter",
		});
	});

	it.each(["expired", "superseded"] as const)(
		"reports a %s card as closed when only open cards are accepted",
		async (status) => {
			const user = await asNewUser();
			const cardId = await seedCard(user, { status });

			const outcome = await resolve(user, {
				cardId,
				onlyOpen: true,
				response: "still_here",
				source: "app",
			});

			expect(outcome).toBe("closed");
			expect(await readCard(user, cardId)).toMatchObject({ status });
		}
	);

	it("accepts only open cards from Telegram unless told otherwise", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, { status: "superseded" });

		const outcome = await resolve(user, {
			cardId,
			response: "lighter",
			source: "telegram",
		});

		expect(outcome).toBe("closed");
	});

	it("still resolves a superseded card from the app, which accepts any unresolved card", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, { status: "superseded" });

		const outcome = await resolve(user, {
			cardId,
			response: "dismissed",
			source: "app",
		});

		expect(outcome).toBe("accepted");
		expect(await readCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "dismissed",
		});
	});

	it("records what helped on a card that's already resolved", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, {
			status: "resolved",
			userResponse: "lighter",
		});

		const outcome = await resolve(user, {
			cardId,
			details: { reflectionText: "  a walk  ", shareRequested: false },
			source: "telegram",
		});

		expect(outcome).toBe("accepted");
		expect(await readResponses(user, cardId)).toMatchObject([
			{ reflectionText: "a walk", shareRequested: false },
		]);
	});

	it("records nothing when the response it came with is refused", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user, { status: "expired" });

		const outcome = await resolve(user, {
			cardId,
			details: { reflectionText: "a walk", shareRequested: false },
			response: "lighter",
			source: "telegram",
		});

		expect(outcome).toBe("closed");
		expect(await readResponses(user, cardId)).toHaveLength(0);
	});

	it("never resolves another user's card", async () => {
		const owner = await asNewUser();
		const intruder = await asNewUser(2, owner.root);
		const cardId = await seedCard(owner);

		const outcome = await resolve(intruder, {
			cardId,
			response: "lighter",
			source: "app",
		});

		expect(outcome).toBe("not_found");
		expect(await readCard(owner, cardId)).toMatchObject({ status: "shown" });
	});
});
