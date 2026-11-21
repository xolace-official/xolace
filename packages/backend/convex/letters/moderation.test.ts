// @vitest-environment edge-runtime
/**
 * The letters contract, slice 4 (spec: docs/plan/letters.md §4, §8, §9): what
 * a recipient can do with a letter (open, acknowledge, hide, unhide, report),
 * strikes and pauses, and the admin's review functions.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { expectCode, scheduledCalls } from "../test/fixtures.helpers";
import {
	asAdmin,
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { DAY_MS, PAUSE_DAYS, STRIKE_WINDOW_DAYS } from "./rules";

const captured = vi.hoisted(() => ({ events: [] as string[] }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => ({
	posthog: {
		capture: async (_ctx: unknown, e: { event: string }) => {
			captured.events.push(e.event);
		},
	},
}));

// 2026-11-19 12:00 UTC.
const NOW = Date.UTC(2026, 10, 19, 12);
const KIND_LETTER =
	"I don't know what you're carrying tonight, but the night ends. Be gentle with yourself.";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
	captured.events = [];
});
afterEach(() => vi.useRealTimers());

type Root = SeededUser["root"];

/** A sender, a recipient, and a letter placed with the recipient, unopened. */
async function placed(root = asUnauthed()) {
	const sender = await asNewUser(1, root);
	const reader = await asNewUser(2, root);
	const id = await root.run(async (ctx) => {
		const letterId = await ctx.db.insert("letters", {
			checkedAt: NOW,
			createdAt: NOW,
			language: "en",
			receivedAt: NOW,
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
			text: KIND_LETTER,
		});
		await ctx.db.insert("letter_profiles", {
			emotionalProfileId: reader.profileId,
			lastReceivedAt: NOW,
			optIn: "yes",
			pool: "out",
			tiebreak: 0.5,
			unopenedLetterId: letterId,
		});
		return letterId;
	});
	return { id, reader, root, sender };
}

const letterRow = (root: Root, id: Id<"letters">) =>
	root.run((ctx) => ctx.db.get("letters", id));

const readerRow = (root: Root, profileId: Id<"emotional_profiles">) =>
	root.run((ctx) =>
		ctx.db
			.query("letter_profiles")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
			.unique()
	);

const blocksOf = (root: Root, recipient: SeededUser) =>
	root.run((ctx) =>
		ctx.db
			.query("letter_blocks")
			.withIndex("by_pair", (q) =>
				q.eq("recipientProfileId", recipient.profileId)
			)
			.take(10)
	);

const reviews = (root: Root) =>
	root.run((ctx) =>
		ctx.db
			.query("letter_reviews")
			.withIndex("by_state_created", (q) => q.eq("state", "open"))
			.take(10)
	);

describe("letters.received acts", () => {
	it("open marks it opened and frees the unopened slot, once", async () => {
		const { id, reader, root } = await placed();
		await reader.t.mutation(api.letters.received.open, { id });
		await reader.t.mutation(api.letters.received.open, { id });
		expect((await letterRow(root, id))?.openedAt).toBe(NOW);
		expect((await readerRow(root, reader.profileId))?.unopenedLetterId).toBe(
			undefined
		);
		const [got] = await reader.t.query(api.letters.received.list, {});
		expect(got).toEqual({
			acknowledged: false,
			hidden: false,
			id,
			opened: true,
			text: KIND_LETTER,
		});
	});

	it("acknowledge works once and tells the sender, nothing about who", async () => {
		const { id, reader, root, sender } = await placed();
		await reader.t.mutation(api.letters.received.acknowledge, { id });
		vi.setSystemTime(NOW + 1000);
		await reader.t.mutation(api.letters.received.acknowledge, { id });
		expect(await letterRow(root, id)).toMatchObject({
			acknowledgedAt: NOW,
			openedAt: NOW,
		});
		const pushes = (await scheduledCalls(root)).filter((c) =>
			c.name.endsWith("letters/push:send")
		);
		expect(pushes.map((c) => c.args)).toEqual([
			{ letterId: id, to: sender.profileId, type: "letter_acknowledged" },
		]);
		const [row] = await sender.t.query(api.letters.sent.list, {});
		expect(row?.status).toBe("acknowledged");
		// Acknowledged without opening first: counted as opened too, once.
		expect(captured.events).toEqual(["letter_opened", "letter_acknowledged"]);
	});

	it("acknowledge after open counts the open once", async () => {
		const { id, reader } = await placed();
		await reader.t.mutation(api.letters.received.open, { id });
		await reader.t.mutation(api.letters.received.acknowledge, { id });
		expect(captured.events).toEqual(["letter_opened", "letter_acknowledged"]);
	});

	it("acknowledge after a report answers letter_not_found", async () => {
		const { id, reader, root } = await placed();
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "unkind",
		});
		await expectCode(
			() => reader.t.mutation(api.letters.received.acknowledge, { id }),
			"letter_not_found"
		);
		expect((await letterRow(root, id))?.acknowledgedAt).toBeUndefined();
	});

	it("hide blocks the sender; unhide shows it again and keeps the block", async () => {
		const { id, reader, root, sender } = await placed();
		await reader.t.mutation(api.letters.received.hide, { id });
		expect(
			(await reader.t.query(api.letters.received.get, { id }))?.hidden
		).toBe(true);
		await reader.t.mutation(api.letters.received.unhide, { id });
		expect(
			(await reader.t.query(api.letters.received.get, { id }))?.hidden
		).toBe(false);
		const blocks = await blocksOf(root, reader);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({
			cause: "hide",
			senderProfileId: sender.profileId,
		});
	});

	it("report removes it at once, blocks, and opens a review with no strike", async () => {
		const { id, reader, root, sender } = await placed();
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "selling",
		});
		// Again: nothing changes.
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "other",
		});
		expect(await reader.t.query(api.letters.received.list, {})).toEqual([]);
		expect(await reader.t.query(api.letters.received.get, { id })).toBeNull();
		expect(await blocksOf(root, reader)).toHaveLength(1);
		const open = await reviews(root);
		expect(open).toHaveLength(1);
		expect(open[0]).toMatchObject({ kind: "report", reason: "selling" });
		const strikes = await root.run((ctx) =>
			ctx.db
				.query("letter_strikes")
				.withIndex("by_sender_at", (q) =>
					q.eq("senderProfileId", sender.profileId)
				)
				.take(5)
		);
		expect(strikes).toEqual([]);
		// The sender is never told.
		const [row] = await sender.t.query(api.letters.sent.list, {});
		expect(row?.status).toBe("received");
		// Acting on it afterwards reads as not found.
		await expectCode(
			() => reader.t.mutation(api.letters.received.open, { id }),
			"letter_not_found"
		);
	});

	it("refuses every act on someone else's letter, and when signed out", async () => {
		const { id, root, sender } = await placed();
		const stranger = await asNewUser(3, root);
		for (const who of [sender, stranger]) {
			for (const act of [
				api.letters.received.open,
				api.letters.received.acknowledge,
				api.letters.received.hide,
				api.letters.received.unhide,
			]) {
				await expectCode(() => who.t.mutation(act, { id }), "letter_not_found");
			}
			await expectCode(
				() =>
					who.t.mutation(api.letters.received.report, { id, reason: "unkind" }),
				"letter_not_found"
			);
		}
		await expectCode(
			() => asUnauthed().mutation(api.letters.received.open, { id }),
			"not_authenticated"
		);
		const row = await letterRow(root, id);
		expect(row?.openedAt).toBeUndefined();
		expect(row?.hiddenAt).toBeUndefined();
		expect(row?.reportedAt).toBeUndefined();
	});
});

/** A held letter from `sender`, with its review and strike, as send writes it. */
async function held(root: Root, sender: SeededUser, at = Date.now()) {
	return await root.run(async (ctx) => {
		const letterId = await ctx.db.insert("letters", {
			createdAt: at,
			language: "en",
			senderProfileId: sender.profileId,
			status: "held",
			text: "unkind words",
			textHash: "h",
		});
		const reviewId = await ctx.db.insert("letter_reviews", {
			createdAt: at,
			kind: "held",
			letterId,
			state: "open",
		});
		await ctx.db.insert("letter_strikes", {
			at,
			cause: "held",
			reviewId,
			senderProfileId: sender.profileId,
		});
		return reviewId;
	});
}

const pauseOf = async (root: Root, sender: SeededUser) =>
	(await readerRow(root, sender.profileId))?.pausedUntil;

describe("api.admin.letters", () => {
	it("rejects anyone who isn't an admin", async () => {
		const { reader } = await placed();
		await expectCode(
			() =>
				reader.t.query(api.admin.letters.listQueue, {
					paginationOpts: { cursor: null, numItems: 10 },
				}),
			"forbidden"
		);
		await expectCode(
			() => reader.t.query(api.admin.letters.listPauses, {}),
			"forbidden"
		);
	});

	it("lists open reviews oldest first, with no text or identities", async () => {
		const { id, reader, root, sender } = await placed();
		const heldId = await held(root, sender, NOW - DAY_MS);
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "private",
		});
		const queue = await asAdmin(9, root).query(api.admin.letters.listQueue, {
			paginationOpts: { cursor: null, numItems: 10 },
		});
		expect(queue.page).toEqual([
			{
				createdAt: NOW - DAY_MS,
				kind: "held",
				priorStrikes: 0,
				reviewId: heldId,
			},
			{
				createdAt: NOW,
				kind: "report",
				priorStrikes: 1,
				reason: "private",
				reviewId: expect.any(String),
			},
		]);
		expect(JSON.stringify(queue)).not.toContain(sender.profileId);
		expect(JSON.stringify(queue)).not.toContain(KIND_LETTER);
	});

	it("openReview returns the words and writes an audit row", async () => {
		const { root, sender } = await placed();
		const reviewId = await held(root, sender);
		const admin = asAdmin(9, root);
		const opened = await admin.mutation(api.admin.letters.openReview, {
			reviewId,
		});
		expect(opened).toEqual({
			kind: "held",
			state: "open",
			text: "unkind words",
		});
		const audit = await root.run((ctx) =>
			ctx.db.query("admin_audit_log").take(5)
		);
		expect(audit).toHaveLength(1);
		expect(audit[0]).toMatchObject({
			action: "letter_viewed",
			adminClerkUserId: expect.any(String),
			letterReviewId: reviewId,
			targetClerkUserId: expect.any(String),
		});
	});

	it("a confirmed report is a strike, and two in 90 days pause for 30", async () => {
		const { id, reader, root, sender } = await placed();
		await held(root, sender, NOW - 10 * DAY_MS);
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "unkind",
		});
		const [report] = (await reviews(root)).filter((r) => r.kind === "report");
		const admin = asAdmin(9, root);
		await admin.mutation(api.admin.letters.decide, {
			decision: "confirm",
			reviewId: report!._id,
		});
		expect(await pauseOf(root, sender)).toBe(NOW + PAUSE_DAYS * DAY_MS);
		await expectCode(
			() =>
				admin.mutation(api.admin.letters.decide, {
					decision: "dismiss",
					reviewId: report!._id,
				}),
			"review_decided"
		);
	});

	it("a confirmed report with the other strike outside 90 days doesn't pause", async () => {
		const { id, reader, root, sender } = await placed();
		await held(root, sender, NOW - (STRIKE_WINDOW_DAYS + 1) * DAY_MS);
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "unkind",
		});
		const [report] = (await reviews(root)).filter((r) => r.kind === "report");
		await asAdmin(9, root).mutation(api.admin.letters.decide, {
			decision: "confirm",
			reviewId: report!._id,
		});
		expect(await pauseOf(root, sender)).toBeUndefined();
	});

	it("a dismissed report is no strike; a dismissed hold takes its strike back", async () => {
		const { id, reader, root, sender } = await placed();
		const heldId = await held(root, sender);
		await reader.t.mutation(api.letters.received.report, {
			id,
			reason: "other",
		});
		const admin = asAdmin(9, root);
		for (const review of await reviews(root)) {
			await admin.mutation(api.admin.letters.decide, {
				decision: "dismiss",
				reviewId: review._id,
			});
		}
		const strikes = await root.run((ctx) =>
			ctx.db
				.query("letter_strikes")
				.withIndex("by_sender_at", (q) =>
					q.eq("senderProfileId", sender.profileId)
				)
				.take(5)
		);
		expect(strikes).toEqual([]);
		expect(await pauseOf(root, sender)).toBeUndefined();
		// Still never placed.
		const heldReview = await root.run((ctx) =>
			ctx.db.get("letter_reviews", heldId)
		);
		const heldLetter = await letterRow(root, heldReview!.letterId);
		expect(heldLetter?.status).toBe("held");
	});

	it("pauses and lifts a sender by review, and lists active pauses by an opaque ref", async () => {
		const { root, sender } = await placed();
		const reviewId = await held(root, sender);
		const admin = asAdmin(9, root);
		await admin.mutation(api.admin.letters.pauseSender, { reviewId });
		const pauses = await admin.query(api.admin.letters.listPauses, {});
		expect(pauses).toEqual([
			{
				pausedBy: "admin",
				pauseRef: expect.any(String),
				strikes: 1,
				until: NOW + PAUSE_DAYS * DAY_MS,
			},
		]);
		expect(JSON.stringify(pauses)).not.toContain(sender.profileId);

		await admin.mutation(api.admin.letters.liftPause, {
			pauseRef: pauses[0]!.pauseRef,
		});
		expect(await admin.query(api.admin.letters.listPauses, {})).toEqual([]);
		expect(await pauseOf(root, sender)).toBeUndefined();
	});

	it("lifts a pause by the review that led to it", async () => {
		const { root, sender } = await placed();
		const reviewId = await held(root, sender);
		const admin = asAdmin(9, root);
		await admin.mutation(api.admin.letters.pauseSender, { reviewId });
		expect(await pauseOf(root, sender)).toBe(NOW + PAUSE_DAYS * DAY_MS);
		await admin.mutation(api.admin.letters.liftPause, { reviewId });
		expect(await pauseOf(root, sender)).toBeUndefined();
	});
});
