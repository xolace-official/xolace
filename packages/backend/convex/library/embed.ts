import { v } from "convex/values";
import { internalQuery } from "../_generated/server";

/**
 * What the meaning index (`ai/library/embed.indexEntry`, #568) embeds for an
 * entry: title, dek and body. Null when it must not be in the index (retired
 * or gone), which the index job turns into a removal.
 */
export const textForIndex = internalQuery({
	args: { entryId: v.id("library_entries") },
	handler: async (ctx, { entryId }) => {
		const e = await ctx.db.get("library_entries", entryId);
		if (!e?.active) {
			return null;
		}
		const body = await ctx.db
			.query("library_entry_bodies")
			.withIndex("by_entryId", (q) => q.eq("entryId", entryId))
			.unique();
		return [e.title, e.dek, body?.markdown ?? ""].join("\n\n");
	},
	returns: v.union(v.string(), v.null()),
});
