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
import { trackSearchTextOf } from "./searchText";

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

type Track = Omit<Doc<"audio_tracks">, "_id" | "_creationTime">;

const track = (slug: string, family: Track["family"], extra: Partial<Track> = {}): Track => {
  const t: Track = {
    slug,
    family,
    title: `Track ${slug}`,
    topic: `${family === "music" ? "music" : "audio"}_topic_sadness`,
    tags: [],
    sourceTags: [],
    key: `${family}/${slug}.m4a`,
    thumbKey: `thumb/${slug}.webp`,
    durationSec: 60,
    sha256: slug,
    thumbSha256: slug,
    active: true,
    ...extra,
  };
  return { ...t, searchText: trackSearchTextOf(t) };
};

describe("trackSearchTextOf", () => {
  it("covers title, topic, tags, narrators and series; raw source tags for Music only", () => {
    const support = track("s", "support", {
      title: "The Spectrum",
      tags: ["self_worth"],
      sourceTags: ["piano"],
      narrators: ["Sage", "Ash"],
      seriesTitle: "Steady Ground",
    });
    expect(support.searchText).toBe("the spectrum sadness self worth sage ash steady ground");
    expect(track("m", "music", { title: "Low Tide", sourceTags: ["Piano", "rain"] }).searchText).toBe(
      "low tide sadness piano rain",
    );
  });
});

describe("library.search.searchCatalogue", () => {
  it("matches Music on raw source tags, never Support; never an inactive track", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      await ctx.db.insert("audio_tracks", track("m-piano", "music", { sourceTags: ["piano"] }));
      await ctx.db.insert("audio_tracks", track("m-retired", "music", { sourceTags: ["piano"], active: false }));
      await ctx.db.insert("audio_tracks", track("s-tagged", "support", { sourceTags: ["piano"] }));
    });
    const r = await user.t.query(api.library.search.searchCatalogue, { query: "Piano" });
    expect(r.music.map((t) => t.slug)).toEqual(["m-piano"]);
    expect(r.support).toEqual([]);
  });

  it("matches Support by narrator and by series title", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      await ctx.db.insert("audio_tracks", track("ep1", "support", { narrators: ["Sage"], seriesTitle: "Steady Ground" }));
      await ctx.db.insert("audio_tracks", track("other", "support", { narrators: ["Ash"] }));
    });
    const byNarrator = await user.t.query(api.library.search.searchCatalogue, { query: "sage" });
    expect(byNarrator.support.map((t) => t.slug)).toEqual(["ep1"]);
    const bySeries = await user.t.query(api.library.search.searchCatalogue, { query: "steady ground" });
    expect(bySeries.support.map((t) => t.slug)).toEqual(["ep1"]);
  });

  it("lists active hubs and topics with an active track, matched by title", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      const hub = { intro: "", items: [] };
      await ctx.db.insert("library_hubs", { ...hub, slug: "sad-days", title: "For sad days", active: true });
      await ctx.db.insert("library_hubs", { ...hub, slug: "old", title: "Sad archive", active: false });
      await ctx.db.insert("audio_tracks", track("live", "support"));
      await ctx.db.insert("audio_tracks", track("gone", "music", { topic: "music_topic_grief", active: false }));
      await ctx.db.insert("topics", { slug: "grief", title: "Sad grief", thumbKey: "thumb/g.webp", thumbSha256: "g" });
    });
    const r = await user.t.query(api.library.search.searchCatalogue, { query: "sad" });
    // "Sadness" starts with the query, so it outranks the hub; word order is free.
    expect(r.places.map((p) => [p.kind, p.slug])).toEqual([
      ["topic", "sadness"],
      ["hub", "sad-days"],
    ]);
    const reordered = await user.t.query(api.library.search.searchCatalogue, { query: "days sad" });
    expect(reordered.places.map((p) => p.slug)).toEqual(["sad-days"]);
  });

  it("searches nothing for a blank query", async () => {
    const user = await asNewUser();
    await user.root.run(async (ctx) => {
      await ctx.db.insert("audio_tracks", track("m", "music"));
    });
    expect(await user.t.query(api.library.search.searchCatalogue, { query: " " })).toEqual({
      support: [],
      music: [],
      places: [],
    });
  });
});
