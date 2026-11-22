// @vitest-environment edge-runtime
/**
 * Why a session did or didn't get a follow-up, so a missed one can be traced:
 * the classifier's read on emotional_metadata (code, yes or no reason, its own
 * flag) and what decided the session's flag at close (`followUpDecidedBy`).
 *
 * Failure modes: a close that records no source or the wrong one; an abandon
 * credited to the classifier; a re-classification that turns a yes into a no
 * on the read while the session flag stays up; a remade read keeping a stale
 * reason; the read reaching a client.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	classificationArgs,
	seedMetadata,
	seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import {
	aggregatesMock,
	noopJob,
	posthogMock,
	ragMock,
	revenuecatMock,
} from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => false));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({
	onSessionComplete: noopJob(),
}));

const CLASSIFIER_YES = {
	aiRequiresFollowUp: true,
	followUpReason: "Lost a parent and can't open the last message.",
	followUpReasonCode: "grief",
} as const;

const CLASSIFIER_NO = {
	aiRequiresFollowUp: false,
	followUpReasonCode: "discharged",
	noFollowUpReason: "Vented and already feels lighter.",
} as const;

type Setup = {
	session?: Partial<Doc<"sessions">>;
	metadata?: Partial<Doc<"emotional_metadata">>;
};

async function seeded(user: SeededUser, setup: Setup) {
	const sessionId = await seedSession(user.root, user.profileId, {
		state: "confirmed",
		...setup.session,
	});
	await seedMetadata(user.root, sessionId, user.profileId, setup.metadata);
	return sessionId;
}

const sessionOf = (user: SeededUser, id: Id<"sessions">) =>
	user.root.run((ctx) => ctx.db.get("sessions", id));

const metadataOf = (user: SeededUser, id: Id<"sessions">) =>
	user.root.run((ctx) =>
		ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", id))
			.unique()
	);

async function completed(setup: Setup) {
	const user = await asNewUser();
	const sessionId = await seeded(user, setup);
	await user.t.mutation(api.sessions.completeSession, { sessionId });
	return await sessionOf(user, sessionId);
}

describe("followUpDecidedBy at close", () => {
	it("the classifier's yes", async () => {
		const session = await completed({
			metadata: CLASSIFIER_YES,
			session: { requiresFollowUp: true },
		});
		expect(session).toMatchObject({
			followUpDecidedBy: "ai",
			requiresFollowUp: true,
		});
	});

	it("escalation, named before the classifier's yes", async () => {
		const session = await completed({
			metadata: CLASSIFIER_YES,
			session: { escalationTriggered: true, requiresFollowUp: true },
		});
		expect(session?.followUpDecidedBy).toBe("escalation");
	});

	it("gave_up, when the classifier said no", async () => {
		const session = await completed({
			metadata: CLASSIFIER_NO,
			session: { confirmationState: "gave_up" },
		});
		expect(session).toMatchObject({
			followUpDecidedBy: "gave_up",
			requiresFollowUp: true,
		});
	});

	it("none, with the classifier's no kept on the read", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_NO });
		await user.t.mutation(api.sessions.completeSession, { sessionId });
		expect(await sessionOf(user, sessionId)).toMatchObject({
			followUpDecidedBy: "none",
			requiresFollowUp: false,
		});
		expect(await metadataOf(user, sessionId)).toMatchObject(CLASSIFIER_NO);
	});

	it("an older row (reason only, no flag) still reads as the classifier's", async () => {
		const session = await completed({
			metadata: { followUpReason: "rupture, unresolved" },
			session: { requiresFollowUp: true },
		});
		expect(session?.followUpDecidedBy).toBe("ai");
	});

	it("a plain abandon is none, even when the classifier said yes", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, {
			metadata: CLASSIFIER_YES,
			session: { requiresFollowUp: true, state: "mirror_delivered" },
		});
		await user.t.mutation(api.sessions.abandon, { sessionId });
		expect(await sessionOf(user, sessionId)).toMatchObject({
			followUpDecidedBy: "none",
			requiresFollowUp: false,
		});
		// The classifier's yes stays on the read: the abandon rule decided.
		expect((await metadataOf(user, sessionId))?.aiRequiresFollowUp).toBe(true);
	});

	it("an abandon after escalation is escalation", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, {
			metadata: CLASSIFIER_NO,
			session: { escalationTriggered: true, state: "mirror_delivered" },
		});
		await user.t.mutation(api.sessions.abandon, { sessionId });
		expect((await sessionOf(user, sessionId))?.followUpDecidedBy).toBe(
			"escalation"
		);
	});
});

/** The fields replaceForRefinement always needs, from a seeded row. */
const refineArgs = (sessionId: Id<"sessions">) => ({
	classifierVersion: "test-v2",
	intensity: 6,
	primaryEmotion: "sadness",
	primaryEmotionConfidence: 0.8,
	sessionId,
	specificity: 6,
	thematicTags: ["family"],
	userLanguageTags: ["heavy"],
});

describe("re-classification (clarify) keeps the read on the flag's side", () => {
	it("a no never replaces an earlier yes", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_YES });
		await user.root.mutation(internal.emotionalMetadata.replaceForRefinement, {
			...refineArgs(sessionId),
			...CLASSIFIER_NO,
		});
		const row = await metadataOf(user, sessionId);
		expect(row).toMatchObject(CLASSIFIER_YES);
		expect(row?.noFollowUpReason).toBeUndefined();
	});

	it("a yes replaces an earlier no and drops its reason", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_NO });
		await user.root.mutation(internal.emotionalMetadata.replaceForRefinement, {
			...refineArgs(sessionId),
			...CLASSIFIER_YES,
		});
		const row = await metadataOf(user, sessionId);
		expect(row).toMatchObject(CLASSIFIER_YES);
		expect(row?.noFollowUpReason).toBeUndefined();
	});

	it("a turn that didn't re-classify leaves the read alone", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_NO });
		await user.root.mutation(
			internal.emotionalMetadata.replaceForRefinement,
			refineArgs(sessionId)
		);
		expect(await metadataOf(user, sessionId)).toMatchObject(CLASSIFIER_NO);
	});
});

describe("store: a fresh read replaces the whole follow-up read", () => {
	it("a remade no clears the earlier yes reason", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_YES });
		await user.root.mutation(internal.emotionalMetadata.store, {
			...classificationArgs({
				emotionalProfileId: user.profileId,
				sessionId,
			}),
			...CLASSIFIER_NO,
		});
		const row = await metadataOf(user, sessionId);
		expect(row).toMatchObject(CLASSIFIER_NO);
		expect(row?.followUpReason).toBeUndefined();
	});
});

describe("the read never reaches a client", () => {
	it("getBySession leaves it out", async () => {
		const user = await asNewUser();
		const sessionId = await seeded(user, { metadata: CLASSIFIER_NO });
		const row = await user.t.query(api.emotionalMetadata.getBySession, {
			sessionId,
		});
		expect(row).not.toBeNull();
		expect(row).not.toHaveProperty("aiRequiresFollowUp");
		expect(row).not.toHaveProperty("followUpReasonCode");
		expect(row).not.toHaveProperty("noFollowUpReason");
	});
});
