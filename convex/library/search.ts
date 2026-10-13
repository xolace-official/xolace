import { v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";
import { activeTopics, thumbUrlFor, toTrackItem, trackItemValidator } from "../browse";
import { cardItemValidator, coverOf, toListItem } from "./entries";
import { withCardSignals } from "./reads";
import { asWords } from "./searchText";

/**
 * Browse search (#549, #550, CONTEXT.md "Browse search"). Lantern entries and
 * tracks match the `searchText` ingest writes (the `migrations:backfill*SearchText`
 * migrations fill older rows) — active rows only, never a retired one. Each
 * section is ranked on its own.
 */

const MAX_QUERY = 100;
const MAX_RESULTS = 20;

const queryWords = (query: string) => asWords(query.slice(0, MAX_QUERY));

export const searchEntries = query({
  args: { query: v.string() },
  returns: v.array(cardItemValidator),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return [];
    const rows = await ctx.db
      .query("library_entries")
      .withSearchIndex("search_searchText", (q) => q.search("searchText", text).eq("active", true))
      .take(MAX_RESULTS);
    return await withCardSignals(ctx, profile._id, await Promise.all(rows.map(toListItem)));
  },
});

const searchFamily = (ctx: QueryCtx, family: Doc<"audio_tracks">["family"], text: string) =>
  ctx.db
    .query("audio_tracks")
    .withSearchIndex("search_searchText", (q) =>
      q.search("searchText", text).eq("active", true).eq("family", family),
    )
    .take(MAX_RESULTS);

const placeValidator = v.object({
  kind: v.union(v.literal("hub"), v.literal("topic")),
  slug: v.string(),
  title: v.string(),
  imageUrl: v.optional(v.string()),
});

/**
 * The Support audio, Music, and Hubs & topics sections. Hubs and topics are
 * small, bounded tables, so they're matched in memory on title — a topic only
 * while it has an active track (the topic grid's own rule).
 */
export const searchCatalogue = query({
  args: { query: v.string() },
  returns: v.object({
    support: v.array(trackItemValidator),
    music: v.array(trackItemValidator),
    places: v.array(placeValidator),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return { support: [], music: [], places: [] };
    // Every query word somewhere in the title, any order; a title that starts
    // with the query ranks first.
    const words = text.split(/\s+/);
    const matches = (title: string) => words.every((w) => asWords(title).includes(w));
    const rank = (title: string) => (asWords(title).startsWith(text) ? 0 : 1);

    const [support, music, hubs, topics] = await Promise.all([
      searchFamily(ctx, "support", text),
      searchFamily(ctx, "music", text),
      ctx.db
        .query("library_hubs")
        .withIndex("by_active", (q) => q.eq("active", true))
        .take(50), // ponytail: same ceiling as listHubs; page if hubs ever pass 50
      activeTopics(ctx),
    ]);

    return {
      support: await Promise.all(support.map(toTrackItem)),
      music: await Promise.all(music.map(toTrackItem)),
      places: (await Promise.all([
        ...hubs
          .filter((h) => matches(h.title))
          .map(async (h) => ({ kind: "hub" as const, slug: h.slug, title: h.title, imageUrl: await coverOf(h) })),
        ...topics
          .filter((t) => matches(t.title))
          .map(async (t) => ({ kind: "topic" as const, slug: t.slug, title: t.title, imageUrl: await thumbUrlFor(t.thumbKey) })),
      ])).sort((a, b) => rank(a.title) - rank(b.title)),
    };
  },
});
