// @vitest-environment edge-runtime
/**
 * Overlapping consolidation runs (#531). Failure mode: each run's endRun
 * deletes the other's rows, leaving no insights after two paid runs.
 */
import { describe, expect, it, vi } from "vitest";
import { api, internal } from "../_generated/api";
import { seedSession } from "../test/fixtures.helpers";
import { asNewUser, type SeededUser } from "../test/harness.helpers";
import { aggregatesMock } from "../test/mocks.helpers";
import { DIRECTIONS } from "./insightGate";
import { insightsFor } from "./insightStore";

vi.mock("../lib/aggregates", () => aggregatesMock());

// Stands in for a save that passed the gate; endRun is what's under test.
async function save(user: SeededUser, runAt: number, text: string) {
  const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
  await user.root.run((ctx) =>
    ctx.db.insert("steadiness_insights", {
      emotionalProfileId: user.profileId,
      kind: "relief",
      domains: ["work"],
      text,
      citedSessionIds: [sessionId],
      oldestCitedAt: 0,
      runAt,
      writtenAt: runAt,
    }),
  );
}

const endRun = (user: SeededUser, runAt: number) =>
  user.root.mutation(internal.compounding.insightStore.endRun, {
    emotionalProfileId: user.profileId,
    runAt,
  });

const texts = (user: SeededUser) =>
  user.root.run(async (ctx) =>
    (await ctx.db.query("steadiness_insights").take(10)).map((r) => r.text),
  );

describe("compounding/insightStore.endRun", () => {
  it("keeps the newer run's insights when two runs interleave", async () => {
    const user = await asNewUser();
    const A = 1_000;
    const B = 2_000;
    await save(user, A, "a");
    await save(user, B, "b");
    await endRun(user, A);
    await endRun(user, B);
    expect(await texts(user)).toEqual(["b"]);
  });

  it("refuses and clears an older run's writes once a newer run has finished", async () => {
    const user = await asNewUser();
    const A = 1_000;
    const B = 2_000;
    await save(user, A, "a1");
    await save(user, B, "b");
    await endRun(user, B);
    const late = await user.root.mutation(internal.compounding.insightStore.save, {
      emotionalProfileId: user.profileId,
      runAt: A,
      kind: "relief",
      domains: ["work"],
      text: "a2",
      citedSessionIds: [],
      direction: DIRECTIONS[0],
    });
    expect(late).toMatch(/newer run/);
    await save(user, A, "a2"); // a write that raced past the check
    await endRun(user, A);
    expect(await texts(user)).toEqual(["b"]);
  });

  it("still replaces an older run, and a run that found nothing clears it", async () => {
    const user = await asNewUser();
    await save(user, 1_000, "old");
    await endRun(user, 2_000);
    expect(await texts(user)).toEqual([]);
  });
});

/**
 * Personal memory off. Failure modes: model-written insights still shown, or
 * a run already in flight saving one after the setting flipped.
 */
describe("compounding/insightStore with personal memory off", () => {
  it("hides saved insights and refuses new ones", async () => {
    const user = await asNewUser();
    const sessionId = await seedSession(user.root, user.profileId, { state: "completed" });
    await user.root.run((ctx) =>
      ctx.db.insert("steadiness_insights", {
        emotionalProfileId: user.profileId,
        kind: "relief",
        domains: ["work"],
        direction: "none",
        scoresAt: [50],
        text: "a",
        citedSessionIds: [sessionId],
        oldestCitedAt: 0,
        runAt: 1_000,
        writtenAt: 1_000,
      }),
    );
    const shown = () =>
      user.root.run((ctx) =>
        insightsFor(ctx, user.profileId, new Map([["work", { state: "unlocked", steadiness: 50, band: 10 }]])),
      );
    expect(await shown()).toHaveLength(1);

    await user.t.mutation(api.preferences.update, { personalMemoryEnabled: false });
    expect(await shown()).toEqual([]);
    const late = await user.root.mutation(internal.compounding.insightStore.save, {
      emotionalProfileId: user.profileId,
      runAt: 2_000,
      kind: "relief",
      domains: ["work"],
      text: "b",
      citedSessionIds: [sessionId],
      direction: "none",
    });
    expect(late).toMatch(/personal memory is off/);
  });
});
