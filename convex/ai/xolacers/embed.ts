import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../../rag";
import { embedSessionText } from "../helpers/embedSessionText";

/**
 * The xolacers' meaning index (#570, ADR 0021): each complete, active
 * xolacer's bio and specialties, one namespace on the shared `rag` instance,
 * keyed on their emotional profile id so a re-index replaces. Scheduled on
 * every profile edit, publish, pause and deletion; anyone no longer complete
 * and active is removed. Backfill by hand:
 *   bunx convex run ai/xolacers/embed:indexAll
 */
export const XOLACER_NAMESPACE = "xolacer";

async function syncEntry(ctx: ActionCtx, emotionalProfileId: Id<"emotional_profiles">) {
  const text = await ctx.runQuery(internal.xolacers.embed.textForIndex, { emotionalProfileId });
  if (text === null) {
    const namespace = await rag.getNamespace(ctx, { namespace: XOLACER_NAMESPACE });
    if (namespace) await rag.deleteByKey(ctx, { namespaceId: namespace.namespaceId, key: emotionalProfileId });
    return;
  }
  await rag.add(ctx, {
    namespace: XOLACER_NAMESPACE,
    key: emotionalProfileId,
    text,
    // Every declared filter is required on every add (see rag.ts); none applies here.
    filterValues: [
      { name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
      { name: "granularLabel", value: NO_GRANULAR_LABEL },
      { name: "status", value: NO_STATUS },
    ],
  });
}

export const indexXolacer = internalAction({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: v.null(),
  handler: async (ctx, { emotionalProfileId }) => {
    await syncEntry(ctx, emotionalProfileId);
    return null;
  },
});

/** The backfill: every xolacer row, so the paused and incomplete are cleared too. */
export const indexAll = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const ids = await ctx.runQuery(internal.xolacers.embed.profileIdsForIndex, {});
    for (const id of ids) await syncEntry(ctx, id);
    return null;
  },
});

/**
 * Chunks, not xolacers — but a 160-character bio is one chunk, so this is
 * roughly the roster it can score.
 * ponytail: anyone past it gets no score and falls to the ranker's order;
 * search per candidate set if the roster outgrows it.
 */
const SEARCH_LIMIT = 100;

/**
 * Each xolacer's best-chunk similarity to the session text, re-embedded here
 * and never stored. `undefined` = the embed or search failed, which the caller
 * treats as "rank as before", never as "nothing close".
 */
export async function searchXolacers(
  ctx: ActionCtx,
  text: string,
): Promise<Partial<Record<Id<"emotional_profiles">, number>> | undefined> {
  const vector = await embedSessionText(text);
  if (vector === null) return undefined;
  try {
    const { entries, results } = await rag.search(ctx, { namespace: XOLACER_NAMESPACE, query: vector, limit: SEARCH_LIMIT });
    // Keys are the profile ids this namespace is indexed on.
    const keyOf = new Map(entries.map((e) => [e.entryId, e.key as Id<"emotional_profiles"> | undefined]));
    const best: Partial<Record<Id<"emotional_profiles">, number>> = {};
    for (const r of results) {
      const key = keyOf.get(r.entryId);
      if (key) best[key] = Math.max(best[key] ?? -Infinity, r.score);
    }
    return best;
  } catch {
    return undefined;
  }
}
