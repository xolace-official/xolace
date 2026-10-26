import { ConvexError, type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import { assertHubLive, resolveHubItems } from "../library/write";
import { ADMIN_LIST_LIMIT, adminStamp, assertSlug, notFound } from "./edits";

/**
 * Library hubs for the admin (admin v1 step 6): an editor's ordered reading
 * list of entries and audio. Items are named by slug here, as in files, and
 * resolved to ids on save. A hub may hold items that aren't live (readers
 * skip them), so only copy and "at least one item" gate Publish.
 */

const MAX_HUB_ITEMS = 100;

const hubItem = v.object({
	kind: v.union(v.literal("entry"), v.literal("audio")),
	ref: v.string(),
});

const hubRow = v.object({
	active: v.boolean(),
	editedBy: v.optional(v.string()),
	hasCover: v.boolean(),
	intro: v.string(),
	items: v.array(hubItem),
	retiredAt: v.optional(v.number()),
	slug: v.string(),
	title: v.string(),
	updatedAt: v.number(),
});

async function hubBySlug(ctx: QueryCtx, slug: string) {
	const h = await ctx.db
		.query("library_hubs")
		.withIndex("by_slug", (q) => q.eq("slug", slug))
		.unique();
	if (!h) {
		throw notFound("library hub", slug);
	}
	return h;
}

async function toRow(
	ctx: QueryCtx,
	h: Doc<"library_hubs">
): Promise<Infer<typeof hubRow>> {
	const items = await Promise.all(
		h.items.map(async (item) => ({
			kind: item.kind,
			ref:
				(item.kind === "entry"
					? await ctx.db.get("library_entries", item.entryId)
					: await ctx.db.get("audio_tracks", item.audioTrackId)
				)?.slug ?? "(deleted)",
		}))
	);
	return {
		active: h.active,
		editedBy: h.editedBy,
		hasCover: Boolean(h.cover1280Key ?? h.coverKey ?? h.coverUrl),
		intro: h.intro,
		items,
		retiredAt: h.retiredAt,
		slug: h.slug,
		title: h.title,
		updatedAt: h.updatedAt ?? h._creationTime,
	};
}

export const list = adminQuery({
	args: {},
	handler: async (ctx) => {
		const hubs = await ctx.db.query("library_hubs").take(ADMIN_LIST_LIMIT);
		return await Promise.all(hubs.map((h) => toRow(ctx, h)));
	},
	returns: v.array(hubRow),
});

export const create = adminMutation({
	args: { slug: v.string(), title: v.string() },
	handler: async (ctx, { slug, title }) => {
		assertSlug(slug);
		const taken = await ctx.db
			.query("library_hubs")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (taken) {
			throw new ConvexError(`library hub "${slug}" already exists`);
		}
		await ctx.db.insert("library_hubs", {
			...adminStamp(ctx.identity),
			active: false,
			intro: "",
			items: [],
			slug,
			title,
		});
		return null;
	},
	returns: v.null(),
});

/** Save copy and the running order. A live hub must still pass its gates. */
export const save = adminMutation({
	args: {
		intro: v.string(),
		items: v.array(hubItem),
		slug: v.string(),
		title: v.string(),
	},
	handler: async (ctx, { intro, items: refs, slug, title }) => {
		if (refs.length > MAX_HUB_ITEMS) {
			throw new ConvexError(
				`library hub "${slug}": over ${MAX_HUB_ITEMS} items`
			);
		}
		const h = await hubBySlug(ctx, slug);
		const items = await resolveHubItems(ctx, slug, refs);
		if (h.active) {
			assertHubLive({ intro, items, slug, title });
		}
		await ctx.db.patch("library_hubs", h._id, {
			...adminStamp(ctx.identity),
			intro,
			items,
			title,
		});
		return null;
	},
	returns: v.null(),
});

export const publish = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const h = await hubBySlug(ctx, slug);
		assertHubLive(h);
		await ctx.db.patch("library_hubs", h._id, {
			...adminStamp(ctx.identity),
			active: true,
			retiredAt: undefined,
		});
		return null;
	},
	returns: v.null(),
});

export const retire = adminMutation({
	args: { slug: v.string() },
	handler: async (ctx, { slug }) => {
		const h = await hubBySlug(ctx, slug);
		await ctx.db.patch("library_hubs", h._id, {
			...adminStamp(ctx.identity),
			active: false,
			retiredAt: h.active ? Date.now() : h.retiredAt,
		});
		return null;
	},
	returns: v.null(),
});
