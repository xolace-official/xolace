// @vitest-environment edge-runtime
/**
 * The follow-up response record (issue #447): the structured/free-text half of
 * a check-in answer, kept beside `follow_up_cards` rather than on it.
 *
 * Failure modes this guards: writing onto another user's card, a duplicate row
 * on a second submit, unbounded or blank text stored as-is, and a response
 * outliving its card when the session is purged.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { purgeSessions } from "../lib/sessionCascade";
import { expectCode, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
// purgeSessions clears RAG embeddings first; the rag component isn't
// registered in the test backend.
vi.mock("../episodicMemory", async (orig) => ({
  ...(await orig<typeof import("../episodicMemory")>()),
  purgeEpisodicEntries: async () => {},
}));

// `record` enqueues the share job (#449) on a share; fake timers keep it from
// firing after the test (it has its own coverage in followUpShare.test.ts).
beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

async function seedCard(user: SeededUser) {
  const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
  const cardId = await user.root.run((ctx) =>
    ctx.db.insert("follow_up_cards", {
      emotionalProfileId: user.profileId,
      sessionId,
      workflowId: "wf1" as WorkflowId,
      tier: "standard",
      cardText: "How's it sitting now?",
      escalationDerived: false,
      status: "resolved",
      userResponse: "lighter",
      createdAt: Date.now(),
    }),
  );
  return { sessionId, cardId };
}

const readResponses = (user: SeededUser, cardId: Id<"follow_up_cards">) =>
  user.root.run((ctx) =>
    ctx.db
      .query("follow_up_responses")
      .withIndex("by_card", (q) => q.eq("cardId", cardId))
      .collect(),
  );

describe("followUpResponses.record", () => {
  it("persists a record that reads back intact", async () => {
    const user = await asNewUser();
    const { cardId } = await seedCard(user);

    await user.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "  a walk with my sister  ",
      shareRequested: true,
    });

    const rows = await readResponses(user, cardId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      cardId,
      emotionalProfileId: user.profileId,
      reflectionText: "a walk with my sister",
      shareRequested: true,
    });
    expect(rows[0].heavierChoice).toBeUndefined();

    // And through the public read the flow will use.
    const viaQuery = await user.t.query(api.followUpResponses.getForCard, { cardId });
    expect(viaQuery).toMatchObject({ reflectionText: "a walk with my sister" });
  });

  it("updates in place on a second write instead of duplicating", async () => {
    const user = await asNewUser();
    const { cardId } = await seedCard(user);

    await user.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "first",
      shareRequested: true,
    });
    await user.t.mutation(api.followUpResponses.record, {
      cardId,
      shareRequested: false,
      heavierChoice: "music",
    });

    const rows = await readResponses(user, cardId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ shareRequested: false, heavierChoice: "music" });
    expect(rows[0].reflectionText).toBeUndefined();
  });

  it("stores blank text as absent", async () => {
    const user = await asNewUser();
    const { cardId } = await seedCard(user);

    await user.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "   ",
      shareRequested: false,
    });

    const [row] = await readResponses(user, cardId);
    expect(row.reflectionText).toBeUndefined();
  });

  it("rejects text over the cap", async () => {
    const user = await asNewUser();
    const { cardId } = await seedCard(user);

    await expectCode(
      () =>
        user.t.mutation(api.followUpResponses.record, {
          cardId,
          reflectionText: "x".repeat(2001),
          shareRequested: false,
        }),
      "reflection_too_long",
    );
    expect(await readResponses(user, cardId)).toHaveLength(0);
  });

  it("never writes onto another user's card, nor lets them read it", async () => {
    const owner = await asNewUser(1);
    const { cardId } = await seedCard(owner);
    await owner.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "mine",
      shareRequested: false,
    });

    const intruder = await asNewUser(2, owner.root);
    await intruder.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "hijack",
      shareRequested: true,
    });

    const rows = await readResponses(owner, cardId);
    expect(rows).toHaveLength(1);
    expect(rows[0].reflectionText).toBe("mine");
    expect(await intruder.t.query(api.followUpResponses.getForCard, { cardId })).toBeNull();
  });

  it("dies with its card when the session is purged", async () => {
    const user = await asNewUser();
    const { sessionId, cardId } = await seedCard(user);
    await user.t.mutation(api.followUpResponses.record, {
      cardId,
      reflectionText: "gone soon",
      shareRequested: false,
    });

    await user.root.run(async (ctx) => {
      const session = (await ctx.db.get("sessions", sessionId))!;
      await purgeSessions(ctx, user.profileId, [session]);
    });

    expect(await readResponses(user, cardId)).toHaveLength(0);
  });
});
