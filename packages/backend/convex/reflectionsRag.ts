import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import {
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { rag, REFLECTION_POOL_NAMESPACE, NO_GRANULAR_LABEL } from "./rag";

// =============================================================
// REFLECTIONS RAG — embeds the anonymous peer pool and precomputes
// semantic matches for Xolace+ sessions.
//
// The RAG component owns embeddings + vector storage; the reflections
// table has no vector index (that would duplicate both). Entries are
// keyed on the reflection _id, so re-adding is an idempotent replace.
//
// Crisis safety: contribute()/anonymize() already gate crisis sessions
// out of the pool before anything reaches here, so every ingested row
// is pool-safe by construction.
// =============================================================

/** Fields needed to embed a single reflection. */
export const getReflectionForRag = internalQuery({
  args: { reflectionId: v.id("reflections") },
  handler: async (ctx, args) => {
    const r = await ctx.db.get("reflections", args.reflectionId);
    if (!r) return null;
    return {
      displayText: r.displayText,
      primaryEmotion: r.primaryEmotion,
      granularLabel: r.granularLabel ?? null,
      status: r.status,
    };
  },
});

/**
 * Embed one reflection into the shared pool namespace. Keyed on the
 * reflection id → replaces cleanly on re-run. Only active rows are
 * indexed; when a row is missing or no longer active, any previously
 * indexed entry is purged so flagged/removed text doesn't linger in
 * the vector store.
 */
export const ingestReflection = internalAction({
  args: { reflectionId: v.id("reflections") },
  handler: async (ctx, args) => {
    const r = await ctx.runQuery(
      internal.reflectionsRag.getReflectionForRag,
      { reflectionId: args.reflectionId },
    );
    if (!r || r.status !== "active") {
      const namespace = await rag.getNamespace(ctx, {
        namespace: REFLECTION_POOL_NAMESPACE,
      });
      if (namespace) {
        await rag.deleteByKey(ctx, {
          namespaceId: namespace.namespaceId,
          key: args.reflectionId,
        });
      }
      return;
    }

    await rag.add(ctx, {
      namespace: REFLECTION_POOL_NAMESPACE,
      key: args.reflectionId,
      text: r.displayText,
      // All three declared filters are required on every add (see rag.ts).
      filterValues: [
        { name: "primaryEmotion", value: r.primaryEmotion },
        { name: "granularLabel", value: r.granularLabel ?? NO_GRANULAR_LABEL },
        { name: "status", value: r.status },
      ],
    });
  },
});

/** One page of active reflection ids for the backfill walk. */
export const listActiveForBackfill = internalQuery({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query("reflections")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .paginate(args.paginationOpts);
    return {
      ids: page.page.map((r) => r._id),
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * One-shot backfill of the existing pool. Self-reschedules a page at a
 * time so each invocation stays within action limits.
 * Run once: `bunx convex run reflectionsRag:backfillPool '{}'`
 */
export const backfillPool = internalAction({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  handler: async (ctx, args) => {
    const page = await ctx.runQuery(
      internal.reflectionsRag.listActiveForBackfill,
      { paginationOpts: { numItems: 25, cursor: args.cursor ?? null } },
    );

    for (const reflectionId of page.ids) {
      await ctx.runAction(internal.reflectionsRag.ingestReflection, {
        reflectionId,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.reflectionsRag.backfillPool, {
        cursor: page.continueCursor,
      });
    }
  },
});

// =============================================================
// Semantic matching (Xolace+): precompute per session.
// =============================================================

/** Query text + intensity for a session's semantic match. */
export const getSessionForSemantic = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return null;

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    // The mirror captures the session's emotional essence best; fall back
    // to the raw input if the mirror somehow wasn't stored.
    const queryText = session.mirrorText ?? session.rawInput ?? null;
    return { queryText, intensity: metadata?.intensity ?? null };
  },
});

/**
 * Apply the intensity ±3 proximity filter to the semantic candidates and
 * persist the top matches. Candidates arrive as raw keys (reflection ids)
 * ordered by relevance; we keep order, drop non-active / out-of-window
 * rows, and store the top 4.
 */
export const finalizeSemanticMatches = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    candidateKeys: v.array(v.string()),
    intensity: v.union(v.number(), v.null()),
  },
  handler: async (ctx, args) => {
    const matched: Id<"reflections">[] = [];
    for (const key of args.candidateKeys) {
      const id = ctx.db.normalizeId("reflections", key);
      if (!id) continue;
      const r = await ctx.db.get("reflections", id);
      if (!r || r.status !== "active") continue;
      if (
        args.intensity !== null &&
        Math.abs(r.intensity - args.intensity) > 3
      ) {
        continue;
      }
      matched.push(id);
      if (matched.length >= 4) break;
    }

    await ctx.db.patch("sessions", args.sessionId, { semanticMatchIds: matched });
  },
});

/**
 * Vector-search the pool for a session and precompute its peer matches.
 * Scheduled for Xolace+ sessions when the peers path is chosen; the
 * reactive matchForSession query upgrades from tag-cascade to these live.
 */
export const computeSemanticMatches = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const info = await ctx.runQuery(
      internal.reflectionsRag.getSessionForSemantic,
      { sessionId: args.sessionId },
    );
    if (!info?.queryText) return;

    const { entries } = await rag.search(ctx, {
      namespace: REFLECTION_POOL_NAMESPACE,
      query: info.queryText,
      filters: [{ name: "status", value: "active" }],
      limit: 8,
    });

    const candidateKeys = entries
      .map((e) => e.key)
      .filter((k): k is string => !!k);
    if (candidateKeys.length === 0) return;

    await ctx.runMutation(internal.reflectionsRag.finalizeSemanticMatches, {
      sessionId: args.sessionId,
      candidateKeys,
      intensity: info.intensity,
    });
  },
});
