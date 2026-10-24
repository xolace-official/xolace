// @vitest-environment edge-runtime
/**
 * "End" without the mirror: the mirror is still made, then the talk closes
 * into the timeline. Failure modes: home picks the talk up and opens its
 * processing → mirror screens anyway; the delivered mirror is left open, or
 * never counts as a reflection; an escalated mirror closes silently, its
 * help unseen; a talk with nothing said gets a mirror; an old client (no
 * `mirrorLater`) stops getting its mirror on home.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
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
		expect(await session(user, sessionId)).toMatchObject({
			mirrorText: MIRROR.mirrorText,
			pathCompleted: false,
			state: "completed",
		});
		expect(await user.t.query(api.sessions.getActive, {})).toBeNull();
		expect((await reflects(user)).map((a) => a.actionType)).toContain(
			"reflect"
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

		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});
		await user.t.mutation(internal.sessions.closeMirrorLater, { sessionId });
		expect(await session(user, sessionId)).toMatchObject({
			state: "completed",
		});
	});

	it("shows a mirror that failed on home, for its retry", async () => {
		const user = await asNewUser();
		const sessionId = await talk(user);
		await user.t.mutation(api.talk.session.end, {
			mirrorLater: true,
			sessionId,
		});
		await user.root.run((ctx) =>
			ctx.db.patch("sessions", sessionId, { state: "error" })
		);
		expect((await user.t.query(api.sessions.getActive, {}))?._id).toBe(
			sessionId
		);
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
