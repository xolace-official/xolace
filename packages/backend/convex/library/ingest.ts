import { ConvexError, v } from "convex/values";
import { internalMutation } from "../_generated/server";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { PRIMARY_EMOTIONS, THEMATIC_TAGS, canonicalFacet } from "../lib/understandingVocab";
import schema from "../schema";
import { assertImageAlts } from "./imageAlts";
import { searchTextOf } from "./searchText";
import { manifestSource, replaceSources, resolveSources } from "./sources";

/**
 * Curator ingest for the Library (#406, decisions in #392), driven by
 * `scripts/library/ingest.ts`. Every upsert is keyed on `slug` and gated on
 * the `sha256` the script computes over the manifest record (+ body): the
 * same hash is a no-op, so re-running an unchanged manifest writes nothing.
 * The publish gates live here, not only in the script — this is the trust
 * boundary.
 */

const upsertResult = v.object({
  action: v.union(v.literal("inserted"), v.literal("updated"), v.literal("unchanged")),
});

// Manifest records are the table rows minus what ingest derives itself.
const { sha256: _sourceSha, ...sourceFields } = schema.tables.library_sources.validator.fields;
const {
  readMin: _readMin,
  safetyReviewedAt: _safetyReviewedAt,
  sha256: _entrySha,
  searchText: _searchText,
  ...entryManifestFields
} = schema.tables.library_entries.validator.fields;

const FACET_VOCAB: Record<string, ReadonlySet<string>> = {
  emotion: new Set(PRIMARY_EMOTIONS),
  lifeArea: new Set(THEMATIC_TAGS),
};

const WORDS_PER_MIN = 200;

/**
 * Hard publish gates (#392, #404), shared with the one-off `setActive`:
 * a first-hand story needs recorded consent to exist at all; an explainer
 * needs a safety review of its current body to be active.
 */
export function assertPublishable(
  e: Pick<Doc<"library_entries">, "slug" | "kind" | "reuse" | "active" | "consentRecordedAt" | "safetyReviewedAt">,
) {
  if (e.kind === "story" && e.reuse === "original" && e.consentRecordedAt === undefined) {
    throw new ConvexError(`library entry "${e.slug}": first-hand story has no consentRecordedAt`);
  }
  if (e.kind === "explainer" && e.active && e.safetyReviewedAt === undefined) {
    throw new ConvexError(
      `library entry "${e.slug}": explainer has no safetyReviewedAt for its current body — ingest it ` +
        `with active: false, then run library/admin:markSafetyReviewed`,
    );
  }
}

export const upsertSource = internalMutation({
  args: { source: v.object(sourceFields), sha256: v.string() },
  returns: upsertResult,
  handler: async (ctx, { source, sha256 }) => {
    const existing = await ctx.db
      .query("library_sources")
      .withIndex("by_slug", (q) => q.eq("slug", source.slug))
      .unique();
    if (!existing) {
      await ctx.db.insert("library_sources", { ...source, sha256 });
      return { action: "inserted" as const };
    }
    if (existing.sha256 === sha256) return { action: "unchanged" as const };
    await ctx.db.replace("library_sources", existing._id, { ...source, sha256 });
    return { action: "updated" as const };
  },
});

export const upsertEntry = internalMutation({
  args: {
    entry: v.object({
      ...entryManifestFields,
      sources: v.array(manifestSource), // credit order
      facets: v.record(v.string(), v.array(v.string())), // axis → slugs
    }),
    markdown: v.string(),
    /** Image srcs whose empty alt is deliberate; not stored. */
    decorativeImages: v.optional(v.array(v.string())),
    sha256: v.string(),
  },
  returns: upsertResult,
  handler: async (ctx, { entry, markdown, decorativeImages, sha256 }) => {
    const existing = await ctx.db
      .query("library_entries")
      .withIndex("by_slug", (q) => q.eq("slug", entry.slug))
      .unique();
    // Before the no-op check, so a re-run re-verifies bodies already stored.
    assertImageAlts(entry.slug, markdown, decorativeImages);
    if (existing?.sha256 === sha256) return { action: "unchanged" as const };

    const { sources, facets, ...fields } = entry;
    const resolved = await resolveSources(ctx, entry, sources);

    const pairs = new Map<string, { axis: string; slug: string }>();
    for (const [axis, slugs] of [...Object.entries(facets), ["subject", [entry.primarySubject]] as const]) {
      for (const authored of slugs) {
        const slug = canonicalFacet(axis, authored);
        if (FACET_VOCAB[axis] && !FACET_VOCAB[axis].has(slug)) {
          throw new ConvexError(`library entry "${entry.slug}": ${axis} "${slug}" is not in the Understanding vocabulary`);
        }
        pairs.set(`${axis}\u0000${slug}`, { axis, slug });
      }
    }

    const body = existing
      ? await ctx.db
          .query("library_entry_bodies")
          .withIndex("by_entryId", (q) => q.eq("entryId", existing._id))
          .unique()
      : null;
    const doc = {
      ...fields,
      readMin: Math.max(1, Math.ceil(markdown.split(/\s+/).filter(Boolean).length / WORDS_PER_MIN)),
      // A review covers one body: any edit clears it (#392).
      safetyReviewedAt: body?.markdown === markdown ? existing?.safetyReviewedAt : undefined,
      sha256,
      searchText: searchTextOf(fields, pairs.values()),
    };
    assertPublishable(doc);

    let entryId = existing?._id;
    if (entryId) {
      await ctx.db.replace("library_entries", entryId, doc);
      const old = await ctx.db
        .query("library_entry_facets")
        .withIndex("by_entryId", (q) => q.eq("entryId", entryId!))
        .take(500);
      await Promise.all(old.map((f) => ctx.db.delete("library_entry_facets", f._id)));
    } else {
      entryId = await ctx.db.insert("library_entries", doc);
    }
    if (body) await ctx.db.patch("library_entry_bodies", body._id, { markdown });
    else await ctx.db.insert("library_entry_bodies", { entryId, markdown });
    for (const f of pairs.values()) await ctx.db.insert("library_entry_facets", { entryId, ...f });
    await replaceSources(ctx, entryId, sources, resolved);
    // Re-embed (or drop, if inactive) off the transaction: embedding is network.
    await ctx.scheduler.runAfter(0, internal.ai.library.embed.indexEntry, { entryId });

    return { action: existing ? ("updated" as const) : ("inserted" as const) };
  },
});

/** Hubs reference already-ingested slugs; array order is the editorial order. */
export const upsertHub = internalMutation({
  args: {
    hub: v.object({
      slug: v.string(),
      title: v.string(),
      intro: v.string(),
      coverUrl: v.optional(v.string()),
      coverKey: v.optional(v.string()),
      cover1280Key: v.optional(v.string()),
      coverThumbhash: v.optional(v.string()),
      active: v.boolean(),
      items: v.array(v.object({ kind: v.union(v.literal("entry"), v.literal("audio")), ref: v.string() })),
    }),
    sha256: v.string(),
  },
  returns: upsertResult,
  handler: async (ctx, { hub, sha256 }) => {
    const existing = await ctx.db
      .query("library_hubs")
      .withIndex("by_slug", (q) => q.eq("slug", hub.slug))
      .unique();
    if (existing?.sha256 === sha256) return { action: "unchanged" as const };

    const items: Doc<"library_hubs">["items"] = [];
    for (const { kind, ref } of hub.items) {
      const missing = () => new ConvexError(`library hub "${hub.slug}": unknown ${kind} "${ref}"`);
      if (kind === "entry") {
        const e = await ctx.db.query("library_entries").withIndex("by_slug", (q) => q.eq("slug", ref)).unique();
        if (!e) throw missing();
        items.push({ kind, entryId: e._id });
      } else {
        const t = await ctx.db.query("audio_tracks").withIndex("by_slug", (q) => q.eq("slug", ref)).unique();
        if (!t) throw missing();
        items.push({ kind, audioTrackId: t._id });
      }
    }

    const doc = { ...hub, items, sha256 };
    if (!existing) {
      await ctx.db.insert("library_hubs", doc);
      return { action: "inserted" as const };
    }
    await ctx.db.replace("library_hubs", existing._id, doc);
    return { action: "updated" as const };
  },
});
