import { v } from "convex/values";
import { internalAction } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../../rag";

/**
 * The Library's meaning index (#568, ADR 0021): every active entry's title,
 * dek and body, chunked into one namespace on the shared `rag` instance and
 * keyed on the entry id, so a re-index replaces cleanly. Scheduled by ingest
 * and `setActive` on every change; a retired entry is removed. Lives under
 * ai/ because embedding is a model call; the text it embeds comes from
 * `library/embed.textForIndex`.
 */
export const LIBRARY_NAMESPACE = "library";

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
