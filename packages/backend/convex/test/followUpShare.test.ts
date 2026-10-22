// @vitest-environment edge-runtime
/**
 * Sharing a follow-up "what helped?" reflection to the peer pool (issue #449).
 *
 * Failure modes this guards — the pool is the one place user text leaves
 * their private space:
 * - raw text enters the pool (it must be distilled first, like session text)
 * - an acute or escalation card, or a crisis session's card, gets shared
 * - moderation-flagged text gets shared, or a moderation outage lets it through
 * - the distiller's NULL verdict is ignored
 * - a re-submit (even share → private → share) double-contributes
 * - consent revoked between submit and run is ignored
 * - blank text schedules a share
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import { moderationResult, scheduled, scheduledCalls, seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { actionCacheMock, aggregatesMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({ moderation: undefined as unknown, distilled: undefined as unknown }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../ai/cached", () =>
  actionCacheMock(() => ({ moderation: stub.moderation, distilled: stub.distilled })),
);

// Fake timers keep the job `record` enqueues from firing on its own; each test
// runs it explicitly so the stubbed model verdicts apply.
beforeEach(() => {
  vi.useFakeTimers();
  stub.moderation = moderationResult();
  stub.distilled = "a long walk and not checking my phone";
});
afterEach(() => {
  vi.useRealTimers();
});

const JOB = "jobs/followUpShare:share";

async function seedCard(
  user: SeededUser,
  opts: {
    tier?: Doc<"follow_up_cards">["tier"];
    escalationDerived?: boolean;
    session?: Partial<Doc<"sessions">>;
  } = {},
) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    mirrorText: "Being unseen while carrying it.",
    ...opts.session,
  });
  await seedMetadata(user.root, sessionId, user.profileId);
  const cardId = await user.root.run((ctx) =>
    ctx.db.insert("follow_up_cards", {
      emotionalProfileId: user.profileId,
      sessionId,
      workflowId: "wf1" as WorkflowId,
      tier: opts.tier ?? "standard",
      cardText: "How's it sitting now?",
      escalationDerived: opts.escalationDerived ?? false,
      status: "resolved",
      userResponse: "lighter",
      createdAt: Date.now(),
    }),
  );
  return cardId;
}

const record = (user: SeededUser, cardId: Id<"follow_up_cards">, text: string, share: boolean) =>
  user.t.mutation(api.followUpResponses.record, { cardId, reflectionText: text, shareRequested: share });

const pool = (user: SeededUser) => user.root.run((ctx) => ctx.db.query("reflections").collect());

async function responseId(user: SeededUser, cardId: Id<"follow_up_cards">) {
  const row = await user.root.run((ctx) =>
    ctx.db
      .query("follow_up_responses")
      .withIndex("by_card", (q) => q.eq("cardId", cardId))
      .first(),
  );
  return row!._id;
}

const runShare = async (user: SeededUser, cardId: Id<"follow_up_cards">) =>
  user.root.action(internal.jobs.followUpShare.share, { responseId: await responseId(user, cardId) });

describe("followUpResponses.record → share scheduling", () => {
  it("schedules a share on a fresh opt-in with text", async () => {
    const user = await asNewUser();
    const cardId = await seedCard(user);
    await record(user, cardId, "a long walk", true);
    expect(scheduled(await scheduledCalls(user.root), JOB)).toBeDefined();
  });

  it("schedules nothing when private, blank, or already shared", async () => {
    const user = await asNewUser();
    const privateCard = await seedCard(user);
    await record(user, privateCard, "mine", false);
    const blankCard = await seedCard(user);
    await record(user, blankCard, "   ", true);
    expect(scheduled(await scheduledCalls(user.root), JOB)).toBeUndefined();

    const sharedCard = await seedCard(user);
    await record(user, sharedCard, "once", true);
    await record(user, sharedCard, "twice", true);
    await record(user, sharedCard, "revoked", false);
    await record(user, sharedCard, "and back", true);
    expect((await scheduledCalls(user.root)).filter((c) => c.name.endsWith(JOB))).toHaveLength(1);
  });

  it("never schedules for an acute, escalation, or crisis card", async () => {
    const user = await asNewUser();
    await record(user, await seedCard(user, { tier: "acute" }), "a walk", true);
    await record(user, await seedCard(user, { escalationDerived: true }), "a walk", true);
    await record(user, await seedCard(user, { session: { safeguardLevel: "crisis" } }), "a walk", true);
    expect(scheduled(await scheduledCalls(user.root), JOB)).toBeUndefined();
  });
});

describe("followUpShare.share", () => {
  it("contributes the distilled text, never the raw text", async () => {
    const user = await asNewUser();
    const cardId = await seedCard(user);
    await record(user, cardId, "a long walk with Sam in Leeds", true);

    await runShare(user, cardId);

    const rows = await pool(user);
    expect(rows).toHaveLength(1);
    expect(rows[0].displayText).toBe(stub.distilled);
    expect(rows[0].primaryEmotion).toBe("anxiety");
  });

  it("contributes nothing when moderation flags, is down, or the distiller says NULL", async () => {
    const user = await asNewUser();
    const cardId = await seedCard(user);
    await record(user, cardId, "a long walk", true);

    stub.moderation = moderationResult({ flagged: true });
    await runShare(user, cardId);
    stub.moderation = new Error("moderation down");
    await runShare(user, cardId);
    stub.moderation = moderationResult();
    stub.distilled = "NULL";
    await runShare(user, cardId);

    expect(await pool(user)).toHaveLength(0);
  });

  it("honours consent revoked before the job runs", async () => {
    const user = await asNewUser();
    const cardId = await seedCard(user);
    await record(user, cardId, "a long walk", true);
    await record(user, cardId, "a long walk", false);

    await runShare(user, cardId);

    expect(await pool(user)).toHaveLength(0);
  });
});
