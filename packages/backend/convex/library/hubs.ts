import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { toTrackItem, trackItemValidator } from "../browse";
import { requireAuth } from "../lib/auth";
import { cardItemValidator, coverOf, toListItem } from "./entries";
import { cardSignals } from "./reads";

/** Library hubs (#405): editorial, ordered reading lists (ADR 0015). */

export const hubValidator = v.object({
	_id: v.id("library_hubs"),
	coverThumbhash: v.optional(v.string()), // base64 ThumbHash placeholder (#508)
	coverUrl: v.optional(v.string()),
	intro: v.string(),
	slug: v.string(),
	title: v.string(),
});

export const toHub = async (h: Doc<"library_hubs">) => ({
	_id: h._id,
	coverThumbhash: h.coverThumbhash,
	coverUrl: await coverOf(h),
	intro: h.intro,
	slug: h.slug,
	title: h.title,
});

export const listHubs = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		const hubs = await ctx.db
			.query("library_hubs")
			.withIndex("by_active", (q) => q.eq("active", true))
			.take(50);
		return await Promise.all(hubs.map(toHub));
	},
	returns: v.array(hubValidator),
});

/** One active hub with its items resolved in editorial order; inactive items drop out (#404). */
export const getHub = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const hub = await ctx.db
			.query("library_hubs")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		if (!(hub && hub.active)) {
			return null;
		}

		const items = await Promise.all(
			hub.items.map(async (item) => {
				if (item.kind === "entry") {
					const e = await ctx.db.get("library_entries", item.entryId);
					if (!e?.active) {
						return null;
					}
					return {
						entry: {
							...(await toListItem(e)),
							...(await cardSignals(ctx, profile._id, e._id)),
						},
						kind: "entry" as const,
					};
				}
				const t = await ctx.db.get("audio_tracks", item.audioTrackId);
				return t?.active
					? { kind: "audio" as const, track: await toTrackItem(t) }
					: null;
			})
		);
		return { ...(await toHub(hub)), items: items.filter((i) => i !== null) };
	},
	returns: v.union(
		v.null(),
		v.object({
			...hubValidator.fields,
			items: v.array(
				v.union(
					v.object({ entry: cardItemValidator, kind: v.literal("entry") }),
					v.object({ kind: v.literal("audio"), track: trackItemValidator })
				)
			),
		})
	),
});
