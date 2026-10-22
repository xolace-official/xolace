import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { syncKey } from "../helpers/namespaceIndex";

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
	handler: async (ctx, { entryId }) => {
		const text = await ctx.runQuery(internal.library.embed.textForIndex, {
			entryId,
		});
		try {
			await syncKey(ctx, LIBRARY_NAMESPACE, entryId, text);
		} catch (e) {
			// The id is what makes a hole findable; rethrow so the run still shows failed.
			console.error("library index: embed failed", { entryId });
			throw e;
		}
		return null;
	},
	returns: v.null(),
});
