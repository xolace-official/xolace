import { ConvexError, v } from "convex/values";
import { adminMutation, adminQuery } from "../lib/adminAuth";
import schema from "../schema";
import { ADMIN_LIST_LIMIT, adminStamp, assertSlug, notFound } from "./edits";

/**
 * Library sources for the admin (admin v1 step 6): the publishers entries
 * credit and the terms we reuse them under. No publish step: a save writes
 * straight through, and every entry crediting the source shows it at once.
 */

const {
	editedBy: _editedBy,
	sha256: _sha256,
	slug: _slug,
	updatedAt: _updatedAt,
	...sourceFields
} = schema.tables.library_sources.validator.fields;

const sourceRow = v.object({
	...sourceFields,
	editedBy: v.optional(v.string()),
	slug: v.string(),
	updatedAt: v.number(),
});

export const list = adminQuery({
	args: {},
	handler: async (ctx) => {
		const sources = await ctx.db
			.query("library_sources")
			.take(ADMIN_LIST_LIMIT);
		return sources.map(
			({ _creationTime, _id, sha256: _rowSha, updatedAt, ...s }) => ({
				...s,
				updatedAt: updatedAt ?? _creationTime,
			})
		);
	},
	returns: v.array(sourceRow),
});

export const create = adminMutation({
	args: { slug: v.string(), source: v.object(sourceFields) },
	handler: async (ctx, { slug, source }) => {
		assertSlug(slug);
		const taken = await ctx.db
			.query("library_sources")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (taken) {
			throw new ConvexError(`library source "${slug}" already exists`);
		}
		await ctx.db.insert("library_sources", {
			...source,
			...adminStamp(ctx.identity),
			slug,
		});
		return null;
	},
	returns: v.null(),
});

/** Replace a source's terms; optional fields left out are cleared. The slug never changes. */
export const save = adminMutation({
	args: { slug: v.string(), source: v.object(sourceFields) },
	handler: async (ctx, { slug, source }) => {
		const existing = await ctx.db
			.query("library_sources")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();
		if (!existing) {
			throw notFound("library source", slug);
		}
		await ctx.db.replace("library_sources", existing._id, {
			...source,
			...adminStamp(ctx.identity),
			slug,
		});
		return null;
	},
	returns: v.null(),
});
