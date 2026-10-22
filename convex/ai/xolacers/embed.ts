import { v } from "convex/values";
import { internalAction, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Id } from "../../_generated/dataModel";
import { embedSessionText } from "../helpers/embedSessionText";
import { bestScoreByKey, syncKey } from "../helpers/namespaceIndex";
import { rag } from "../../rag";

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
  await syncKey(ctx, XOLACER_NAMESPACE, emotionalProfileId, text);
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
 * The retry for a failed removal: `indexXolacer` is scheduled once on pause
 * or deletion and actions don't retry, and `indexAll` can't reach a deleted
 * xolacer (no row left). Walks the index itself and drops every key whose
 * source now says null. Removes only, never re-embeds.
 * ponytail: entries past 1000 are skipped; page it if the roster gets near.
 */
export const sweepIndex = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const found = await rag.getNamespace(ctx, { namespace: XOLACER_NAMESPACE });
    if (!found) return null;
    const { page } = await rag.list(ctx, { namespaceId: found.namespaceId, limit: 1000 });
    for (const { key } of page) {
      if (!key) continue;
      const id = key as Id<"emotional_profiles">;
      const text = await ctx.runQuery(internal.xolacers.embed.textForIndex, { emotionalProfileId: id });
      if (text === null) await syncKey(ctx, XOLACER_NAMESPACE, id, null);
    }
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
    // Keys are the profile ids this namespace is indexed on.
    return Object.fromEntries(await bestScoreByKey(ctx, XOLACER_NAMESPACE, vector, SEARCH_LIMIT));
  } catch (error) {
    console.error("searchXolacers failed", error);
    return undefined;
  }
}
