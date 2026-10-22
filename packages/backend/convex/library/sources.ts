import { ConvexError, v, type Infer } from "convex/values";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

/**
 * An entry's sources, one `library_entry_sources` row per (entry, source)
 * pair in manifest order (#468, CONTEXT.md "Most entries are adapted from
 * several sources"). Written by ingest, read by `getEntry`.
 */

const MAX_SOURCES = 50;

/** One pair as the manifest lists it; `source` is the source's slug. */
export const manifestSource = v.object({
  source: v.string(),
  pageTitle: v.string(),
  pageUrl: v.optional(v.string()),
  author: v.optional(v.string()),
  retrievedAt: v.optional(v.number()),
});

/** One pair as the reader gets it: the page, joined with its source's credit. */
export const entrySource = v.object({
  name: v.string(),
  url: v.optional(v.string()),
  logoUrl: v.optional(v.string()), // withheld on an adapted entry when the source drops branding
  licence: v.string(),
  attributionText: v.string(),
  pageTitle: v.string(),
  pageUrl: v.optional(v.string()),
  author: v.optional(v.string()),
  retrievedAt: v.optional(v.number()),
});

/**
 * Resolves the manifest's slugs and gates them on `reuse`: verbatim is one
 * publisher's words, adapted draws on at least one, original is ours alone.
 */
export async function resolveSources(
  ctx: MutationCtx,
  e: Pick<Doc<"library_entries">, "slug" | "reuse">,
  sources: Infer<typeof manifestSource>[],
) {
  const fail = (why: string) => new ConvexError(`library entry "${e.slug}": ${why}`);
  if (sources.length > MAX_SOURCES) throw fail(`over ${MAX_SOURCES} sources`);
  const resolved = await Promise.all(
    sources.map(async ({ source: slug }) => {
      const s = await ctx.db
        .query("library_sources")
        .withIndex("by_slug", (q) => q.eq("slug", slug))
        .unique();
      if (!s) throw fail(`unknown source "${slug}"`);
      return s;
    }),
  );
  if (e.reuse === "verbatim" && resolved.length !== 1) {
    throw fail(`verbatim needs exactly 1 source, has ${resolved.length}`);
  }
  if (e.reuse === "adapted" && resolved.length === 0) throw fail("adapted needs at least 1 source");
  const other = resolved.find((s) => s.name !== "Xolace");
  if (e.reuse === "original" && other) throw fail(`original can only credit Xolace, not ${other.name}`);
  return resolved;
}

/** Replaces the entry's pairs, so a shorter list leaves no stale rows. */
export async function replaceSources(
  ctx: MutationCtx,
  entryId: Id<"library_entries">,
  sources: Infer<typeof manifestSource>[],
  resolved: Doc<"library_sources">[],
) {
  const old = await ctx.db
    .query("library_entry_sources")
    .withIndex("by_entryId_and_order", (q) => q.eq("entryId", entryId))
    .take(MAX_SOURCES);
  await Promise.all(old.map((p) => ctx.db.delete("library_entry_sources", p._id)));
  for (const [order, { source: _slug, ...page }] of sources.entries()) {
    await ctx.db.insert("library_entry_sources", { entryId, sourceId: resolved[order]._id, order, ...page });
  }
}

export async function readSources(ctx: QueryCtx, e: Doc<"library_entries">): Promise<Infer<typeof entrySource>[]> {
  const pairs = await ctx.db
    .query("library_entry_sources")
    .withIndex("by_entryId_and_order", (q) => q.eq("entryId", e._id))
    .take(MAX_SOURCES);
  return await Promise.all(
    pairs.map(async (p) => {
      const s = await ctx.db.get("library_sources", p.sourceId);
      if (!s) throw new Error(`Library entry ${e.slug} credits a missing source`);
      return {
        name: s.name,
        url: s.url,
        logoUrl: e.reuse === "adapted" && s.dropBrandingIfAdapted ? undefined : s.logoUrl,
        licence: s.licence,
        attributionText: s.attributionText,
        pageTitle: p.pageTitle,
        pageUrl: p.pageUrl,
        author: p.author,
        retrievedAt: p.retrievedAt,
      };
    }),
  );
}
