// @vitest-environment edge-runtime
/**
 * `dailyQuotes.save` / `unsave` / `listSaved` (#311).
 *
 * The three things that can silently go wrong here: `savedQuoteCount` drifting
 * off the number of saved rows, unsaved rows leaking into the archive (the
 * index range is what excludes them, not a filter), and one user reaching
 * another's quote.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import { aggregatesMock, revenuecatMock } from "./mocks.helpers";
import { asNewUser, type SeededUser } from "./harness.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
// Saving is Xolace+ (#317). Default the suite to a subscriber so the count /
// ordering / ownership cases still exercise the write path; the gate case
// below flips it.
let isPlus = true;
vi.mock("../revenuecat", () => revenuecatMock(() => isPlus));
beforeEach(() => {
  isPlus = true;
});

async function seedQuote(user: SeededUser, date: string) {
  return await user.root.run(async (ctx) =>
    ctx.db.insert("daily_quotes", {
      emotionalProfileId: user.profileId,
      date,
      type: "curated" as const,
      text: `quote for ${date}`,
      isPremium: false,
      createdAt: Date.now(),
    }),
  );
}

const savedCount = (user: SeededUser) =>
  user.root.run(async (ctx) => {
    const profile = await ctx.db.get("emotional_profiles", user.profileId);
    return profile?.savedQuoteCount ?? 0;
  });

const archiveIds = async (user: SeededUser) => {
  const page = await user.t.query(api.dailyQuotes.listSaved, {
    paginationOpts: { numItems: 10, cursor: null },
  });
  return page.page.map((q) => q._id);
};

describe("saved quotes", () => {
  it("keeps only saved rows in the archive, ordered by when they were kept", async () => {
    const user = await asNewUser();
    const first = await seedQuote(user, "2026-01-01");
    const second = await seedQuote(user, "2026-01-02");
    await seedQuote(user, "2026-01-03"); // never saved

    await user.t.mutation(api.dailyQuotes.save, { quoteId: first });
    await user.t.mutation(api.dailyQuotes.save, { quoteId: second });

    // Both saves land in the same millisecond, so the assertion above would
    // pass on creation order alone. Spread them, oldest quote kept LAST, and
    // the order can only come from `savedAt`.
    await user.root.run(async (ctx) => {
      await ctx.db.patch("daily_quotes", second, { savedAt: 1_000 });
      await ctx.db.patch("daily_quotes", first, { savedAt: 2_000 });
    });

    expect(await archiveIds(user)).toEqual([first, second]);
    expect(await savedCount(user)).toBe(2);
  });

  it("counts each quote once, and never below zero", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user, "2026-01-01");

    await user.t.mutation(api.dailyQuotes.save, { quoteId });
    await user.t.mutation(api.dailyQuotes.save, { quoteId });
    expect(await savedCount(user)).toBe(1);

    await user.t.mutation(api.dailyQuotes.unsave, { quoteId });
    await user.t.mutation(api.dailyQuotes.unsave, { quoteId });
    expect(await savedCount(user)).toBe(0);
    expect(await archiveIds(user)).toEqual([]);
  });

  it("leaves the row (and its reaction) behind on unsave", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user, "2026-01-01");

    await user.t.mutation(api.dailyQuotes.react, { quoteId, reaction: "resonates" });
    await user.t.mutation(api.dailyQuotes.save, { quoteId });
    await user.t.mutation(api.dailyQuotes.unsave, { quoteId });

    const row = await user.root.run((ctx) => ctx.db.get("daily_quotes", quoteId));
    expect(row?.savedAt).toBeUndefined();
    expect(row?.reaction).toBe("resonates");
  });

  it("is Xolace+ only to save, but always free to unsave", async () => {
    const user = await asNewUser();
    const quoteId = await seedQuote(user, "2026-01-01");

    isPlus = false;
    await expect(
      user.t.mutation(api.dailyQuotes.save, { quoteId }),
    ).rejects.toThrow(/Xolace\+ required/);
    expect(await savedCount(user)).toBe(0);

    // Kept while subscribed, then lapsed: letting go must never be gated.
    isPlus = true;
    await user.t.mutation(api.dailyQuotes.save, { quoteId });
    isPlus = false;
    await user.t.mutation(api.dailyQuotes.unsave, { quoteId });
    expect(await savedCount(user)).toBe(0);
  });

  it("refuses another user's quote", async () => {
    const owner = await asNewUser();
    const other = await asNewUser(2, owner.root);
    const quoteId = await seedQuote(owner, "2026-01-01");

    await expect(
      other.t.mutation(api.dailyQuotes.save, { quoteId }),
    ).rejects.toThrow(/Not your quote/);
    expect(await savedCount(owner)).toBe(0);
  });
});
