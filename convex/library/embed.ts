import { v } from "convex/values";
import { internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../rag";

/**
 * The Library's meaning index (#568, ADR 0021): every active entry's title,
 * dek and body, chunked into one namespace on the shared `rag` instance and
 * keyed on the entry id, so a re-index replaces cleanly. Scheduled by ingest
 * and `setActive` on every change; a retired entry is removed.
 */
export const LIBRARY_NAMESPACE = "library";

/** The entry's indexable text, or null when it must not be in the index. */
export const textForIndex = internalQuery({
  args: { entryId: v.id("library_entries") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { entryId }) => {
    const e = await ctx.db.get("library_entries", entryId);
    if (!e?.active) return null;
    const body = await ctx.db
      .query("library_entry_bodies")
      .withIndex("by_entryId", (q) => q.eq("entryId", entryId))
      .unique();
    return [e.title, e.dek, body?.markdown ?? ""].join("\n\n");
  },
});

export const indexEntry = internalAction({
  args: { entryId: v.id("library_entries") },
  returns: v.null(),
  handler: async (ctx, { entryId }) => {
    const text = await ctx.runQuery(internal.library.embed.textForIndex, { entryId });
    if (text === null) {
      const namespace = await rag.getNamespace(ctx, { namespace: LIBRARY_NAMESPACE });
      if (namespace) await rag.deleteByKey(ctx, { namespaceId: namespace.namespaceId, key: entryId });
      return null;
    }
    await rag.add(ctx, {
      namespace: LIBRARY_NAMESPACE,
      key: entryId,
      text,
      // Every declared filter is required on every add (see rag.ts); none applies here.
      filterValues: [
        { name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
        { name: "granularLabel", value: NO_GRANULAR_LABEL },
        { name: "status", value: NO_STATUS },
      ],
    });
    return null;
  },
});
