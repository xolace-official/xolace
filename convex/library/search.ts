import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";
import { activeTopics, familyValidator, thumbUrlFor, toTrackItem, trackItemValidator } from "../browse";
import { cardItemValidator, coverOf, toListItem } from "./entries";
import { withCardSignals } from "./reads";
import { asWords } from "./searchText";
import { isCrisisQuery } from "./crisisTerms";

/**
 * Browse search (#549, #550, CONTEXT.md "Browse search"). Lantern entries and
 * tracks match the `searchText` ingest writes (the `migrations:backfill*SearchText`
 * migrations fill older rows) — active rows only, never a retired one. Each
 * section is ranked on its own; the `*Page` queries back a section's See all (#551).
 */

const MAX_QUERY = 100;
// The results screen shows 5 per section; the 6th only tells it to offer See all.
const MAX_RESULTS = 6;

const queryWords = (query: string) => asWords(query.slice(0, MAX_QUERY));

export const searchEntries = query({
  args: { query: v.string() },
  returns: v.array(cardItemValidator),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return [];
    const rows = await entriesMatching(ctx, text).take(MAX_RESULTS);
    return await withCardSignals(ctx, profile._id, await Promise.all(rows.map(toListItem)));
  },
});

const entriesMatching = (ctx: QueryCtx, text: string) =>
  ctx.db
    .query("library_entries")
    .withSearchIndex("search_searchText", (q) => q.search("searchText", text).eq("active", true));

const tracksMatching = (ctx: QueryCtx, family: Doc<"audio_tracks">["family"], text: string) =>
  ctx.db
    .query("audio_tracks")
    .withSearchIndex("search_searchText", (q) =>
      q.search("searchText", text).eq("active", true).eq("family", family),
    );

const searchFamily = (ctx: QueryCtx, family: Doc<"audio_tracks">["family"], text: string) =>
  tracksMatching(ctx, family, text).take(MAX_RESULTS);

const NOTHING = { page: [], isDone: true, continueCursor: "" };

/** Lantern's See all: the same matches as `searchEntries`, a page at a time. */
export const searchEntriesPage = query({
  args: { query: v.string(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(cardItemValidator),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return NOTHING;
    const result = await entriesMatching(ctx, text).paginate(args.paginationOpts);
    const items = await Promise.all(result.page.map(toListItem));
    return { ...result, page: await withCardSignals(ctx, profile._id, items) };
  },
});

/** Support audio's or Music's See all: the same matches as `searchCatalogue`, a page at a time. */
export const searchTracksPage = query({
  args: { query: v.string(), family: familyValidator, paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(trackItemValidator),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return NOTHING;
    const result = await tracksMatching(ctx, args.family, text).paginate(args.paginationOpts);
    return { ...result, page: await Promise.all(result.page.map(toTrackItem)) };
  },
});

const placeValidator = v.object({
  kind: v.union(v.literal("hub"), v.literal("topic")),
  slug: v.string(),
  title: v.string(),
  imageUrl: v.optional(v.string()),
});

/**
 * The Support audio, Music, and Hubs & topics sections, plus whether the query
 * gets the Need someone now? row (#552). Hubs and topics are
 * small, bounded tables, so they're matched in memory on title — a topic only
 * while it has an active track (the topic grid's own rule).
 */
export const searchCatalogue = query({
  args: { query: v.string() },
  returns: v.object({
    support: v.array(trackItemValidator),
    music: v.array(trackItemValidator),
    places: v.array(placeValidator),
    /** The query matched a crisis term: show the Need someone now? row (#552). */
    needSomeone: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const text = queryWords(args.query);
    if (!text) return { support: [], music: [], places: [], needSomeone: false };
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
      // Full raw query: the index cap must not hide a crisis term past it.
      needSomeone: isCrisisQuery(args.query),
    };
  },
});
