// @vitest-environment edge-runtime
/**
 * Browse search, Lantern section (#549): active entries only, matched on the
 * ingest-written search text; an empty query searches nothing.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { asNewUser } from "../test/harness.helpers";
import { aggregatesMock, revenuecatMock } from "../test/mocks.helpers";

vi.mock("../lib/aggregates", () => aggregatesMock());
vi.mock("../revenuecat", () => revenuecatMock());
vi.mock("../ai/paths/audioTracks", () => ({
  r2: { getUrl: async (key: string) => `https://r2.test/${key}` },
}));
afterEach(() => vi.restoreAllMocks());

type Entry = Omit<Doc<"library_entries">, "_id" | "_creationTime">;

const entry = (slug: string, searchText: string, active = true): Entry => ({
  slug,
  kind: "advice",
  title: `Title ${slug}`,
  dek: `Dek ${slug}`,
  primarySubject: "anxiety",
  reuse: "adapted",
  readMin: 4,
  active,
  lastReviewedAt: 1,
  searchText,
});

describe("library.search.searchEntries", () => {
  it("returns matching active entries as cards and never a retired one", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      await ctx.db.insert("library_entries", entry("live", "exam nerves self doubt"));
      await ctx.db.insert("library_entries", entry("retired", "exam panic self doubt", false));
      await ctx.db.insert("library_entries", entry("other", "grief after a loss"));
    });

    const hits = await user.t.query(api.library.search.searchEntries, { query: "Self-Doubt" });
    expect(hits.map((h) => h.slug)).toEqual(["live"]);
    expect(hits[0]).toMatchObject({ views: 0, saved: false });
  });

  it("searches nothing for an empty or blank query", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      await ctx.db.insert("library_entries", entry("live", "exam nerves"));
    });
    expect(await user.t.query(api.library.search.searchEntries, { query: "  " })).toEqual([]);
  });
});
