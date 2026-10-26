import { ConvexError, type Infer, v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

/**
 * An entry's sources, one `library_entry_sources` row per (entry, source)
 * pair in manifest order (#468, CONTEXT.md "Most entries are adapted from
 * several sources"). Written by ingest, read by `getEntry`.
 */

const MAX_SOURCES = 50;

const sourceError = (e: Pick<Doc<"library_entries">, "slug">, why: string) =>
	new ConvexError(`library entry "${e.slug}": ${why}`);

/** One pair as the manifest lists it; `source` is the source's slug. */
export const manifestSource = v.object({
	author: v.optional(v.string()),
	pageTitle: v.string(),
	pageUrl: v.optional(v.string()),
	retrievedAt: v.optional(v.number()),
	source: v.string(),
});

/** One pair as the reader gets it: the page, joined with its source's credit. */
export const entrySource = v.object({
	attributionText: v.string(),
	author: v.optional(v.string()),
	licence: v.string(),
	logoUrl: v.optional(v.string()), // withheld on an adapted entry when the source drops branding
	name: v.string(),
	pageTitle: v.string(),
	pageUrl: v.optional(v.string()),
	retrievedAt: v.optional(v.number()),
	url: v.optional(v.string()),
});

/** Looks up each credited source by slug; an unknown slug is always an error. */
export async function resolveSourceSlugs(
	ctx: MutationCtx,
	e: Pick<Doc<"library_entries">, "slug">,
	sources: Infer<typeof manifestSource>[]
) {
	if (sources.length > MAX_SOURCES) {
		throw sourceError(e, `over ${MAX_SOURCES} sources`);
	}
	return await Promise.all(
		sources.map(async ({ source: slug }) => {
			const s = await ctx.db
				.query("library_sources")
				.withIndex("by_slug", (q) => q.eq("slug", slug))
				.unique();
			if (!s) {
				throw sourceError(e, `unknown source "${slug}"`);
			}
			return s;
		})
	);
}

/**
 * Gates the credits on `reuse`: verbatim is one publisher's words, adapted
 * draws on at least one, original is ours alone.
 */
export function assertSourcesFit(
	e: Pick<Doc<"library_entries">, "slug" | "reuse">,
	resolved: Pick<Doc<"library_sources">, "name">[]
) {
	if (e.reuse === "verbatim" && resolved.length !== 1) {
		throw sourceError(
			e,
			`verbatim needs exactly 1 source, has ${resolved.length}`
		);
	}
	if (e.reuse === "adapted" && resolved.length === 0) {
		throw sourceError(e, "adapted needs at least 1 source");
	}
	const other = resolved.find((s) => s.name !== "Xolace");
	if (e.reuse === "original" && other) {
		throw sourceError(e, `original can only credit Xolace, not ${other.name}`);
	}
}

/** Resolves the manifest's slugs and gates them on `reuse` (ingest). */
export async function resolveSources(
	ctx: MutationCtx,
	e: Pick<Doc<"library_entries">, "slug" | "reuse">,
	sources: Infer<typeof manifestSource>[]
) {
	const resolved = await resolveSourceSlugs(ctx, e, sources);
	assertSourcesFit(e, resolved);
	return resolved;
}

/** Replaces the entry's pairs, so a shorter list leaves no stale rows. */
export async function replaceSources(
	ctx: MutationCtx,
	entryId: Id<"library_entries">,
	sources: Infer<typeof manifestSource>[],
	resolved: Doc<"library_sources">[]
) {
	const old = await ctx.db
		.query("library_entry_sources")
		.withIndex("by_entryId_and_order", (q) => q.eq("entryId", entryId))
		.take(MAX_SOURCES);
	await Promise.all(
		old.map((p) => ctx.db.delete("library_entry_sources", p._id))
	);
	for (const [order, { source: _slug, ...page }] of sources.entries()) {
		await ctx.db.insert("library_entry_sources", {
			entryId,
			order,
			sourceId: resolved[order]._id,
			...page,
		});
	}
}

export async function readSources(
	ctx: QueryCtx,
	e: Doc<"library_entries">
): Promise<Infer<typeof entrySource>[]> {
	const pairs = await ctx.db
		.query("library_entry_sources")
		.withIndex("by_entryId_and_order", (q) => q.eq("entryId", e._id))
		.take(MAX_SOURCES);
	return await Promise.all(
		pairs.map(async (p) => {
			const s = await ctx.db.get("library_sources", p.sourceId);
			if (!s) {
				throw new Error(`Library entry ${e.slug} credits a missing source`);
			}
			return {
				attributionText: s.attributionText,
				author: p.author,
				licence: s.licence,
				logoUrl:
					e.reuse === "adapted" && s.dropBrandingIfAdapted
						? undefined
						: s.logoUrl,
				name: s.name,
				pageTitle: p.pageTitle,
				pageUrl: p.pageUrl,
				retrievedAt: p.retrievedAt,
				url: s.url,
			};
		})
	);
}
