import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";
import { cardItemValidator, toListItem } from "./entries";
import { withCardSignals } from "./reads";

/**
 * Browse search, Lantern section (#549, CONTEXT.md "Browse search"). Matches
 * the `searchText` ingest writes (and `migrations:backfillLibrarySearchText`
 * fills for older rows) — active entries only, never a retired one.
 */

/** Lowercase, with slug separators as spaces: "self-doubt" → "self doubt". */
const asWords = (s: string) => s.toLowerCase().replace(/[-_]+/g, " ").trim();

export const searchTextOf = (
  e: Pick<Doc<"library_entries">, "title" | "dek" | "storyDescriptor">,
  facets: Iterable<{ slug: string }>,
) =>
  // The primary subject comes in as its `subject` facet.
  [e.title, e.dek, e.storyDescriptor, ...Array.from(facets, (f) => f.slug)]
    .filter((s): s is string => !!s)
    .map(asWords)
    .join(" ");

const MAX_QUERY = 100;
const MAX_RESULTS = 20;

export const searchEntries = query({
  args: { query: v.string() },
  returns: v.array(cardItemValidator),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const text = asWords(args.query.slice(0, MAX_QUERY));
    if (!text) return [];
    const rows = await ctx.db
      .query("library_entries")
      .withSearchIndex("search_searchText", (q) => q.search("searchText", text).eq("active", true))
      .take(MAX_RESULTS);
    return await withCardSignals(ctx, profile._id, await Promise.all(rows.map(toListItem)));
  },
});
