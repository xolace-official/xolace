// @vitest-environment edge-runtime
/**
 * The tier-2 leaf writers — the mutations that only read and write the
 * database (design: issue #242). Every assertion reads the resulting document
 * back out of the seeded backend; nothing here asserts against a call log.
 *
 * These four are all `internalMutation`s reached from the AI pipeline, so the
 * cases that matter are the guards on a session that moved on while the model
 * was working, and the invariants their readers assume: one metadata row per
 * session, a suggestion that survives a re-classify, an escalation event that
 * flags its session.
 */
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
  classificationArgs,
  seedConversation,
  seedMetadata,
  seedSession,
} from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

// `users.getOrCreate` (via `asNewUser`) calls `rankInsert`; the
// @convex-dev/aggregate component is not registered in the test backend.
vi.mock("../lib/aggregates", () => aggregatesMock());

const readMetadata = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.run((ctx) =>
    ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .collect(),
  );

const readSession = (user: SeededUser, sessionId: Id<"sessions">) =>
  user.root.run((ctx) => ctx.db.get("sessions", sessionId));

describe("emotionalMetadata.store", () => {
  it("writes the classification, stamped and with a resolved suggestion", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);

    await user.root.mutation(
      internal.emotionalMetadata.store,
      classificationArgs({ sessionId, emotionalProfileId: user.profileId }),
    );

    const [row] = await readMetadata(user, sessionId);
    expect(row).toMatchObject({
      classifierVersion: "test-v1",
      primaryEmotion: "anxiety",
      intensity: 8,
      thematicTags: ["work"],
      riskFlag: false,
      // "work" at intensity 8, no live conversation, no cooldown row.
      suggestedSpecialty: "burnout",
    });
    expect(row.createdAt).toBeGreaterThan(0);
  });

  it("upserts — a pipeline retry leaves one row per session", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    const args = classificationArgs({ sessionId, emotionalProfileId: user.profileId });

    await user.root.mutation(internal.emotionalMetadata.store, args);
    await user.root.mutation(internal.emotionalMetadata.store, {
      ...args,
      primaryEmotion: "grief",
      intensity: 9,
    });

    const rows = await readMetadata(user, sessionId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ primaryEmotion: "grief", intensity: 9 });
    // Its own earlier row is skipped in the cooldown walk, so a retry does not
    // suppress the suggestion it already made.
    expect(rows[0].suggestedSpecialty).toBe("burnout");
  });

  it("suppresses the suggestion while a conversation is live", async () => {
    for (const status of ["requested", "open", "resting"] as const) {
      const user = await asNewUser();
      await seedConversation(user.root, user.profileId, status);
      const sessionId = await seedSession(user.root, user.profileId);

      await user.root.mutation(
        internal.emotionalMetadata.store,
        classificationArgs({ sessionId, emotionalProfileId: user.profileId }),
      );

      const [row] = await readMetadata(user, sessionId);
      expect(row.suggestedSpecialty).toBeUndefined();
    }
  });

  it("suppresses the suggestion inside the 7-day cooldown", async () => {
    const user = await asNewUser();
    const earlier = await seedSession(user.root, user.profileId);
    await seedMetadata(user.root, earlier, user.profileId, {
      suggestedSpecialty: "burnout",
    });
    const sessionId = await seedSession(user.root, user.profileId);

    await user.root.mutation(
      internal.emotionalMetadata.store,
      classificationArgs({ sessionId, emotionalProfileId: user.profileId }),
    );

    const [row] = await readMetadata(user, sessionId);
    expect(row.suggestedSpecialty).toBeUndefined();
  });

  it("drops a retained suggestion when re-classified as crisis", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    const args = classificationArgs({ sessionId, emotionalProfileId: user.profileId });

    await user.root.mutation(internal.emotionalMetadata.store, args);
    expect((await readMetadata(user, sessionId))[0].suggestedSpecialty).toBe("burnout");

    await user.root.mutation(internal.emotionalMetadata.store, {
      ...args,
      safeguardLevel: "crisis",
      riskFlag: true,
    });

    const [row] = await readMetadata(user, sessionId);
    expect(row.suggestedSpecialty).toBeUndefined();
    expect(row.safeguardLevel).toBe("crisis");
  });
});

describe("sessions.deliverMirror", () => {
  const mirror = {
    mirrorText: "You're carrying more than one thing at once.",
    mirrorModelVersion: "test-mirror-v1",
    toneUsed: "gentle" as const,
  };

  it("moves processing → mirror_delivered with the mirror fields", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);

    await user.root.mutation(internal.sessions.deliverMirror, {
      sessionId,
      ...mirror,
      safeguardLevel: "gentle",
      requiresFollowUp: true,
      gapNamed: true,
    });

    expect(await readSession(user, sessionId)).toMatchObject({
      state: "mirror_delivered",
      ...mirror,
      safeguardLevel: "gentle",
      requiresFollowUp: true,
      gapNamed: true,
    });
  });

  it("leaves a session that moved on while the model was working", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "abandoned" });

    await user.root.mutation(internal.sessions.deliverMirror, { sessionId, ...mirror });

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("abandoned");
    expect(session?.mirrorText).toBeUndefined();
  });

  it("throws for a session that no longer exists", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    await user.root.run((ctx) => ctx.db.delete("sessions", sessionId));

    await expect(
      user.root.mutation(internal.sessions.deliverMirror, { sessionId, ...mirror }),
    ).rejects.toThrow();
  });
});

describe("sessions.failSession", () => {
  it("moves processing → error and records the message", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);

    await user.root.mutation(internal.sessions.failSession, {
      sessionId,
      errorMessage: "articulation failed",
    });

    expect(await readSession(user, sessionId)).toMatchObject({
      state: "error",
      errorMessage: "articulation failed",
    });
  });

  it("does not overwrite a session that already left processing", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, {
      state: "mirror_delivered",
    });

    await user.root.mutation(internal.sessions.failSession, {
      sessionId,
      errorMessage: "late failure",
    });

    const session = await readSession(user, sessionId);
    expect(session?.state).toBe("mirror_delivered");
    expect(session?.errorMessage).toBeUndefined();
  });

  it("is a no-op for a session that no longer exists", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    await user.root.run((ctx) => ctx.db.delete("sessions", sessionId));

    await expect(
      user.root.mutation(internal.sessions.failSession, {
        sessionId,
        errorMessage: "gone",
      }),
    ).resolves.toBeNull();
  });
});

describe("escalation.create", () => {
  const event = {
    triggerType: "explicit_crisis_language" as const,
    triggerConfidence: 0.92,
    triggerEvidence: "explicit_crisis_language at high confidence",
    actionTaken: "crisis_line_presented" as const,
  };

  it("writes the event unreviewed and flags its session", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);
    const before = (await readSession(user, sessionId)) as Doc<"sessions">;

    const eventId = await user.root.mutation(internal.escalation.create, {
      emotionalProfileId: user.profileId,
      sessionId,
      ...event,
      resourcesPresented: [
        {
          type: "phone",
          source: "crisis_line",
          priority: 1,
          label: "Crisis line",
          value: "988",
        },
      ],
    });

    const stored = await user.root.run((ctx) =>
      ctx.db.get("escalation_events", eventId),
    );
    expect(stored).toMatchObject({
      sessionId,
      emotionalProfileId: user.profileId,
      ...event,
      reviewedByHuman: false,
    });
    expect(stored?.createdAt).toBeGreaterThan(0);

    const session = await readSession(user, sessionId);
    expect(session?.escalationTriggered).toBe(true);
    expect(session?.updatedAt).toBeGreaterThanOrEqual(before.updatedAt);
  });

  it("accepts legacy string resources alongside structured ones", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId);

    const eventId = await user.root.mutation(internal.escalation.create, {
      emotionalProfileId: user.profileId,
      sessionId,
      ...event,
      resourcesPresented: ["988 Suicide & Crisis Lifeline"],
    });

    const stored = await user.root.run((ctx) =>
      ctx.db.get("escalation_events", eventId),
    );
    expect(stored?.resourcesPresented).toEqual(["988 Suicide & Crisis Lifeline"]);
  });
});
