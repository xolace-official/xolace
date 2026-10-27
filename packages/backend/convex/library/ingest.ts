import { v } from "convex/values";
import { internalMutation } from "../_generated/server";
import schema from "../schema";
import { assertImageAlts } from "./imageAlts";
import { manifestSource } from "./sources";
import { upsertHubRecord, upsertSourceRecord, writeEntry } from "./write";

/**
 * Curator ingest for the Library (#406, decisions in #392), driven by
 * `scripts/library/ingest.ts`. Every upsert is keyed on `slug` and gated on
 * the `sha256` the script computes over the manifest record (+ body): the
 * same hash is a no-op, so re-running an unchanged manifest writes nothing.
 * The publish gates live here, not only in the script — this is the trust
 * boundary.
 */

const upsertResult = v.object({
	action: v.union(
		v.literal("inserted"),
		v.literal("updated"),
		v.literal("unchanged")
	),
});

// Manifest records are the table rows minus what ingest derives itself.
const {
	editedBy: _sourceEditedBy,
	sha256: _sourceSha,
	updatedAt: _sourceUpdatedAt,
	...sourceFields
} = schema.tables.library_sources.validator.fields;
const {
	editedBy: _editedBy,
	readMin: _readMin,
	retiredAt: _retiredAt,
	safetyReviewedAt: _safetyReviewedAt,
	sha256: _entrySha,
	searchText: _searchText,
	updatedAt: _updatedAt,
	...entryManifestFields
} = schema.tables.library_entries.validator.fields;

export const upsertSource = internalMutation({
	args: { sha256: v.string(), source: v.object(sourceFields) },
	handler: async (ctx, { source, sha256 }) => {
		const existing = await ctx.db
			.query("library_sources")
			.withIndex("by_slug", (q) => q.eq("slug", source.slug))
			.unique();
		if (existing?.sha256 === sha256) {
			return { action: "unchanged" as const };
		}
		return { action: await upsertSourceRecord(ctx, source, sha256) };
	},
	returns: upsertResult,
});

export const upsertEntry = internalMutation({
	args: {
		/** Image srcs whose empty alt is deliberate; not stored. */
		decorativeImages: v.optional(v.array(v.string())),
		entry: v.object({
			...entryManifestFields,
			facets: v.record(v.string(), v.array(v.string())), // axis → slugs
			sources: v.array(manifestSource), // credit order
		}),
		markdown: v.string(),
		sha256: v.string(),
	},
	handler: async (ctx, { entry, markdown, decorativeImages, sha256 }) => {
		const existing = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", entry.slug))
			.unique();
		// Before the no-op check, so a re-run re-verifies bodies already stored.
		assertImageAlts(entry.slug, markdown, decorativeImages);
		if (existing?.sha256 === sha256) {
			return { action: "unchanged" as const };
		}

		const { sources, facets, ...fields } = entry;
		await writeEntry(
			ctx,
			existing,
			{ facets, fields, markdown, sources },
			{ sha256, strict: true }
		);

		return { action: existing ? ("updated" as const) : ("inserted" as const) };
	},
	returns: upsertResult,
});

/** Hubs reference already-ingested slugs; array order is the editorial order. */
export const upsertHub = internalMutation({
	args: {
		hub: v.object({
			active: v.boolean(),
			cover1280Key: v.optional(v.string()),
			coverKey: v.optional(v.string()),
			coverThumbhash: v.optional(v.string()),
			coverUrl: v.optional(v.string()),
			intro: v.string(),
			items: v.array(
				v.object({
					kind: v.union(v.literal("entry"), v.literal("audio")),
					ref: v.string(),
				})
			),
			slug: v.string(),
			title: v.string(),
		}),
		sha256: v.string(),
	},
	handler: async (ctx, { hub, sha256 }) => {
		const existing = await ctx.db
			.query("library_hubs")
			.withIndex("by_slug", (q) => q.eq("slug", hub.slug))
			.unique();
		if (existing?.sha256 === sha256) {
			return { action: "unchanged" as const };
		}
		return { action: await upsertHubRecord(ctx, hub, sha256) };
	},
	returns: upsertResult,
});
