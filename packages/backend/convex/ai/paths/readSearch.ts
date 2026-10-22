import { v } from "convex/values";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { type ActionCtx, internalQuery } from "../../_generated/server";
import { readRow } from "../../library/reads";
import { bestScoreByKey } from "../helpers/namespaceIndex";
import { LIBRARY_NAMESPACE } from "../library/embed";
import { type BindEntry, SIMILARITY_FLOOR } from "./bind";

/** Chunks, not entries: a long entry can fill several slots with its own chunks. */
const SEARCH_LIMIT = 30;

export type ReadHit = { entryId: Id<"library_entries">; similarity: number };

/**
 * The Library entries closest in meaning to tonight's text (#568, ADR 0021),
 * each scored by its best chunk, against the session vector generation
 * embeds once and never stores. Null = the search failed, which the caller
 * treats as "fall back to facets", never as "nothing close". Unfiltered:
 * retired and finished entries are dropped when the hits resolve.
 */
export async function searchReads(
	ctx: ActionCtx,
	vector: number[]
): Promise<ReadHit[] | null> {
	try {
		const best = await bestScoreByKey(
			ctx,
			LIBRARY_NAMESPACE,
			vector,
			SEARCH_LIMIT
		);
		return [...best].map(([key, similarity]) => ({
			entryId: key as Id<"library_entries">,
			similarity,
		}));
	} catch {
		return null;
	}
}

/** Hits as bindable entries: retired, deleted and already-finished ones dropped. */
export const resolveHits = internalQuery({
	args: {
		emotionalProfileId: v.id("emotional_profiles"),
		hits: v.array(
			v.object({ entryId: v.id("library_entries"), similarity: v.number() })
		),
	},
	handler: async (ctx, { emotionalProfileId, hits }): Promise<BindEntry[]> => {
		const entries: BindEntry[] = [];
		for (const { entryId, similarity } of hits) {
			const entry = await ctx.db.get("library_entries", entryId);
			if (!entry?.active) {
				continue;
			}
			if (
				(await readRow(ctx, emotionalProfileId, entryId))?.finishedAt !==
				undefined
			) {
				continue;
			}
			entries.push({
				emotions: [],
				lifeAreas: [],
				similarity,
				slug: entry.slug,
			});
		}
		return entries;
	},
	returns: v.array(
		v.object({
			emotions: v.array(v.string()),
			lifeAreas: v.array(v.string()),
			similarity: v.optional(v.number()),
			slug: v.string(),
		})
	),
});

/**
 * The read twig's candidates: the facet join's, plus every entry close in
 * meaning, each carrying its similarity. Best-effort — a failed embed
 * (`vector` null) or search keeps the facet candidates, logs, and generation
 * carries on. `search` says whether it ran (`skipped` = `vector` undefined,
 * no read may bind tonight); `fallback` says nothing cleared the floor, so
 * the binder ran on facets.
 */
export async function readCandidates(
	ctx: ActionCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	sessionId: Id<"sessions">,
	vector: number[] | null | undefined,
	facetEntries: BindEntry[]
): Promise<{
	entries: BindEntry[];
	search: "ran" | "failed" | "skipped";
	topScore?: number;
	fallback: boolean;
}> {
	if (vector === undefined) {
		return { entries: facetEntries, fallback: true, search: "skipped" };
	}
	let close: BindEntry[] | null = null;
	try {
		const hits = vector === null ? null : await searchReads(ctx, vector);
		if (hits !== null) {
			close =
				hits.length > 0
					? await ctx.runQuery(internal.ai.paths.readSearch.resolveHits, {
							emotionalProfileId,
							hits,
						})
					: [];
		}
	} catch {
		// close stays null: same as a failed embed.
	}
	if (close === null) {
		console.error("kindling: read search failed, binding on facets", {
			sessionId,
		});
		return { entries: facetEntries, fallback: true, search: "failed" };
	}
	const bySlug = new Map(facetEntries.map((e) => [e.slug, e]));
	for (const e of close) {
		bySlug.set(e.slug, {
			...e,
			...bySlug.get(e.slug),
			similarity: e.similarity,
		});
	}
	const topScore =
		close.length > 0 ? Math.max(...close.map((e) => e.similarity!)) : undefined;
	return {
		entries: [...bySlug.values()],
		fallback: topScore === undefined || topScore < SIMILARITY_FLOOR.read,
		search: "ran",
		topScore,
	};
}
