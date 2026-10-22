// @vitest-environment edge-runtime
/**
 * The compounding upsell (#524, #496 §4): a free user learns a named domain
 * has been heavier than their usual, in the app only, once per stretch.
 *
 * Failure modes: a Xolace+ user or an easing domain getting it; it naming a
 * number; it showing while an elevated, crisis or burned session is recent
 * (#530: any session in the stretch or the past week, whichever reaches
 * further back); it showing twice in one stretch, or
 * never again in the next; marking another person's stretch; it pushing.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { scheduled, scheduledCalls, seedMetadata, seedSession } from "./fixtures.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";
import { aggregatesMock, posthogMock, ragMock, revenuecatMock } from "./mocks.helpers";

const stub = vi.hoisted(() => ({ isPlus: false }));

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../posthog", () => posthogMock());
vi.mock("../rag", () => ragMock());
vi.mock("../revenuecat", () => revenuecatMock(() => stub.isPlus));

beforeEach(() => {
  stub.isPlus = false;
});

const DAY = 86_400_000;

async function seedReading(user: SeededUser, daysAgo: number, tags: string[], intensity: number) {
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    confirmationState: "confirmed",
    createdAt: Date.now() - daysAgo * DAY,
  });
  await seedMetadata(user.root, sessionId, user.profileId, { intensity, thematicTags: tags });
}

/** A settled work usual (intensity 4), a heavy last week, and its open stretch. */
async function compoundingWork(user: SeededUser, startedDaysAgo = 20) {
  for (let i = 0; i < 50; i++) await seedReading(user, 120 - i * 2, ["work"], 4);
  for (let d = 1; d <= 7; d++) await seedReading(user, d + 0.5, ["work"], 10);
  return await openStretch(user, startedDaysAgo);
}

const openStretch = (user: SeededUser, startedDaysAgo: number) =>
  user.root.run((ctx) =>
    ctx.db.insert("compounding_stretches", {
      emotionalProfileId: user.profileId,
      domain: "work",
      startedAt: Date.now() - startedDaysAgo * DAY,
      anchorBaseline: 67,
    }),
  );

type Tonight = Partial<Pick<Doc<"sessions">, "kept" | "escalationTriggered" | "safeguardLevel">> & {
  metaLevel?: Doc<"emotional_metadata">["safeguardLevel"];
};

/** A completed session, just now or `daysAgo`. */
async function tonight(user: SeededUser, over: Tonight = {}, daysAgo = 0) {
  const { metaLevel, ...session } = over;
  const sessionId = await seedSession(user.root, user.profileId, {
    state: "completed",
    createdAt: Date.now() - daysAgo * DAY,
    ...session,
  });
  await seedMetadata(user.root, sessionId, user.profileId, {
    intensity: 8,
    thematicTags: ["work"],
    ...(metaLevel ? { safeguardLevel: metaLevel } : {}),
  });
  return sessionId;
}

describe("the compounding upsell (#524)", () => {
  it("names the domain for a free user, at session end and on Insights, with no number", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    const sessionId = await tonight(user);
    const atEnd = await user.t.query(api.compounding.upsell.get, { sessionId });
    expect(atEnd).toEqual({ domain: "work", stretchStartedAt: expect.any(Number) });
    expect(await user.t.query(api.compounding.upsell.get, {})).toEqual(atEnd);
  });

  it("never shows to a Xolace+ user", async () => {
    stub.isPlus = true;
    const user = await asNewUser();
    await compoundingWork(user);
    expect(await user.t.query(api.compounding.upsell.get, { sessionId: await tonight(user) })).toBeNull();
  });

  it("never shows for an easing domain", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    await seedReading(user, 1.2, ["work"], 5);
    await seedReading(user, 0.1, ["work"], 5);
    expect(await user.t.query(api.compounding.upsell.get, {})).toBeNull();
  });

  it.each<[string, Tonight]>([
    ["elevated", { safeguardLevel: "elevated" }],
    ["crisis", { safeguardLevel: "crisis" }],
    ["crisis (Understanding)", { metaLevel: "crisis" }],
    ["escalated", { escalationTriggered: true }],
    ["burned", { kept: false }],
  ])("never shows after a %s session, at its end or on Insights", async (_, over) => {
    const user = await asNewUser();
    await compoundingWork(user);
    const sessionId = await tonight(user, over);
    expect(await user.t.query(api.compounding.upsell.get, { sessionId })).toBeNull();
    expect(await user.t.query(api.compounding.upsell.get, {})).toBeNull();
    // Still blocked by the next ordinary session (#530), and nothing spent.
    expect(await user.t.query(api.compounding.upsell.get, { sessionId: await tonight(user) })).toBeNull();
    const [row] = await user.root.run((ctx) => ctx.db.query("compounding_stretches").take(1));
    expect(row.upsellShownAt).toBeUndefined();
  });

  // #530: one calm session tonight mustn't hide this morning's crisis.
  it.each<[string, Tonight, number, number, boolean]>([
    ["crisis 3 days ago, 1-day stretch", { safeguardLevel: "crisis" }, 3, 1, false],
    ["crisis 30 days ago, inside a 60-day stretch", { safeguardLevel: "crisis" }, 30, 60, false],
    ["crisis 30 days ago, before a 2-day stretch", { safeguardLevel: "crisis" }, 30, 2, true],
    ["burned yesterday", { kept: false }, 1, 20, false],
  ])("%s → shown: %s", async (_, over, hardDaysAgo, stretchDaysAgo, shown) => {
    const user = await asNewUser();
    await compoundingWork(user, stretchDaysAgo);
    await tonight(user, over, hardDaysAgo);
    const sessionId = await tonight(user);
    const atEnd = await user.t.query(api.compounding.upsell.get, { sessionId });
    expect(atEnd !== null).toBe(shown);
    expect((await user.t.query(api.compounding.upsell.get, {})) !== null).toBe(shown);
  });

  it("shows once per stretch, and again in the next one", async () => {
    const user = await asNewUser();
    await compoundingWork(user);
    const sessionId = await tonight(user);
    const upsell = await user.t.query(api.compounding.upsell.get, { sessionId });
    await user.t.mutation(api.compounding.upsell.markShown, upsell!);
    expect(await user.t.query(api.compounding.upsell.get, { sessionId })).toBeNull();
    expect(await user.t.query(api.compounding.upsell.get, {})).toBeNull();

    // The stretch ends; a new one opens.
    await user.root.run(async (ctx) => {
      for (const r of await ctx.db.query("compounding_stretches").take(5)) {
        await ctx.db.patch("compounding_stretches", r._id, { endedAt: Date.now() - 2 * DAY });
      }
    });
    await openStretch(user, 1);
    expect(await user.t.query(api.compounding.upsell.get, { sessionId })).toMatchObject({ domain: "work" });
  });

  it("can't spend someone else's stretch, and never pushes", async () => {
    const owner = await asNewUser();
    await compoundingWork(owner);
    const upsell = await owner.t.query(api.compounding.upsell.get, {});
    const other = await asNewUser(2, owner.root);
    await other.t.mutation(api.compounding.upsell.markShown, upsell!);
    expect(await owner.t.query(api.compounding.upsell.get, {})).toEqual(upsell);

    await owner.t.mutation(api.compounding.upsell.markShown, upsell!);
    expect(scheduled(await scheduledCalls(owner.root), "notifications:schedule")).toBeUndefined();
  });

  it("won't read another person's session", async () => {
    const owner = await asNewUser();
    await compoundingWork(owner);
    const sessionId = await tonight(owner);
    const other = await asNewUser(2, owner.root);
    await expect(other.t.query(api.compounding.upsell.get, { sessionId })).rejects.toThrow();
  });
});
