import { v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";
import { listenMin } from "./audio";
import { entryIdsWithFacet, listItemValidator, toListItem } from "./entries";
import { readRow } from "./reads";

type Entry = Doc<"library_entries">;

/**
 * The "Up next" card at the end of a read (#417). A rule, no model call
 * (Constitution Rule): from a hub, the next active entry in the hub's order;
 * otherwise (or past the hub's last entry) the first active entry sharing
 * this one's primary subject that the reader hasn't finished. Nothing
 * qualifies → null, never padded. Inactive entries are never offered.
 *
 * No views or saved state: the card shows neither, and reading the shared
 * totals would re-run every reader's card whenever anyone opens that entry.
 */
export const getNext = query({
  args: { entryId: v.id("library_entries"), hub: v.optional(v.string()) },
  returns: v.union(v.null(), v.object({ ...listItemValidator.fields, listenMin: v.optional(v.number()) })),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const current = await ctx.db.get("library_entries", args.entryId);
    if (!current) return null;
    const next = (await nextInHub(ctx, current, args.hub)) ?? (await nextInSubject(ctx, current, profile._id));
    if (!next) return null;
    return { ...(await toListItem(next)), listenMin: await listenMin(ctx, next._id) };
  },
});

/** The next active entry after `current` in the hub's order; null past its end, or if it isn't in the hub. */
async function nextInHub(ctx: QueryCtx, current: Entry, hubSlug?: string) {
  if (!hubSlug) return null;
  const hub = await ctx.db
    .query("library_hubs")
    .withIndex("by_slug", (q) => q.eq("slug", hubSlug))
    .unique();
  if (!hub?.active) return null;
  const ids = hub.items.flatMap((i) => (i.kind === "entry" ? [i.entryId] : []));
  const at = ids.indexOf(current._id);
  if (at < 0) return null;
  for (const id of ids.slice(at + 1)) {
    const e = await ctx.db.get("library_entries", id);
    if (e?.active) return e;
  }
  return null;
}

/** The first active entry with `current`'s primary subject this reader hasn't finished. */
async function nextInSubject(ctx: QueryCtx, current: Entry, profileId: Id<"emotional_profiles">) {
  for (const id of await entryIdsWithFacet(ctx, "subject", current.primarySubject)) {
    if (id === current._id) continue;
    const e = await ctx.db.get("library_entries", id);
    if (!e?.active || e.primarySubject !== current.primarySubject) continue;
    const r = await readRow(ctx, profileId, id);
    if (r?.finishedAt === undefined) return e;
  }
  return null;
}
