// @vitest-environment edge-runtime
/**
 * "Just end": the mirror is still made, then the talk closes into the
 * timeline. Failure modes: home picks the talk up and opens its processing →
 * mirror screens anyway; the talk closes before its reading is stored, so the
 * completion's jobs miss it; the delivered mirror is left open, or never
 * counts as a reflection; an escalated mirror closes silently, its help
 * unseen; a failed mirror shows its error on home, or is never retried, or
 * retries forever; a talk with nothing said gets a mirror; an old client (no
 * `mirrorLater`) stops getting its mirror on home.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { seedMetadata } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import {
	aggregatesMock,
	posthogMock,
	ragMock,
	rateLimiterMock,
	revenuecatMock,
} from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../lib/rateLimits", async (orig) => ({
	...(await orig<typeof import("../lib/rateLimits")>()),
	...rateLimiterMock(),
}));
vi.mock("../revenuecat", () => revenuecatMock(() => true));

beforeEach(() => {
	// setTimeout too: the scheduled mirror generation waits, and each test delivers its own.
	vi.useFakeTimers({ toFake: ["Date", "setTimeout"] });
	vi.setSystemTime(Date.UTC(2026, 9, 21, 12));
	return () => vi.useRealTimers();
});

const MIRROR = {
	mirrorModelVersion: "test-mirror-v1",
	mirrorText: "It's a lot.",
	toneUsed: "gentle" as const,
};

/** A talk where the person said something, still open. */
async function talk(user: SeededUser, said = "Work is too much.") {
	const { sessionId, talkKey } = await user.t.mutation(
		internal.talk.session.start,
		{ secret: crypto.randomUUID(), startedAt: Date.now() }
	);
	const lines = said ? [{ role: "person" as const, text: said }] : [];
	await user.t.mutation(internal.talk.turns.syncLines, {
		lines,
		sessionId,
		talkKey,
	});
	return sessionId;
}

const session = (user: SeededUser, id: Id<"sessions">) =>
	user.root.run((ctx) => ctx.db.get("sessions", id));
const reflects = (user: SeededUser) =>
	user.root.run((ctx) =>
		ctx.db
			.query("activity_log")
			.withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) =>
				q.eq("emotionalProfileId", user.profileId)
			)
			.collect()
	);

describe("talk.session.end with mirrorLater", () => {
	it("makes the mirror for the timeline, not home, and closes it as a reflection", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);

		expect(
			await user.t.mutation(api.talk.session.end, {
				mirrorLater: true,
				sessionId,
			})
		).toBe(true);
		expect(await session(user, sessionId)).toMatchObject({
			state: "processing",
			talkMirrorLater: true,
		});
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();

		await user.root.mutation(internal.sessions.deliverMirror, {
			sessionId,
			...MIRROR,
		});
		// Delivered, but its reading isn't stored yet: still open, still hidden.
		await user.root.mutation(internal.sessions.closeMirrorLater, {
			sessionId,
		});
		expect(await session(user, sessionId)).toMatchObject({
			state: "mirror_delivered",
		});
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();

		// generateMirror's tail: the reading is in, so it closes.
		await seedMetadata(user.root, sessionId, user.profileId);
		await user.root.mutation(internal.sessions.closeMirrorLater, {
			sessionId,
		});
		expect(await session(user, sessionId)).toMatchObject({
			mirrorText: MIRROR.mirrorText,
			pathCompleted: false,
			state: "completed",
		});
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();
		expect((await reflects(user)).map((a) => a.actionType)).toContain(
			"reflect"
		);

		// The distiller lands after the close; episodic memory still reads it.
		await user.root.mutation(internal.sessions.storeDistilledText, {
			distilledText: "Work is heavy.",
			sessionId,
		});
		expect((await session(user, sessionId))?.distilledText).toBe(
			"Work is heavy."
		);
	});

	it("leaves an escalated mirror open for home, with its help", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});

		await user.root.mutation(internal.sessions.deliverMirror, {
			escalationTriggered: true,
			sessionId,
			...MIRROR,
		});
		const s = await session(user, sessionId);
		expect(s).toMatchObject({ state: "mirror_delivered" });
		expect(s?.talkMirrorLater).toBeUndefined();
		expect((await user.t.query(api.sessions.getActive, {}))?._id).toBe(
			sessionId
		);
	});

	it("closes a mirror already delivered when the end lands second", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		// The disconnect's plain end, then its mirror, before the "End" call.
		await user.t.mutation(api.talk.session.end, { sessionId });
		await user.root.mutation(internal.sessions.deliverMirror, {
			sessionId,
			...MIRROR,
		});
		await seedMetadata(user.root, sessionId, user.profileId);

		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});
		await user.t.mutation(internal.sessions.closeMirrorLater, { sessionId });
		expect(await session(user, sessionId)).toMatchObject({
			state: "completed",
		});
	});

	it("completes a delivered mirror the pipeline never closed, without the day's wait", async () => {
		const user = await asNewUser();
		const ended = await talk(user);
		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId: ended,
		});
		// An old client's talk, delivered alongside: it still waits the day.
		const other = await asNewUser(2, user.root);
		const kept = await talk(other);
		await other.t.mutation(api.talk.session.end, { sessionId: kept });
		for (const sessionId of [ended, kept]) {
			await user.root.mutation(internal.sessions.deliverMirror, {
				sessionId,
				...MIRROR,
			});
		}

		// The cron's 30 minutes, not the 24 hours a talk waits for its person.
		vi.setSystemTime(Date.now() + 31 * 60 * 1000);
		await user.root.mutation(internal.sessions.checkAbandoned, {});
		expect(await session(user, ended)).toMatchObject({
			pathCompleted: false,
			state: "completed",
		});
		expect(await session(other, kept)).toMatchObject({
			state: "mirror_delivered",
		});
	});

	it("retries a failed mirror on the server, never on home, then drops it", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});
		const fail = () =>
			user.root.mutation(internal.sessions.failSession, {
				errorMessage: "Something interrupted this moment.",
				sessionId,
			});

		for (let attempt = 1; attempt <= 3; attempt++) {
			await fail();
			expect(await session(user, sessionId)).toMatchObject({
				state: "error",
				talkMirrorRetries: attempt,
			});
			expect(await user.t.query(api.sessions.getActive, {})).toBeNull();
			await user.root.mutation(internal.sessions.retryMirrorLater, {
				sessionId,
			});
			expect(await session(user, sessionId)).toMatchObject({
				state: "processing",
			});
		}

		// Out of retries: it goes quietly, like a talk nobody came back to.
		await fail();
		expect(await session(user, sessionId)).toMatchObject({
			state: "abandoned",
		});
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();
	});

	it("drops a refused mirror without a retry or an error on home", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});
		await user.root.mutation(internal.sessions.failSession, {
			errorMessage: "content_policy_violation",
			rejected: true,
			sessionId,
		});
		const s = await session(user, sessionId);
		expect(s).toMatchObject({ state: "abandoned" });
		expect(s?.talkMirrorRetries).toBeUndefined();
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();
	});

	it("keeps an old client's failed talk on home, for its retry", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, { sessionId });
		await user.root.mutation(internal.sessions.failSession, {
			errorMessage: "Something interrupted this moment.",
			sessionId,
		});
		expect(await user.t.query(api.sessions.getActive, {})).toMatchObject({
			_id: sessionId,
			state: "error",
		});
		// Retry with no text from the client: the server reprocesses what it stored.
		await user.t.mutation(api.sessions.retrySession, { sessionId });
		expect(await session(user, sessionId)).toMatchObject({
			state: "processing",
		});
	});

	it("still makes no mirror when nothing was said", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user, "");
		expect(
			await user.t.mutation(api.talk.session.end, {
				mirrorLater: true,
				sessionId,
			})
		).toBe(false);
		const s = await session(user, sessionId);
		expect(s).toMatchObject({ state: "abandoned" });
		expect(s?.talkMirrorLater).toBeUndefined();
	});

	it("keeps an old client's talk on home for its mirror", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, { sessionId });
		expect((await user.t.query(api.sessions.getActive, {}))?._id).toBe(
			sessionId
		);
	});
});
