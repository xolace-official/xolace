// =============================================================
// EVAL HARNESS (online) — Cognition Layer Phase 4, Loop #4.
//
// The read side of the north-star: confirmation rate per prompt/model version.
// These queries are the first (and only) consumer of the `by_model_version`
// index that has been planted on `sessions` since day one specifically for
// "quality comparison across prompt iterations" (schema.ts). They read the
// version + tone + terminal-verdict stamps every prior loop has been
// diligently writing and hand them to the pure summarizer in
// ./ai/evalMetrics.ts. No model call, no re-derivation — pure infra.
//
// Two read patterns, both bounded (Convex reads are never unbounded):
//   confirmationRateByVersion  — recent-window health across ALL versions,
//                                for "how are mirrors doing lately?"
//   confirmationRateForVersions — targeted A/B on named versions via the
//                                index, for "did the new prompt beat the old?"
//
// Internal-only: this is an operator/eval surface (run from the Convex
// dashboard/CLI or the Reflection Agent), not a user-facing query.
// =============================================================

import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import {
  summarizeConfirmations,
  rankVersions,
  type ConfirmationSample,
  type TerminalState,
} from "./ai/evalMetrics";

// Hard ceilings so a growing sessions table can never blow the read limit.
// The window scan defaults small; the per-version scan gets a larger cap
// because each version is a comparatively narrow slice.
const DEFAULT_WINDOW = 2000;
const MAX_WINDOW = 8000;
const MAX_PER_VERSION = 8000;

// Only rows that reached a terminal mirror verdict AND carry a version stamp
// are eval signal. Non-terminal / unstamped sessions are filtered out.
function toSample(session: Doc<"sessions">): ConfirmationSample | null {
  const state = session.confirmationState;
  const version = session.mirrorModelVersion;
  if (!state || !version) return null;
  return {
    version,
    tone: session.toneUsed ?? null,
    companion: session.talkCompanionVersion ?? null,
    state: state as TerminalState,
  };
}

/**
 * Recent-window confirmation health across every version seen in the window.
 * Reads the most recent `limit` sessions (optionally since `sinceMs`) via the
 * `by_date` index, keeps the ones with a terminal verdict, and returns the
 * summary + a best-first ranking. This is a sampled north-star: the window is
 * bounded, so on a high-volume deployment it reflects recent activity, which
 * is exactly what you want when watching a freshly shipped prompt.
 */
export const confirmationRateByVersion = internalQuery({
  args: {
    sinceMs: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? DEFAULT_WINDOW, MAX_WINDOW);

    const rows = await ctx.db
      .query("sessions")
      .withIndex("by_date", (q) =>
        args.sinceMs !== undefined ? q.gte("createdAt", args.sinceMs) : q,
      )
      .order("desc")
      .take(limit);

    const samples = rows
      .map(toSample)
      .filter((s): s is ConfirmationSample => s !== null);

    const summary = summarizeConfirmations(samples);
    return {
      sampled: rows.length,
      judged: summary.overall.judged,
      truncated: rows.length === limit,
      summary,
      ranking: rankVersions(summary.byVersion),
    };
  },
});

/**
 * Targeted comparison of named versions via the `by_model_version` index —
 * the precise A/B tool ("current articulator prompt vs. the previous one").
 * Each version is scanned independently and bounded to MAX_PER_VERSION, so
 * this stays exact per version rather than sampling a shared window.
 */
export const confirmationRateForVersions = internalQuery({
  args: {
    versions: v.array(v.string()),
    perVersionLimit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const cap = Math.min(args.perVersionLimit ?? MAX_PER_VERSION, MAX_PER_VERSION);

    const samples: ConfirmationSample[] = [];
    const truncated: string[] = [];
    // De-dupe requested versions so a repeated arg doesn't double-count.
    for (const version of new Set(args.versions)) {
      const rows = await ctx.db
        .query("sessions")
        .withIndex("by_model_version", (q) =>
          q.eq("mirrorModelVersion", version),
        )
        .take(cap);
      if (rows.length === cap) truncated.push(version);
      for (const row of rows) {
        const s = toSample(row);
        if (s) samples.push(s);
      }
    }

    const summary = summarizeConfirmations(samples);
    return {
      judged: summary.overall.judged,
      truncated,
      summary,
      ranking: rankVersions(summary.byVersion),
    };
  },
});
