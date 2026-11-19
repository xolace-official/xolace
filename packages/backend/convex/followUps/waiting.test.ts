// @vitest-environment edge-runtime
/**
 * B1, Coming back v2: `getWaitingCard` and the silent 3-day expiry of a shown
 * card.
 *
 * What can go wrong: the 3 days start at the wrong time (the card's creation,
 * the latest re-show) so a card waits forever or vanishes early; the tier
 * timers and the 3 days overlap and expire a card the person is looking at;
 * the 2-hour re-show cooldown hides a waiting card from the greeting and the
 * pill; another person's card leaks in; the expiry nudges or reaches out.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	minReturnGapForTier,
	WAITING_CARD_LIFETIME_MS,
} from "../lib/followUpCadence";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TIERS = ["acute", "elevated", "standard"] as const;

beforeEach(() => {
	vi.useFakeTimers();
});
afterEach(() => {
	vi.useRealTimers();
});

let workflowSeq = 0;

async function seedCard(
	user: SeededUser,
	fields: Partial<Doc<"follow_up_cards">> = {}
): Promise<Id<"follow_up_cards">> {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "completed",
	});
	workflowSeq += 1;
	return await user.root.run((ctx) =>
		ctx.db.insert("follow_up_cards", {
			cardText: "How's it sitting now?",
			createdAt: Date.now(),
			emotionalProfileId: user.profileId,
			escalationDerived: false,
			sessionId,
			status: "pending",
			tier: "standard",
			workflowId: `wf_waiting_${workflowSeq}` as WorkflowId,
			...fields,
		})
	);
}

const readCard = (user: SeededUser, cardId: Id<"follow_up_cards">) =>
	user.root.run((ctx) => ctx.db.get("follow_up_cards", cardId));

const waitingCard = (user: SeededUser) =>
	user.t.query(api.followUps.waiting.getWaitingCard, {});

/** Move the clock and run whatever scheduled functions came due. */
async function advance(user: SeededUser, ms: number) {
	vi.advanceTimersByTime(ms);
	await user.root.finishInProgressScheduledFunctions();
}

const scheduledExpiries = (user: SeededUser) =>
	user.root.run(async (ctx) =>
		(await ctx.db.system.query("_scheduled_functions").collect()).filter((f) =>
			f.name.includes("expireShownCard")
		)
	);

const outreachFor = (user: SeededUser, cardId: Id<"follow_up_cards">) =>
	user.root.run((ctx) =>
		ctx.db
			.query("outreach")
			.withIndex("by_follow_up", (q) => q.eq("followUpId", cardId))
			.collect()
	);

/** A pending card the person comes back to and sees: the real path. */
async function backAndShown(
	user: SeededUser,
	tier: Doc<"follow_up_cards">["tier"]
) {
	const cardId = await seedCard(user, { tier });
	vi.advanceTimersByTime(minReturnGapForTier(tier));
	await user.t.mutation(api.followUps.markReturn, {});
	await user.t.mutation(api.followUps.markShown, { cardId });
	return cardId;
}

describe("shown-card expiry", () => {
	it.each(TIERS)(
		"a shown %s card waits 3 days from its first showing, then expires",
		async (tier) => {
			const user = await asNewUser();
			const cardId = await backAndShown(user, tier);
			const card = await readCard(user, cardId);
			expect(card?.status).toBe("shown");
			expect(card?.firstShownAt).toBe(Date.now());

			// The tier timer only acts on a pending card, even past its own expiry.
			await user.root.mutation(internal.followUps.markCardExpired, {
				workflowId: card?.workflowId as WorkflowId,
			});
			await advance(user, WAITING_CARD_LIFETIME_MS - MINUTE);
			expect((await readCard(user, cardId))?.status).toBe("shown");
			expect(await waitingCard(user)).toMatchObject({ _id: cardId });

			await advance(user, MINUTE);
			expect((await readCard(user, cardId))?.status).toBe("expired");
			expect(await waitingCard(user)).toBeNull();
			expect(await user.t.query(api.followUps.getReadyCard, {})).toBeNull();
		}
	);

	it("a re-show re-stamps shownAt but doesn't extend the 3 days", async () => {
		const user = await asNewUser();
		const cardId = await backAndShown(user, "standard");
		const firstShownAt = Date.now();

		// Old builds re-surface it after the cooldown and stamp it again.
		await advance(user, 2 * DAY);
		await user.t.mutation(api.followUps.markShown, { cardId });
		expect(await readCard(user, cardId)).toMatchObject({
			firstShownAt,
			shownAt: Date.now(),
			status: "shown",
		});
		expect(await scheduledExpiries(user)).toHaveLength(1);

		await advance(user, DAY);
		expect((await readCard(user, cardId))?.status).toBe("expired");
	});

	it("expires silently: no nudge, no outreach", async () => {
		const user = await asNewUser();
		const cardId = await backAndShown(user, "acute");
		const scheduledIds = () =>
			user.root.run(async (ctx) =>
				(await ctx.db.system.query("_scheduled_functions").collect()).map(
					(f) => f._id
				)
			);
		// Run the expiry on its own, so onboarding's jobs don't muddy the count.
		vi.setSystemTime(Date.now() + WAITING_CARD_LIFETIME_MS);
		const before = await scheduledIds();

		await user.root.mutation(internal.followUps.waiting.expireShownCard, {
			cardId,
		});

		expect((await readCard(user, cardId))?.status).toBe("expired");
		expect(await outreachFor(user, cardId)).toEqual([]);
		expect(await scheduledIds()).toEqual(before);
	});

	it("does nothing when run early", async () => {
		const user = await asNewUser();
		const cardId = await backAndShown(user, "standard");

		await user.root.mutation(internal.followUps.waiting.expireShownCard, {
			cardId,
		});

		expect((await readCard(user, cardId))?.status).toBe("shown");
	});

	it("leaves an answered card alone", async () => {
		const user = await asNewUser();
		const cardId = await backAndShown(user, "elevated");
		await user.t.mutation(api.followUps.resolveCard, {
			cardId,
			response: "lighter",
		});

		await advance(user, WAITING_CARD_LIFETIME_MS);

		expect(await readCard(user, cardId)).toMatchObject({
			status: "resolved",
			userResponse: "lighter",
		});
	});

	it("never expires a ready card the person hasn't seen", async () => {
		const user = await asNewUser();
		const cardId = await seedCard(user);
		vi.advanceTimersByTime(minReturnGapForTier("standard"));
		await user.t.mutation(api.followUps.markReturn, {});

		await advance(user, WAITING_CARD_LIFETIME_MS);

		expect(await readCard(user, cardId)).toMatchObject({
			readyAt: Date.now() - WAITING_CARD_LIFETIME_MS,
			status: "ready",
		});
		expect(await scheduledExpiries(user)).toEqual([]);
	});
});

describe("followUps.waiting.getWaitingCard", () => {
	it("returns a shown card inside the re-show cooldown", async () => {
		const user = await asNewUser();
		const cardId = await backAndShown(user, "acute");
		await user.root.run((ctx) =>
			ctx.db.patch("follow_up_cards", cardId, { escalationDerived: true })
		);

		// The old sheet stays quiet for 2 hours; the greeting and pill don't.
		expect(await user.t.query(api.followUps.getReadyCard, {})).toBeNull();
		expect(await waitingCard(user)).toEqual({
			_id: cardId,
			cardText: "How's it sitting now?",
			escalationDerived: true,
			shown: true,
			tier: "acute",
		});
	});

	it("returns a ready card as not shown, however old its session", async () => {
		const user = await asNewUser();
		// Pending for 10 days before the person came back.
		const cardId = await seedCard(user, {
			createdAt: Date.now() - 10 * DAY,
		});
		await user.t.mutation(api.followUps.markReturn, {});

		expect(await waitingCard(user)).toMatchObject({
			_id: cardId,
			shown: false,
		});
	});

	it("drops a card 3 days into its wait, even before its expiry runs", async () => {
		const user = await asNewUser();
		await seedCard(user, {
			firstShownAt: Date.now() - WAITING_CARD_LIFETIME_MS,
			shownAt: Date.now() - HOUR,
			status: "shown",
		});
		await seedCard(user, {
			readyAt: Date.now() - WAITING_CARD_LIFETIME_MS,
			status: "ready",
		});

		expect(await waitingCard(user)).toBeNull();
	});

	it("ages cards from before B1 by their last showing or creation", async () => {
		const user = await asNewUser();
		await seedCard(user, {
			createdAt: Date.now() - 4 * DAY,
			status: "ready",
		});
		expect(await waitingCard(user)).toBeNull();

		const legacyShown = await seedCard(user, {
			createdAt: Date.now() - 10 * DAY,
			shownAt: Date.now() - DAY,
			status: "shown",
		});
		expect(await waitingCard(user)).toMatchObject({ _id: legacyShown });
	});

	it("ignores closed and pending cards, and returns the newest waiting one", async () => {
		const user = await asNewUser();
		for (const status of [
			"pending",
			"resolved",
			"expired",
			"superseded",
		] as const) {
			await seedCard(user, { status });
		}
		expect(await waitingCard(user)).toBeNull();

		await seedCard(user, {
			createdAt: Date.now() - 2 * HOUR,
			readyAt: Date.now(),
			status: "ready",
		});
		const newest = await seedCard(user, {
			createdAt: Date.now() - HOUR,
			firstShownAt: Date.now(),
			status: "shown",
		});
		expect(await waitingCard(user)).toMatchObject({ _id: newest });
	});

	it("never returns another person's card", async () => {
		const owner = await asNewUser();
		const other = await asNewUser(2, owner.root);
		await seedCard(owner, { readyAt: Date.now(), status: "ready" });
		await seedCard(owner, { firstShownAt: Date.now(), status: "shown" });

		expect(await waitingCard(other)).toBeNull();
	});
});
