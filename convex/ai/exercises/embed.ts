import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../../rag";
import type { ExerciseSimilarity } from "../../exercises/match";

/**
 * The exercises' meaning index (#569, ADR 0021): title + steps, one namespace
 * on the shared `rag` instance, keyed on the title so a re-index replaces.
 * Scheduled by `exercises.seed`; run it by hand to backfill:
 *   bunx convex run ai/exercises/embed:indexExercises
 */
export const EXERCISE_NAMESPACE = "exercises";

export const indexExercises = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const texts = await ctx.runQuery(internal.exercises.embed.textsForIndex, {});
    for (const { title, text } of texts) {
      if (text === null) {
        const namespace = await rag.getNamespace(ctx, { namespace: EXERCISE_NAMESPACE });
        if (namespace) await rag.deleteByKey(ctx, { namespaceId: namespace.namespaceId, key: title });
        continue;
      }
      await rag.add(ctx, {
        namespace: EXERCISE_NAMESPACE,
        key: title,
        text,
        // Every declared filter is required on every add (see rag.ts); none applies here.
        filterValues: [
          { name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
          { name: "granularLabel", value: NO_GRANULAR_LABEL },
          { name: "status", value: NO_STATUS },
        ],
      });
    }
    return null;
  },
});

/** Chunks, not exercises: every exercise gets room for all of its chunks. */
const SEARCH_LIMIT = 30;

/**
 * Each exercise's best-chunk similarity to the mirror's session vector — the
 * same vector episodic recall searched with, so no extra embed. `undefined` =
 * no vector or the search failed: the matcher keeps today's order.
 */
export async function searchExercises(
  ctx: ActionCtx,
  vector: number[] | null,
): Promise<ExerciseSimilarity | undefined> {
  if (vector === null) return undefined;
  try {
    const { entries, results } = await rag.search(ctx, { namespace: EXERCISE_NAMESPACE, query: vector, limit: SEARCH_LIMIT });
    const titleOf = new Map(entries.map((e) => [e.entryId, e.key]));
    const best: Record<string, number> = {};
    for (const r of results) {
      const title = titleOf.get(r.entryId);
      if (title) best[title] = Math.max(best[title] ?? -Infinity, r.score);
    }
    return best;
  } catch {
    return undefined;
  }
}
