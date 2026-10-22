import { ConvexError, v, type Infer } from "convex/values";
import { internalAction, internalMutation, internalQuery, type ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import { rag, NO_GRANULAR_LABEL, NO_PRIMARY_EMOTION, NO_STATUS } from "../../rag";
import { REFRAME_SERIES, SIMILARITY_FLOOR, type BindTrack } from "./bind";

/**
 * The tracks' meaning index (#572, ADR 0021): a namespace per topic
 * (`track:<topic>`), plus `track:reality-not-false-hope` for the reframe
 * series, keyed on the slug so a re-index replaces. The topic stays the gate:
 * a search only ever runs inside the namespace of the topic the model picked.
 * `upsertTrack` and `setTrackActive` (below) schedule `indexTrack` when what it
 * embeds changes; a retired track is removed. Backfill:
 *   bunx convex run migrations:run '{"fn": "migrations:backfillTrackIndex"}'
 */
const ns = (scope: string) => `track:${scope}`;

/** Every namespace a track lives in. */
export const trackNamespaces = (t: Pick<BindTrack, "topic" | "series">) =>
  [ns(t.topic), ...(t.series === REFRAME_SERIES ? [ns(REFRAME_SERIES)] : [])];

/** The one namespace a track twig binds inside; null for twigs that aren't tracks. */
export function namespaceFor(actionType: string): string | null {
  if (actionType === "episode_reframe") return ns(REFRAME_SERIES);
  return actionType.startsWith("audio_topic_") || actionType.startsWith("music_topic_") ? ns(actionType) : null;
}

/** Support audio embeds its transcript; music its title, tags and what it's for; either without them, title + tags. */
export function trackIndexText(
  t: Pick<Doc<"audio_tracks">, "family" | "title" | "tags" | "transcript" | "whatItsFor">,
): string {
  if (t.family === "support" && t.transcript) return t.transcript;
  return [t.title, t.tags.join(", "), ...(t.family === "music" && t.whatItsFor ? [t.whatItsFor] : [])].join("\n\n");
}

/** What `indexTrack` writes, so a re-ingest only re-embeds on a difference. */
export const indexSignature = (t: Doc<"audio_tracks">) =>
  JSON.stringify([t.active, trackNamespaces(t), trackIndexText(t)]);

export const trackForIndex = internalQuery({
  args: { trackId: v.id("audio_tracks") },
  returns: v.union(
    v.object({ slug: v.string(), namespaces: v.array(v.string()), text: v.union(v.string(), v.null()) }),
    v.null(),
  ),
  handler: async (ctx, { trackId }) => {
    const t = await ctx.db.get("audio_tracks", trackId);
    if (!t) return null;
    return { slug: t.slug, namespaces: trackNamespaces(t), text: t.active ? trackIndexText(t) : null };
  },
});

// ponytail: a track moved to another topic leaves its old namespace entry
// behind. It's inert (a hit only scores a track of the namespace it was found
// in); clear old namespaces in upsertTrack if topics start moving.
export const indexTrack = internalAction({
  args: { trackId: v.id("audio_tracks") },
  returns: v.null(),
  handler: async (ctx, { trackId }) => {
    const t = await ctx.runQuery(internal.ai.paths.trackSearch.trackForIndex, { trackId });
    if (!t) return null;
    for (const namespace of t.namespaces) {
      if (t.text === null) {
        const found = await rag.getNamespace(ctx, { namespace });
        if (found) await rag.deleteByKey(ctx, { namespaceId: found.namespaceId, key: t.slug });
        continue;
      }
      try {
        await rag.add(ctx, {
          namespace,
          key: t.slug,
          text: t.text,
          // Every declared filter is required on every add (see rag.ts); none applies here.
          filterValues: [
            { name: "primaryEmotion", value: NO_PRIMARY_EMOTION },
            { name: "granularLabel", value: NO_GRANULAR_LABEL },
            { name: "status", value: NO_STATUS },
          ],
        });
      } catch (e) {
        // The slug is what makes a hole findable; rethrow so the run still shows failed.
        console.error("track index: embed failed", { trackId, slug: t.slug, namespace });
        throw e;
      }
    }
    return null;
  },
});

/**
 * Retire (licence lapse) or restore a track without deleting it. Script- or
 * dashboard-run: `bunx convex run ai/paths/trackSearch:setTrackActive '{"slug": "…", "active": false}'`.
 * A retired track leaves the meaning index (#572).
 */
export const setTrackActive = internalMutation({
  args: { slug: v.string(), active: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { slug, active }) => {
    const existing = await ctx.db
      .query("audio_tracks")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!existing) throw new ConvexError(`setTrackActive: no audio_tracks row for slug "${slug}"`);
    await ctx.db.patch("audio_tracks", existing._id, { active });
    await ctx.scheduler.runAfter(0, internal.ai.paths.trackSearch.indexTrack, { trackId: existing._id });
    return null;
  },
});

/** Chunks, not tracks; a topic holds tens of tracks, a transcript a few chunks each. */
const SEARCH_LIMIT = 100;

export const trackSearchLogValidator = v.object({
  actionType: v.string(),
  search: v.union(v.literal("ran"), v.literal("failed")),
  topScore: v.optional(v.number()),
  fallback: v.boolean(),
});
export type TrackSearchLog = Infer<typeof trackSearchLogValidator>;

/**
 * Scores the tracks of each picked track twig's topic against tonight's
 * vector, onto `similarity`. `vector` is only called when a track twig was
 * picked. Best-effort: a null vector or a failed search leaves that topic
 * unscored, so it binds on tags, and is logged. One log per track twig:
 * whether the search ran, how close the best track came, and whether it fell
 * back to tags.
 */
export async function scoreTracks(
  ctx: ActionCtx,
  vector: () => Promise<number[] | null>,
  actionTypes: string[],
  tracks: BindTrack[],
  sessionId: Id<"sessions">,
): Promise<{ tracks: BindTrack[]; logs: TrackSearchLog[] }> {
  const best = new Map<string, number>();
  const logs: TrackSearchLog[] = [];
  for (const actionType of new Set(actionTypes)) {
    const namespace = namespaceFor(actionType);
    if (namespace === null) continue;
    const v = await vector();
    const scores = v === null ? null : await search(ctx, v, namespace);
    if (scores === null) {
      console.error("kindling: track search failed, binding on tags", { sessionId, actionType });
      logs.push({ actionType, search: "failed", fallback: true });
      continue;
    }
    // Only a track that lives in this namespace scores here (see indexTrack's ponytail).
    const inTopic = tracks.filter((t) => scores.has(t.slug) && trackNamespaces(t).includes(namespace));
    for (const t of inTopic) best.set(t.slug, Math.max(best.get(t.slug) ?? -Infinity, scores.get(t.slug)!));
    const topScore = inTopic.length > 0 ? Math.max(...inTopic.map((t) => scores.get(t.slug)!)) : undefined;
    logs.push({ actionType, search: "ran", topScore, fallback: topScore === undefined || topScore < SIMILARITY_FLOOR.track });
  }
  return { tracks: tracks.map((t) => (best.has(t.slug) ? { ...t, similarity: best.get(t.slug) } : t)), logs };
}

/** slug → best-chunk score in one namespace; null = the search failed. */
async function search(ctx: ActionCtx, vector: number[], namespace: string): Promise<Map<string, number> | null> {
  try {
    const { entries, results } = await rag.search(ctx, { namespace, query: vector, limit: SEARCH_LIMIT });
    const slugOf = new Map(entries.map((e) => [e.entryId, e.key]));
    const best = new Map<string, number>();
    for (const r of results) {
      const slug = slugOf.get(r.entryId);
      if (slug) best.set(slug, Math.max(best.get(slug) ?? -Infinity, r.score));
    }
    return best;
  } catch {
    return null;
  }
}
