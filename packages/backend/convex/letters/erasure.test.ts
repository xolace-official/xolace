// @vitest-environment edge-runtime
/**
 * The letters contract, slice 5 (spec: docs/plan/letters.md §10, decision B):
 * what account deletion, a data wipe, the retention setting and the daily
 * letters retention do to letters, reviews, blocks, strikes and pauses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	asAdmin,
	asNewUser,
	asUnauthed,
	type SeededUser,
} from "../test/harness.helpers";
import { aggregatesMock, posthogMock } from "../test/mocks.helpers";
import { releaseAsSender } from "./erasure";
import { DAY_MS, ERASE_BATCH } from "./rules";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
// Account deletion's push teardown: the component isn't registered in tests.
vi.mock("../lib/pushNotifications", async (orig) => ({
	...(await orig<typeof import("../lib/pushNotifications")>()),
	profilePushDevices: async () => [],
	pushNotifications: { removeToken: async () => null },
}));

// 2026-11-19 12:00 UTC.
const NOW = Date.UTC(2026, 10, 19, 12);
const TEXT =
	"I don't know what you're carrying tonight, but the night ends. Be gentle with yourself.";

beforeEach(() => {
	vi.useFakeTimers();
	vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

type Root = SeededUser["root"];
type ProfileId = Id<"emotional_profiles">;

async function pair(root = asUnauthed()) {
	const sender = await asNewUser(1, root);
	const reader = await asNewUser(2, root);
	return { reader, root, sender };
}

/** A letter row; received ones need a `recipientProfileId`. */
function letter(
	root: Root,
	fields: Partial<Doc<"letters">> & Pick<Doc<"letters">, "status">
) {
	return root.run((ctx) =>
		ctx.db.insert("letters", {
			createdAt: NOW,
			language: "en",
			text: TEXT,
			...(fields.status === "received" && {
				checkedAt: NOW,
				receivedAt: NOW,
			}),
			...fields,
		})
	);
}

function review(
	root: Root,
	letterId: Id<"letters">,
	fields: Partial<Doc<"letter_reviews">> & Pick<Doc<"letter_reviews">, "kind">
) {
	return root.run((ctx) =>
		ctx.db.insert("letter_reviews", {
			createdAt: NOW,
			letterId,
			state: "open",
			...fields,
		})
	);
}

function letterProfile(
	root: Root,
	profileId: ProfileId,
	fields: Partial<Doc<"letter_profiles">> = {}
) {
	return root.run((ctx) =>
		ctx.db.insert("letter_profiles", {
			emotionalProfileId: profileId,
			lastReceivedAt: 0,
			optIn: "yes",
			pool: "out",
			tiebreak: 0.5,
			...fields,
		})
	);
}

const block = (root: Root, recipient: ProfileId, sender: ProfileId) =>
	root.run((ctx) =>
		ctx.db.insert("letter_blocks", {
			cause: "hide",
			createdAt: NOW,
			recipientProfileId: recipient,
			senderProfileId: sender,
		})
	);

const strike = (
	root: Root,
	sender: ProfileId,
	reviewId: Id<"letter_reviews">,
	at = NOW
) =>
	root.run((ctx) =>
		ctx.db.insert("letter_strikes", {
			at,
			cause: "held",
			reviewId,
			senderProfileId: sender,
		})
	);

const get = <T extends "letters" | "letter_reviews" | "letter_strikes">(
	root: Root,
	table: T,
	id: Id<T>
) => root.run((ctx) => ctx.db.get(table, id));

const profileRow = (root: Root, profileId: ProfileId) =>
	root.run((ctx) =>
		ctx.db
			.query("letter_profiles")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
			.unique()
	);

const allBlocks = (root: Root) =>
	root.run((ctx) => ctx.db.query("letter_blocks").take(20));
const allStrikes = (root: Root) =>
	root.run((ctx) => ctx.db.query("letter_strikes").take(20));

/** Which ends of a letter row still hold it (a field `undefined` is absent). */
async function ends(root: Root, id: Id<"letters">) {
	const row = await get(root, "letters", id);
	return (
		row && { recipient: row.recipientProfileId, sender: row.senderProfileId }
	);
}

async function deleteAccount(user: SeededUser) {
	await user.root.run((ctx) =>
		ctx.db.patch("users", user.userId, { accountStatus: "purging" })
	);
	await user.root.mutation(internal.jobs.accountDeletion.purgeUser, {
		userId: user.userId,
	});
}

const wipe = (user: SeededUser) =>
	user.root.mutation(internal.jobs.dataWipe.wipe, {
		emotionalProfileId: user.profileId,
	});

/** The Clerk id an audit row names: the token's subject (`harness.helpers`). */
const clerkIdOf = async (user: SeededUser) =>
	(
		await user.root.run((ctx) => ctx.db.get("users", user.userId))
	)?.tokenIdentifier
		.split("|")
		.at(-1) ?? "";

const audit = (
	root: Root,
	action: Doc<"admin_audit_log">["action"],
	at: number,
	targetClerkUserId?: string
) =>
	root.run((ctx) =>
		ctx.db.insert("admin_audit_log", {
			action,
			adminClerkUserId: "admin",
			at,
			...(targetClerkUserId && { targetClerkUserId }),
		})
	);

describe("account deletion", () => {
	it("a sender's unplaced letters go; reviewed ones close as dismissed; received ones stay with their recipients", async () => {
		const { reader, root, sender } = await pair();
		const from = { senderProfileId: sender.profileId };
		const waiting = await letter(root, { ...from, status: "waiting" });
		const unchecked = await letter(root, { ...from, status: "unchecked" });
		const returned = await letter(root, { ...from, status: "returned" });
		const held = await letter(root, { ...from, status: "held" });
		const heldReview = await review(root, held, { kind: "held" });
		const kept = await letter(root, {
			...from,
			recipientProfileId: reader.profileId,
			status: "received",
		});
		const reported = await letter(root, {
			...from,
			recipientProfileId: reader.profileId,
			reportedAt: NOW,
			status: "received",
		});
		const reportReview = await review(root, reported, {
			kind: "report",
			reason: "unkind",
			reporterProfileId: reader.profileId,
		});

		await deleteAccount(sender);

		for (const id of [waiting, unchecked, returned]) {
			expect(await get(root, "letters", id)).toBeNull();
		}
		// Under review: kept for the decided clock, cut from the sender, and
		// closed as dismissed by no one (owner, 19 Nov 2026).
		for (const [id, reviewId] of [
			[held, heldReview],
			[reported, reportReview],
		] as const) {
			expect((await ends(root, id))?.sender).toBeUndefined();
			const closed = await get(root, "letter_reviews", reviewId);
			expect(closed).toMatchObject({ decidedAt: NOW, state: "dismissed" });
			expect(closed?.decidedBy).toBeUndefined();
			expect(closed?.senderProfileId).toBeUndefined();
		}
		// 30 days after that dismissal, their text goes.
		vi.setSystemTime(NOW + 31 * DAY_MS);
		await root.mutation(internal.letters.retention.run, {});
		for (const id of [held, reported]) {
			expect(await get(root, "letters", id)).toBeNull();
		}
		expect(await ends(root, kept)).toEqual({
			recipient: reader.profileId,
			sender: undefined,
		});
		const list = await reader.t.query(api.letters.received.list, {});
		expect(list.map((l) => l.id)).toEqual([kept]);
	});

	it("a sender's strikes, pause, blocks and letters row go", async () => {
		const { reader, root, sender } = await pair();
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		await strike(
			root,
			sender.profileId,
			await review(root, held, { kind: "held" })
		);
		await block(root, reader.profileId, sender.profileId);
		await letterProfile(root, sender.profileId, {
			pausedBy: "strikes",
			pausedUntil: NOW + 30 * DAY_MS,
		});

		await deleteAccount(sender);

		expect(await allStrikes(root)).toEqual([]);
		expect(await allBlocks(root)).toEqual([]);
		expect(await profileRow(root, sender.profileId)).toBeNull();
	});

	it("closes the reviews an earlier wipe moved the sender onto", async () => {
		const { root, sender } = await pair();
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const open = await review(root, held, { kind: "held" });
		await wipe(sender);
		expect((await get(root, "letter_reviews", open))?.senderProfileId).toBe(
			sender.profileId
		);

		await deleteAccount(sender);

		const closed = await get(root, "letter_reviews", open);
		expect(closed).toMatchObject({ decidedAt: NOW, state: "dismissed" });
		expect(closed?.senderProfileId).toBeUndefined();
		// An admin can tell this from a person's dismissal.
		expect(
			await asAdmin(9, root).mutation(api.admin.letters.openReview, {
				reviewId: open,
			})
		).toMatchObject({ closedBy: "account_deleted", state: "dismissed" });
	});

	it("clears the sender's Clerk id from letter_viewed audit rows, not outreach_viewed", async () => {
		const { root, sender } = await pair();
		const clerkId = await clerkIdOf(sender);
		const viewed = await audit(root, "letter_viewed", NOW, clerkId);
		const outreach = await audit(root, "outreach_viewed", NOW, clerkId);

		await deleteAccount(sender);

		const row = await root.run((ctx) => ctx.db.get("admin_audit_log", viewed));
		expect(row).not.toBeNull();
		expect(row?.targetClerkUserId).toBeUndefined();
		expect(
			(await root.run((ctx) => ctx.db.get("admin_audit_log", outreach)))
				?.targetClerkUserId
		).toBe(clerkId);
	});

	it("a recipient's letters leave them; the sender's Sent row keeps its status", async () => {
		const { reader, root, sender } = await pair();
		const acknowledged = await letter(root, {
			acknowledgedAt: NOW,
			hiddenAt: NOW,
			openedAt: NOW,
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const reported = await letter(root, {
			recipientProfileId: reader.profileId,
			reportedAt: NOW,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const report = await review(root, reported, {
			kind: "report",
			reason: "selling",
			reporterProfileId: reader.profileId,
		});
		// Its sender already deleted their account: nobody holds it now.
		const orphan = await letter(root, {
			recipientProfileId: reader.profileId,
			status: "received",
		});
		await block(root, reader.profileId, sender.profileId);
		await letterProfile(root, reader.profileId);

		await deleteAccount(reader);

		expect(await ends(root, acknowledged)).toEqual({
			recipient: undefined,
			sender: sender.profileId,
		});
		expect(
			(await get(root, "letters", acknowledged))?.hiddenAt
		).toBeUndefined();
		expect(await get(root, "letters", orphan)).toBeNull();
		// The report stays for review, cut from the reporter.
		const kept = await get(root, "letter_reviews", report);
		expect(kept?.state).toBe("open");
		expect(kept?.reporterProfileId).toBeUndefined();
		expect(await get(root, "letters", reported)).not.toBeNull();
		expect(await allBlocks(root)).toEqual([]);
		expect(await profileRow(root, reader.profileId)).toBeNull();

		const sent = await sender.t.query(api.letters.sent.list, {});
		expect(sent.map((s) => [s.id, s.status])).toEqual(
			expect.arrayContaining([
				[acknowledged, "acknowledged"],
				[reported, "received"],
			])
		);
	});
});

describe("data wipe", () => {
	it("drops their letters like deletion, keeps the opt-in, and resets the pool", async () => {
		const { reader, root, sender } = await pair();
		const unopened = await letter(root, {
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const own = await letter(root, {
			senderProfileId: reader.profileId,
			status: "waiting",
		});
		await block(root, reader.profileId, sender.profileId);
		await letterProfile(root, reader.profileId, {
			aim: "grief",
			band: "heavier",
			language: "en",
			lastSentDay: "2026-11-19",
			locale: "en-GB",
			metadataAt: NOW,
			pool: "ready",
			poolCheckAt: NOW + DAY_MS,
			unopenedLetterId: unopened,
		});

		await wipe(reader);

		expect(await get(root, "letters", own)).toBeNull();
		expect(await ends(root, unopened)).toEqual({
			recipient: undefined,
			sender: sender.profileId,
		});
		expect(await reader.t.query(api.letters.received.list, {})).toEqual([]);
		// The sender they hid stays hidden from them (owner, 19 Nov 2026).
		expect(await allBlocks(root)).toHaveLength(1);
		const row = await profileRow(root, reader.profileId);
		expect(row).toMatchObject({
			language: "en",
			lastSentDay: "2026-11-19",
			locale: "en-GB",
			optIn: "yes",
			pool: "out",
		});
		expect(row?.aim).toBeUndefined();
		expect(row?.band).toBeUndefined();
		expect(row?.unopenedLetterId).toBeUndefined();
		expect(row?.poolCheckAt).toBeUndefined();
	});

	it("keeps a sender's strikes, pause and other people's blocks of them", async () => {
		const { reader, root, sender } = await pair();
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		await strike(
			root,
			sender.profileId,
			await review(root, held, { kind: "held", state: "confirmed" })
		);
		await block(root, reader.profileId, sender.profileId);
		await letterProfile(root, sender.profileId, {
			pausedBy: "admin",
			pausedUntil: NOW + 30 * DAY_MS,
		});

		await wipe(sender);

		// Decided already: nothing left to keep it for.
		expect(await get(root, "letters", held)).toBeNull();
		expect(await allStrikes(root)).toHaveLength(1);
		expect(await allBlocks(root)).toHaveLength(1);
		expect(await profileRow(root, sender.profileId)).toMatchObject({
			pausedBy: "admin",
			pausedUntil: NOW + 30 * DAY_MS,
		});
	});
});

describe("a wipe and an open review", () => {
	it("keeps the letter for its review, which a person can still strike the sender on", async () => {
		const { reader, root, sender } = await pair();
		const reported = await letter(root, {
			recipientProfileId: reader.profileId,
			reportedAt: NOW,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const reportReview = await review(root, reported, {
			kind: "report",
			reason: "unkind",
			reporterProfileId: reader.profileId,
		});
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const heldReview = await review(root, held, { kind: "held" });

		await wipe(sender);

		for (const [id, reviewId] of [
			[reported, reportReview],
			[held, heldReview],
		] as const) {
			expect((await ends(root, id))?.sender).toBeUndefined();
			expect(await get(root, "letter_reviews", reviewId)).toMatchObject({
				senderProfileId: sender.profileId,
				state: "open",
			});
		}
		expect(await sender.t.query(api.letters.sent.list, {})).toEqual([]);

		const admin = asAdmin(9, root);
		expect(
			await admin.mutation(api.admin.letters.openReview, {
				reviewId: reportReview,
			})
		).toMatchObject({ text: TEXT });
		const [view] = await root.run((ctx) =>
			ctx.db.query("admin_audit_log").take(5)
		);
		expect(view?.targetClerkUserId).toBe(await clerkIdOf(sender));
		await admin.mutation(api.admin.letters.decide, {
			decision: "confirm",
			reviewId: reportReview,
		});
		expect(await allStrikes(root)).toMatchObject([
			{ cause: "report", senderProfileId: sender.profileId },
		]);
		await admin.mutation(api.admin.letters.pauseSender, {
			reviewId: heldReview,
		});
		expect(await profileRow(root, sender.profileId)).toMatchObject({
			pausedBy: "admin",
		});
		expect(
			await admin.mutation(api.admin.letters.openReview, {
				reviewId: reportReview,
			})
		).toMatchObject({ closedBy: "admin", state: "confirmed" });
	});

	it("dismissing a held review after a wipe takes back the sender's strike", async () => {
		const { root, sender } = await pair();
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const heldReview = await review(root, held, { kind: "held" });
		const createdAt = (await get(root, "letter_reviews", heldReview))
			?.createdAt;
		await strike(root, sender.profileId, heldReview, createdAt);
		const otherReview = await review(
			root,
			await letter(root, { senderProfileId: sender.profileId, status: "held" }),
			{ kind: "held" }
		);
		await strike(root, sender.profileId, otherReview, createdAt);

		await wipe(sender);
		await asAdmin(9, root).mutation(api.admin.letters.decide, {
			decision: "dismiss",
			reviewId: heldReview,
		});

		// Only this review's strike goes; the wipe kept the sender's strikes.
		expect(await allStrikes(root)).toMatchObject([
			{ reviewId: otherReview, senderProfileId: sender.profileId },
		]);
	});
});

describe("a wipe and the recipient's hide or report", () => {
	it("a report after the sender's wipe blocks them, and a confirm strikes them", async () => {
		const { reader, root, sender } = await pair();
		const received = await letter(root, {
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		await wipe(sender);
		expect(await get(root, "letters", received)).toMatchObject({
			wipedSenderProfileId: sender.profileId,
		});
		expect((await ends(root, received))?.sender).toBeUndefined();

		await reader.t.mutation(api.letters.received.report, {
			id: received,
			reason: "unkind",
		});
		expect(await allBlocks(root)).toMatchObject([
			{
				recipientProfileId: reader.profileId,
				senderProfileId: sender.profileId,
			},
		]);
		const [reportReview] = await root.run((ctx) =>
			ctx.db.query("letter_reviews").take(5)
		);
		if (!reportReview) {
			throw new Error("no review");
		}
		const admin = asAdmin(9, root);
		await admin.mutation(api.admin.letters.decide, {
			decision: "confirm",
			reviewId: reportReview._id,
		});
		expect(await allStrikes(root)).toMatchObject([
			{ cause: "report", senderProfileId: sender.profileId },
		]);
		await admin.mutation(api.admin.letters.pauseSender, {
			reviewId: reportReview._id,
		});
		expect(await profileRow(root, sender.profileId)).toMatchObject({
			pausedBy: "admin",
		});
	});

	it("account deletion removes the link a wipe left", async () => {
		const { reader, root, sender } = await pair();
		const received = await letter(root, {
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		await wipe(sender);
		await deleteAccount(sender);

		const row = await get(root, "letters", received);
		expect(row?.recipientProfileId).toBe(reader.profileId);
		expect(row?.senderProfileId).toBeUndefined();
		expect(row?.wipedSenderProfileId).toBeUndefined();
		// A hide now blocks no one: the sender is unreachable.
		await reader.t.mutation(api.letters.received.hide, { id: received });
		expect(await allBlocks(root)).toEqual([]);
	});

	it("the retention setting keeps the link, so a later hide still blocks", async () => {
		const { reader, root, sender } = await pair();
		const received = await letter(root, {
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		await root.run(async (ctx) => {
			const row = await ctx.db.get("letters", received);
			if (row) {
				await releaseAsSender(ctx, row, "retention");
			}
		});
		expect(await get(root, "letters", received)).toMatchObject({
			wipedSenderProfileId: sender.profileId,
		});
		expect((await ends(root, received))?.sender).toBeUndefined();

		await reader.t.mutation(api.letters.received.hide, { id: received });
		expect(await allBlocks(root)).toMatchObject([
			{
				recipientProfileId: reader.profileId,
				senderProfileId: sender.profileId,
			},
		]);
	});
});

describe("batches", () => {
	it("a wipe drains more letters than a batch over several passes, then resets the pool", async () => {
		const { reader, root } = await pair();
		await letterProfile(root, reader.profileId, { pool: "ready" });
		await root.run(async (ctx) => {
			for (let i = 0; i < ERASE_BATCH + 5; i++) {
				await ctx.db.insert("letters", {
					createdAt: NOW - i,
					language: "en",
					senderProfileId: reader.profileId,
					status: "returned",
					text: TEXT,
				});
			}
		});
		const left = () =>
			root.run(async (ctx) => (await ctx.db.query("letters").collect()).length);

		await wipe(reader);
		expect(await left()).toBe(5);
		// Not reset until its letters are gone.
		expect((await profileRow(root, reader.profileId))?.pool).toBe("ready");

		await wipe(reader);
		expect(await left()).toBe(0);
		expect((await profileRow(root, reader.profileId))?.pool).toBe("out");
	});

	it("letters.retention.run goes on past a batch, and a second run changes nothing", async () => {
		const { root, sender } = await pair();
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const reviewId = await review(root, held, { kind: "held" });
		await root.run(async (ctx) => {
			for (let i = 0; i < ERASE_BATCH + 5; i++) {
				await ctx.db.insert("letter_strikes", {
					at: NOW - 121 * DAY_MS - i,
					cause: "held",
					reviewId,
					senderProfileId: sender.profileId,
				});
			}
		});
		const strikesLeft = async () => (await allStrikes(root)).length;
		const runs = async () =>
			(
				await root.run((ctx) =>
					ctx.db.system.query("_scheduled_functions").collect()
				)
			).filter((j) => j.name === "letters/retention:run").length;

		await root.mutation(internal.letters.retention.run, {});
		expect(await strikesLeft()).toBe(5);
		expect(await runs()).toBe(1);

		await root.mutation(internal.letters.retention.run, {});
		expect(await strikesLeft()).toBe(0);
		expect(await runs()).toBe(1);

		await root.mutation(internal.letters.retention.run, {});
		expect(await get(root, "letters", held)).not.toBeNull();
		expect(await get(root, "letter_reviews", reviewId)).not.toBeNull();
		expect(await runs()).toBe(1);
	});
});

describe("the retention setting", () => {
	async function sixMonths(user: SeededUser) {
		await user.root.run(async (ctx) => {
			const prefs = await ctx.db
				.query("preferences")
				.withIndex("by_profile", (q) =>
					q.eq("emotionalProfileId", user.profileId)
				)
				.unique();
			if (prefs) {
				await ctx.db.patch("preferences", prefs._id, {
					dataRetentionPreference: "6_months",
				});
			}
		});
	}
	const OLD = NOW - 200 * DAY_MS;
	const RECENT = NOW - 10 * DAY_MS;

	it("deletes each side's own letters past the cutoff, never the other side's", async () => {
		const { reader, root, sender } = await pair();
		await sixMonths(sender);
		const oldReturned = await letter(root, {
			createdAt: OLD,
			senderProfileId: sender.profileId,
			status: "returned",
		});
		const oldReceived = await letter(root, {
			createdAt: OLD,
			receivedAt: OLD,
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const recent = await letter(root, {
			createdAt: RECENT,
			senderProfileId: sender.profileId,
			status: "returned",
		});

		await root.mutation(internal.jobs.dataRetention.enforce, {
			tier: "6_months",
		});

		expect(await get(root, "letters", oldReturned)).toBeNull();
		expect(await get(root, "letters", recent)).not.toBeNull();
		// Still the reader's: their own setting keeps it.
		expect(await ends(root, oldReceived)).toEqual({
			recipient: reader.profileId,
			sender: undefined,
		});
		expect(
			(await reader.t.query(api.letters.received.list, {})).map((l) => l.id)
		).toEqual([oldReceived]);
	});

	it("takes old letters from a recipient and frees their unopened slot", async () => {
		const { reader, root, sender } = await pair();
		await sixMonths(reader);
		const old = await letter(root, {
			createdAt: OLD,
			receivedAt: OLD,
			recipientProfileId: reader.profileId,
			senderProfileId: sender.profileId,
			status: "received",
		});
		await letterProfile(root, reader.profileId, { unopenedLetterId: old });

		await root.mutation(internal.jobs.dataRetention.enforce, {
			tier: "6_months",
		});

		expect(await ends(root, old)).toEqual({
			recipient: undefined,
			sender: sender.profileId,
		});
		expect(await reader.t.query(api.letters.received.list, {})).toEqual([]);
		expect(
			(await profileRow(root, reader.profileId))?.unopenedLetterId
		).toBeUndefined();
		const [sent] = await sender.t.query(api.letters.sent.list, {});
		expect(sent?.status).toBe("received");
	});

	it("keeps a letter still under review, cut from its sender", async () => {
		const { reader, root, sender } = await pair();
		await sixMonths(sender);
		const reported = await letter(root, {
			createdAt: OLD,
			receivedAt: OLD,
			recipientProfileId: reader.profileId,
			reportedAt: RECENT,
			senderProfileId: sender.profileId,
			status: "received",
		});
		await review(root, reported, {
			createdAt: RECENT,
			kind: "report",
			reason: "other",
		});

		await root.mutation(internal.jobs.dataRetention.enforce, {
			tier: "6_months",
		});

		expect(await ends(root, reported)).toEqual({
			recipient: reader.profileId,
			sender: undefined,
		});
	});
});

describe("letters.retention.run", () => {
	it("deletes reviewed text 30 days after the decision", async () => {
		const { reader, root, sender } = await pair();
		const decidedAt = NOW - 31 * DAY_MS;
		const held = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const heldReview = await review(root, held, {
			decidedAt,
			kind: "held",
			state: "dismissed",
		});
		// A report on a letter its sender still has in Sent: its text goes too
		// (owner, 19 Nov 2026).
		const sendersOwn = await letter(root, {
			recipientProfileId: reader.profileId,
			reportedAt: NOW,
			senderProfileId: sender.profileId,
			status: "received",
		});
		const sendersOwnReview = await review(root, sendersOwn, {
			decidedAt,
			kind: "report",
			state: "confirmed",
		});
		// A report on a letter whose sender is gone: nobody holds it.
		const orphan = await letter(root, {
			recipientProfileId: reader.profileId,
			reportedAt: NOW,
			status: "received",
		});
		await review(root, orphan, {
			decidedAt,
			kind: "report",
			state: "confirmed",
		});
		const recent = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		await review(root, recent, {
			decidedAt: NOW - 10 * DAY_MS,
			kind: "held",
			state: "confirmed",
		});

		await root.mutation(internal.letters.retention.run, {});

		expect(await get(root, "letters", held)).toBeNull();
		expect(await get(root, "letter_reviews", heldReview)).toBeNull();
		expect(await get(root, "letters", sendersOwn)).toBeNull();
		expect(await get(root, "letter_reviews", sendersOwnReview)).toBeNull();
		expect(await get(root, "letters", orphan)).toBeNull();
		expect(await get(root, "letters", recent)).not.toBeNull();
	});

	it("deletes letter_viewed audit rows after a year, never outreach_viewed", async () => {
		const { root } = await pair();
		const old = await audit(root, "letter_viewed", NOW - 366 * DAY_MS);
		const recent = await audit(root, "letter_viewed", NOW - 300 * DAY_MS);
		const outreach = await audit(root, "outreach_viewed", NOW - 400 * DAY_MS);

		await root.mutation(internal.letters.retention.run, {});

		const row = (id: Id<"admin_audit_log">) =>
			root.run((ctx) => ctx.db.get("admin_audit_log", id));
		expect(await row(old)).toBeNull();
		expect(await row(recent)).not.toBeNull();
		expect(await row(outreach)).not.toBeNull();
	});

	it("deletes undecided text after 180 days, and strikes after 120", async () => {
		const { root, sender } = await pair();
		const stale = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const staleReview = await review(root, stale, {
			createdAt: NOW - 181 * DAY_MS,
			kind: "held",
		});
		const pending = await letter(root, {
			senderProfileId: sender.profileId,
			status: "held",
		});
		const pendingReview = await review(root, pending, {
			createdAt: NOW - 100 * DAY_MS,
			kind: "held",
		});
		const oldStrike = await strike(
			root,
			sender.profileId,
			staleReview,
			NOW - 121 * DAY_MS
		);
		const liveStrike = await strike(
			root,
			sender.profileId,
			pendingReview,
			NOW - 100 * DAY_MS
		);

		await root.mutation(internal.letters.retention.run, {});

		expect(await get(root, "letters", stale)).toBeNull();
		expect(await get(root, "letter_reviews", staleReview)).toBeNull();
		expect(await get(root, "letters", pending)).not.toBeNull();
		expect(await get(root, "letter_strikes", oldStrike)).toBeNull();
		expect(await get(root, "letter_strikes", liveStrike)).not.toBeNull();
	});
});
