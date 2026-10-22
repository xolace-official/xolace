// @vitest-environment edge-runtime
/**
 * #433: every streak-qualifying action writes its activity_log row through
 * recordActivity. What can go wrong: an action site forgets the call (no row),
 * logs the wrong action type, or a non-qualifying completion (a non-breathing
 * twig, a re-finish) sneaks a row in.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock, noopJob, posthogMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../revenuecat", () => revenuecatMock(false));
vi.mock("../jobs/profileStats", () => ({ updateAfterSession: noopJob() }));
vi.mock("../ai/reflectionAgent/trigger", () => ({ onSessionComplete: noopJob() }));
vi.mock("../ai/paths/generate", () => ({ run: noopJob() }));

const logRows = (user: SeededUser) =>
  user.root.run((ctx) =>
    ctx.db
      .query("activity_log")
      .withIndex("by_emotionalProfileId_and_dayKey_and_actionType", (q) => q.eq("emotionalProfileId", user.profileId))
      .collect(),
  );
const actions = async (user: SeededUser) => (await logRows(user)).map((r) => r.actionType).sort();
const profile = (user: SeededUser) =>
  user.root.run((ctx) => ctx.db.get("emotional_profiles", user.profileId)) as Promise<Doc<"emotional_profiles">>;

async function seedTwigs(user: SeededUser, kinds: string[]) {
  return await user.root.run(async (ctx) => {
    const sessionId = await ctx.db.insert("sessions", {
      emotionalProfileId: user.profileId,
      state: "completed",
      entryType: "open_prompt",
      kept: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    const pathId = await ctx.db.insert("paths", {
      emotionalProfileId: user.profileId,
      sessionId,
      status: "active",
      model: "m",
      modelVersion: "v",
      generatedAt: Date.now(),
    });
    return Promise.all(
      kinds.map((actionType, i) =>
        ctx.db.insert("path_steps", { pathId, actionType, order: i + 1, why: "w", params: {}, state: "pending" }),
      ),
    );
  });
}

describe("recordActivity wiring (#433)", () => {
  it("completePath logs reflect and moves the mirrored streak + lastSessionAt", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "path_in_progress", pathChosen: "solo" });
    await user.t.mutation(api.sessions.completePath, { sessionId, pathCompleted: true });

    expect(await actions(user)).toEqual(["reflect"]);
    const p = await profile(user);
    expect(p.currentStreak).toBe(1);
    expect(p.longestStreak).toBe(1);
    expect(p.lastSessionAt).toBeDefined();
  });

  it("completeSession (exit) logs reflect", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "confirmed" });
    await user.t.mutation(api.sessions.completeSession, { sessionId });
    expect(await actions(user)).toEqual(["reflect"]);
  });

  it("a charged vent logs vent, without touching lastSessionAt", async () => {
    const user = await asNewUser();
    await user.t.mutation(internal.vent.checkAndIncrementCap, { minutes: 1 });
    expect(await actions(user)).toEqual(["vent"]);
    const p = await profile(user);
    expect(p.currentStreak).toBe(1);
    expect(p.lastSessionAt).toBeUndefined();
  });

  it("library logs once, on the first finish only", async () => {
    const user = await asNewUser();
    const entryId = await user.root.run(async (ctx) => {
      const sourceId = await ctx.db.insert("library_sources", {
        slug: "nhs",
        name: "NHS",
        licence: "OGL v3.0",
        permission: "not_required",
        attributionText: "a",
        dropBrandingIfAdapted: true,
      });
      const entryId = await ctx.db.insert("library_entries", {
        slug: "worry",
        kind: "advice",
        title: "t",
        dek: "d",
        primarySubject: "anxiety",
        reuse: "adapted",
        readMin: 4,
        active: true,
        lastReviewedAt: 1,
      });
      await ctx.db.insert("library_entry_sources", { entryId, sourceId, order: 0, pageTitle: "Worry" });
      return entryId;
    });
    await user.t.mutation(api.library.reads.record, { entryId, opened: true });
    expect(await actions(user)).toEqual([]);
    await user.t.mutation(api.library.reads.record, { entryId, finished: true });
    await user.t.mutation(api.library.reads.record, { entryId, finished: true });
    const rows = await logRows(user);
    expect(rows.map((r) => [r.actionType, r.count])).toEqual([["library", 1]]);
  });

  it("completeStep logs sit_with_this for a breathing twig only", async () => {
    const user = await asNewUser();
    const [breathing, bridge] = await seedTwigs(user, ["breathing", "bridge"]);
    await user.t.mutation(api.paths.completeStep, { stepId: bridge });
    expect(await actions(user)).toEqual([]);
    await user.t.mutation(api.paths.completeStep, { stepId: breathing });
    expect(await actions(user)).toEqual(["sit_with_this"]);
  });

  it("a quote reaction logs quotes at zero weight — no streak", async () => {
    const user = await asNewUser();
    const quoteId = await user.root.run((ctx) =>
      ctx.db.insert("daily_quotes", {
        emotionalProfileId: user.profileId,
        date: "2026-01-01",
        type: "curated" as const,
        text: "q",
        isPremium: false,
        createdAt: Date.now(),
      }),
    );
    await user.t.mutation(api.dailyQuotes.react, { quoteId, reaction: "resonates" });
    expect(await actions(user)).toEqual(["quotes"]);
    expect((await profile(user)).currentStreak).toBe(0);
  });
});
