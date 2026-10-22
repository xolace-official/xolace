import { v } from "convex/values";
import { query } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { requireAuth } from "../lib/auth";
import { toTrackItem, trackItemValidator } from "../browse";
import { cardItemValidator, coverOf, toListItem } from "./entries";
import { cardSignals } from "./reads";

/** Library hubs (#405): editorial, ordered reading lists (ADR 0015). */

export const hubValidator = v.object({
  _id: v.id("library_hubs"),
  slug: v.string(),
  title: v.string(),
  intro: v.string(),
  coverUrl: v.optional(v.string()),
  coverThumbhash: v.optional(v.string()), // base64 ThumbHash placeholder (#508)
});

export const toHub = async (h: Doc<"library_hubs">) => ({
  _id: h._id,
  slug: h.slug,
  title: h.title,
  intro: h.intro,
  coverUrl: await coverOf(h),
  coverThumbhash: h.coverThumbhash,
});

export const listHubs = query({
  args: {},
  returns: v.array(hubValidator),
  handler: async (ctx) => {
    await requireAuth(ctx);
    const hubs = await ctx.db
      .query("library_hubs")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(50);
    return await Promise.all(hubs.map(toHub));
  },
});

/** One active hub with its items resolved in editorial order; inactive items drop out (#404). */
export const getHub = query({
  args: { slug: v.string() },
  returns: v.union(
    v.null(),
    v.object({
      ...hubValidator.fields,
      items: v.array(
        v.union(
          v.object({ kind: v.literal("entry"), entry: cardItemValidator }),
          v.object({ kind: v.literal("audio"), track: trackItemValidator }),
        ),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const hub = await ctx.db
      .query("library_hubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (!hub || !hub.active) return null;

    const items = await Promise.all(
      hub.items.map(async (item) => {
        if (item.kind === "entry") {
          const e = await ctx.db.get("library_entries", item.entryId);
          if (!e?.active) return null;
          return { kind: "entry" as const, entry: { ...(await toListItem(e)), ...(await cardSignals(ctx, profile._id, e._id)) } };
        }
        const t = await ctx.db.get("audio_tracks", item.audioTrackId);
        return t?.active ? { kind: "audio" as const, track: await toTrackItem(t) } : null;
      }),
    );
    return { ...(await toHub(hub)), items: items.filter((i) => i !== null) };
  },
});
