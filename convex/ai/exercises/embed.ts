import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { bestScoreByKey, syncKey } from "../helpers/namespaceIndex";
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
    for (const { title, text } of texts) await syncKey(ctx, EXERCISE_NAMESPACE, title, text);
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
    return Object.fromEntries(await bestScoreByKey(ctx, EXERCISE_NAMESPACE, vector, SEARCH_LIMIT));
  } catch (error) {
    console.error("searchExercises failed", error);
    return undefined;
  }
}
