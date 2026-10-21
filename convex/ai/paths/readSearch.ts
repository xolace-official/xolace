import { v } from "convex/values";
import { internalQuery, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { rag } from "../../rag";
import { LIBRARY_NAMESPACE } from "../library/embed";
import { readRow } from "../../library/reads";
import { embedSessionText } from "../helpers/embedSessionText";
import { SIMILARITY_FLOOR, type BindEntry } from "./bind";

/** Chunks, not entries: a long entry can fill several slots with its own chunks. */
const SEARCH_LIMIT = 30;

export type ReadHit = { entryId: Id<"library_entries">; similarity: number };

/**
 * The Library entries closest in meaning to tonight's text (#568, ADR 0021),
 * each scored by its best chunk. The session is re-embedded here and the
 * vector never stored. Null = the search never ran (embed or search failed),
 * which the caller treats as "fall back to facets", never as "nothing close".
 * Unfiltered: retired and finished entries are dropped when the hits resolve.
 */
export async function searchReads(ctx: ActionCtx, text: string): Promise<ReadHit[] | null> {
  const vector = await embedSessionText(text);
  if (vector === null) return null;
  try {
    const { entries, results } = await rag.search(ctx, { namespace: LIBRARY_NAMESPACE, query: vector, limit: SEARCH_LIMIT });
    const best = new Map<string, number>();
    for (const r of results) best.set(r.entryId, Math.max(best.get(r.entryId) ?? -Infinity, r.score));
    return entries.flatMap((e) =>
      e.key && best.has(e.entryId)
        ? [{ entryId: e.key as Id<"library_entries">, similarity: best.get(e.entryId)! }]
        : [],
    );
  } catch {
    return null;
  }
}

/** Hits as bindable entries: retired, deleted and already-finished ones dropped. */
export const resolveHits = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    hits: v.array(v.object({ entryId: v.id("library_entries"), similarity: v.number() })),
  },
  handler: async (ctx, { emotionalProfileId, hits }): Promise<BindEntry[]> => {
    const entries: BindEntry[] = [];
    for (const { entryId, similarity } of hits) {
      const entry = await ctx.db.get("library_entries", entryId);
      if (!entry?.active) continue;
      if ((await readRow(ctx, emotionalProfileId, entryId))?.finishedAt !== undefined) continue;
      entries.push({ slug: entry.slug, emotions: [], lifeAreas: [], similarity });
    }
    return entries;
  },
});

/**
 * The read twig's candidates: the facet join's, plus every entry close in
 * meaning, each carrying its similarity. Best-effort — a failed search keeps
 * the facet candidates, logs, and generation carries on. `search` says
 * whether it ran (`skipped` = no read may bind tonight); `fallback` says
 * nothing cleared the floor, so the binder ran on facets.
 */
export async function readCandidates(
  ctx: ActionCtx,
  emotionalProfileId: Id<"emotional_profiles">,
  sessionId: Id<"sessions">,
  readText: string | null,
  facetEntries: BindEntry[],
): Promise<{ entries: BindEntry[]; search: "ran" | "failed" | "skipped"; topScore?: number; fallback: boolean }> {
  if (readText === null) return { entries: facetEntries, search: "skipped", fallback: true };
  let close: BindEntry[] | null = null;
  try {
    const hits = await searchReads(ctx, readText);
    if (hits !== null) {
      close = hits.length > 0 ? await ctx.runQuery(internal.ai.paths.readSearch.resolveHits, { emotionalProfileId, hits }) : [];
    }
  } catch {
    // close stays null: same as a failed embed.
  }
  if (close === null) {
    console.error("kindling: read search failed, binding on facets", { sessionId });
    return { entries: facetEntries, search: "failed", fallback: true };
  }
  const bySlug = new Map(facetEntries.map((e) => [e.slug, e]));
  for (const e of close) bySlug.set(e.slug, { ...e, ...bySlug.get(e.slug), similarity: e.similarity });
  const topScore = close.length > 0 ? Math.max(...close.map((e) => e.similarity!)) : undefined;
  return {
    entries: [...bySlug.values()],
    search: "ran",
    topScore,
    fallback: topScore === undefined || topScore < SIMILARITY_FLOOR.read,
  };
}
