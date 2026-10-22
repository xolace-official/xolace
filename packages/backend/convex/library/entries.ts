import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { type QueryCtx, query } from "../_generated/server";
import { r2 } from "../ai/paths/audioTracks";
import { requireAuth } from "../lib/auth";
import schema from "../schema";
import { listenMin } from "./audio";
import { readRow, withCardSignals } from "./reads";
import { entrySource, readSources } from "./sources";

/**
 * Library base reads (#405, CONTEXT.md "Library", ADR 0015). Open to every
 * signed-in user. Curator-only fields (`lastReviewedAt`, `safetyReviewedAt`,
 * `consentRecordedAt`) never leave this folder — the returns validators
 * are the allow-list.
 */

const { kind: kindValidator, reuse: reuseValidator } =
	schema.tables.library_entries.validator.fields;

export const listItemValidator = v.object({
	_id: v.id("library_entries"),
	coverThumbhash: v.optional(v.string()), // base64 ThumbHash placeholder (#507)
	coverThumbUrl: v.optional(v.string()), // 512px cover, when ingest resized it (#506)
	coverUrl: v.optional(v.string()),
	dek: v.string(),
	kind: kindValidator,
	newUntil: v.optional(v.number()),
	primarySubject: v.string(),
	readMin: v.number(),
	slug: v.string(),
	title: v.string(),
});

/** A list item as the entry cards draw it: plus views and this reader's saved state (#410). */
export const cardItemValidator = v.object({
	...listItemValidator.fields,
	listenMin: v.optional(v.number()),
	saved: v.boolean(),
	views: v.number(),
});

const COVER_URL_TTL_SEC = 3600;

const signCover = (key: string | undefined) =>
	key ? r2.getUrl(key, { expiresIn: COVER_URL_TTL_SEC }) : undefined;

/**
 * The 1280 WebP (#506), then the uploaded original (R2 key, signed now), then a
 * plain hosted `coverUrl` — so shipped apps get the lighter cover unchanged.
 */
export const coverOf = async (
	e: Pick<Doc<"library_entries">, "coverKey" | "coverUrl"> &
		Partial<Pick<Doc<"library_entries">, "cover1280Key">>
) => (await signCover(e.cover1280Key ?? e.coverKey)) ?? e.coverUrl;

/** The cover fields: `coverThumbUrl` (512) and `coverThumbhash` only when ingest made them. */
export const coversOf = async (e: Doc<"library_entries">) => ({
	coverThumbhash: e.coverThumbhash,
	coverThumbUrl: await signCover(e.cover512Key),
	coverUrl: await coverOf(e),
});

export const toListItem = async (e: Doc<"library_entries">) => ({
	_id: e._id,
	dek: e.dek,
	kind: e.kind,
	primarySubject: e.primarySubject,
	readMin: e.readMin,
	slug: e.slug,
	title: e.title,
	...(await coversOf(e)),
	newUntil: e.newUntil,
});

/**
 * One entry by slug, with its body, sources (credit order) and facets. Inactive
 * (retracted) entries are returned, flagged, only to a reader who saved or
 * opened one — read-only access (#404); to anyone else they're null. Every
 * list/hub read skips them.
 */
export const getEntry = query({
	args: { slug: v.string() },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const e = await ctx.db
			.query("library_entries")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		if (!e) {
			return null;
		}
		if (!e.active) {
			const r = await readRow(ctx, profile._id, e._id);
			if (!r || (!r.saved && r.viewedAt === undefined)) {
				return null;
			}
		}

		const [body, sources, facets] = await Promise.all([
			ctx.db
				.query("library_entry_bodies")
				.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
				.unique(),
			readSources(ctx, e),
			ctx.db
				.query("library_entry_facets")
				.withIndex("by_entryId", (q) => q.eq("entryId", e._id))
				.take(100),
		]);
		// Ingest writes these together; a missing half is a broken row.
		if (!body) {
			throw new Error(`Library entry ${e.slug} is missing its body`);
		}

		return {
			...(await toListItem(e)),
			active: e.active,
			contentNote: e.contentNote,
			facets: facets.map((f) => ({ axis: f.axis, slug: f.slug })),
			listenMin: e.active ? await listenMin(ctx, e._id) : undefined,
			markdown: body.markdown,
			publishedAt: e.publishedAt,
			reflectPrompt: e.reflectPrompt,
			reuse: e.reuse,
			sources,
			storyDescriptor: e.storyDescriptor,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			...listItemValidator.fields,
			active: v.boolean(),
			contentNote: v.optional(v.string()),
			facets: v.array(v.object({ axis: v.string(), slug: v.string() })),
			listenMin: v.optional(v.number()), // set when the entry has audio (#411)
			markdown: v.string(),
			publishedAt: v.optional(v.number()),
			reflectPrompt: v.optional(v.string()),
			reuse: reuseValidator,
			sources: v.array(entrySource), // credit order
			storyDescriptor: v.optional(v.string()),
		})
	),
});

const MAX_LIMIT = 100;
// ponytail: facet filters scan up to this many rows per (axis, slug) and
// intersect in memory — fine for a curated catalogue of hundreds; paginate
// when one facet value outgrows it.
const FACET_SCAN = 500;

export async function entryIdsWithFacet(
	ctx: QueryCtx,
	axis: string,
	slug: string
) {
	const rows = await ctx.db
		.query("library_entry_facets")
		.withIndex("by_axis_and_slug", (q) => q.eq("axis", axis).eq("slug", slug))
		.take(FACET_SCAN);
	return new Set(rows.map((r) => r.entryId));
}

/** Active entries, optionally narrowed by kind, subject and audience. Bounded. */
export const listEntries = query({
	args: {
		audience: v.optional(v.string()),
		kind: v.optional(kindValidator),
		limit: v.optional(v.number()),
		subject: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		// ponytail: category screens call without a limit and get the first 50, no
		// load-more; switch to paginate once a subject or kind nears 50 entries.
		const limit = Math.max(
			1,
			Math.min(Math.floor(args.limit ?? 50), MAX_LIMIT)
		);
		const facetFilters: [string, string][] = [];
		if (args.subject) {
			facetFilters.push(["subject", args.subject]);
		}
		if (args.audience) {
			facetFilters.push(["audience", args.audience]);
		}

		if (facetFilters.length === 0) {
			const { kind } = args;
			const rows = await ctx.db
				.query("library_entries")
				.withIndex("by_active_and_kind", (q) =>
					kind ? q.eq("active", true).eq("kind", kind) : q.eq("active", true)
				)
				.take(limit);
			return await withCardSignals(
				ctx,
				profile._id,
				await Promise.all(rows.map(toListItem))
			);
		}

		const [first, ...rest] = await Promise.all(
			facetFilters.map(([axis, slug]) => entryIdsWithFacet(ctx, axis, slug))
		);
		const ids = [...first].filter((id) => rest.every((s) => s.has(id)));
		const rows = await Promise.all(
			ids.map((id) => ctx.db.get("library_entries", id))
		);
		const items = await Promise.all(
			rows
				.filter(
					(e): e is Doc<"library_entries"> =>
						!!e && e.active && (!args.kind || e.kind === args.kind)
				)
				.slice(0, limit)
				.map(toListItem)
		);
		return await withCardSignals(ctx, profile._id, items);
	},
	returns: v.array(cardItemValidator),
});
