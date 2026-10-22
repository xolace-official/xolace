import type { ActionCtx } from "../../_generated/server";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../../rag";

/**
 * Brings one key of a meaning namespace (ADR 0021) in line with its source:
 * `text` re-indexes it (the key makes it a replace), `null` removes it. Throws
 * on a failed embed; callers log what makes the hole findable.
 */
export async function syncKey(ctx: ActionCtx, namespace: string, key: string, text: string | null) {
  if (text === null) {
    const found = await rag.getNamespace(ctx, { namespace });
    if (found) await rag.deleteByKey(ctx, { namespaceId: found.namespaceId, key });
    return;
  }
  await rag.add(ctx, {
    namespace,
    key,
    text,
    // Every declared filter is required on every add (see rag.ts); none applies here.
    filterValues: [
      { name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
      { name: "granularLabel", value: NO_GRANULAR_LABEL },
      { name: "status", value: NO_STATUS },
    ],
  });
}

/**
 * key → best-chunk score in one namespace. `limit` counts chunks, not keys.
 * Throws on a failed search; each caller decides what that means.
 */
export async function bestScoreByKey(
  ctx: ActionCtx,
  namespace: string,
  vector: number[],
  limit: number,
): Promise<Map<string, number>> {
  const { entries, results } = await rag.search(ctx, { namespace, query: vector, limit });
  const keyOf = new Map(entries.map((e) => [e.entryId, e.key]));
  const best = new Map<string, number>();
  for (const r of results) {
    const key = keyOf.get(r.entryId);
    if (key) best.set(key, Math.max(best.get(key) ?? -Infinity, r.score));
  }
  return best;
}
