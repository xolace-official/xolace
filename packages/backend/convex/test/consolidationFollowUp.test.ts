// @vitest-environment edge-runtime
/**
 * Follow-up responses feed consolidation passively (issue #453): the Reflection
 * Agent's `get_recent_sessions` read carries each session's check-in answer.
 *
 * Failure modes this guards: a stored response not reaching the agent, one
 * user's check-in leaking into another's consolidation, and a session with no
 * check-in rendering as a fake answer instead of null.
 */
import type { WorkflowId } from "@convex-dev/workflow";
import { describe, expect, it, vi } from "vitest";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock } from "./mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());

async function seedCheckIn(
  user: SeededUser,
  sessionId: Id<"sessions">,
  answer: "lighter" | "heavier",
  response?: { reflectionText?: string; heavierChoice?: "music" },
) {
  await user.root.run(async (ctx) => {
    const cardId = await ctx.db.insert("follow_up_cards", {
      emotionalProfileId: user.profileId,
      sessionId,
      workflowId: "wf1" as WorkflowId,
      tier: "standard",
      cardText: "How's it sitting now?",
      escalationDerived: false,
      status: "resolved",
      userResponse: answer,
      createdAt: Date.now(),
    });
    if (response) {
      await ctx.db.insert("follow_up_responses", {
        cardId,
        emotionalProfileId: user.profileId,
        shareRequested: false,
        ...response,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  });
}

const recentSessions = (user: SeededUser) =>
  user.root.query(internal.ai.reflectionAgent.toolQueries.getRecentSessions, {
    emotionalProfileId: user.profileId,
  });

describe("consolidation reads follow-up responses", () => {
  it("attaches the check-in answer and response to its session", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
    await seedCheckIn(user, sessionId, "lighter", { reflectionText: "a walk with my sister" });

    const [row] = await recentSessions(user);
    expect(row.followUp).toEqual({
      answer: "lighter",
      whatHelped: "a walk with my sister",
      heavierChoice: null,
    });
  });

  it("carries a heavier-menu choice", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
    await seedCheckIn(user, sessionId, "heavier", { heavierChoice: "music" });

    const [row] = await recentSessions(user);
    expect(row.followUp).toEqual({ answer: "heavier", whatHelped: null, heavierChoice: "music" });
  });

  it("keeps the chip answer when no response row was written", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
    await seedCheckIn(user, sessionId, "lighter");

    const [row] = await recentSessions(user);
    expect(row.followUp).toEqual({ answer: "lighter", whatHelped: null, heavierChoice: null });
  });

  it("is null for a session with no check-in, and never crosses users", async () => {
    const owner = await asNewUser(1);
    const ownerSession = await seedSession(owner.root, owner.profileId, { state: "completed" });
    await seedCheckIn(owner, ownerSession, "lighter", { reflectionText: "mine" });

    const other = await asNewUser(2, owner.root);
    await seedSession(other.root, other.profileId, { state: "completed" });

    const rows = await recentSessions(other);
    expect(rows).toHaveLength(1);
    expect(rows[0].followUp).toBeNull();
  });
});
