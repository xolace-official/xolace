import { v } from "convex/values";
import { internalQuery } from "../../_generated/server";
import { renderSemanticProfile } from "../../semanticProfiles";
import type {
  LightPassContext,
  LightPassMetadataRow,
} from "../prompts/reflectionLight";

// =============================================================
// Reflection Agent — TRIGGER QUERIES (Cognition Layer Phase 3).
//
// The bounded internalQueries backing the orchestrator (trigger.ts): the
// light-pass context read and the consolidation activity gate. Kept apart
// from the trigger so that file stays focused on orchestration wiring.
// =============================================================

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const RECENCY_WINDOW = 8;

/** Map a stored metadata row to the prompt's recency shape. */
function toMetadataRow(m: {
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  thematicTags: string[];
  userLanguageTags: string[];
  temporalContext?: string;
  createdAt: number;
}): LightPassMetadataRow {
  return {
    primaryEmotion: m.primaryEmotion,
    granularLabel: m.granularLabel,
    intensity: m.intensity,
    thematicTags: m.thematicTags,
    userLanguageTags: m.userLanguageTags,
    temporalContext: m.temporalContext,
    createdAt: m.createdAt,
  };
}

/**
 * Everything the light pass reads: the just-completed session's Understanding,
 * the current rendered profile (for continuity), and a short recency window.
 */
export const getLightPassContext = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args): Promise<LightPassContext> => {
    const justMeta = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    const currentDoc = profile?.currentSemanticProfileId
      ? await ctx.db.get("semantic_profiles", profile.currentSemanticProfileId)
      : null;

    const recent = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_theme", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId),
      )
      .order("desc")
      .take(RECENCY_WINDOW);

    return {
      justCompleted: justMeta ? toMetadataRow(justMeta) : null,
      currentProfile: currentDoc ? renderSemanticProfile(currentDoc) : null,
      // Drop the just-completed row from the recency window (it's shown above).
      recentMetadata: recent
        .filter((m) => m.sessionId !== args.sessionId)
        .map(toMetadataRow),
    };
  },
});

/**
 * The activity gate (doc §3, decision-log #7). Due when, since the last
 * consolidation anchor, the user has >= 5 completed sessions OR >= 7 days have
 * elapsed with >= 1 completed session. Anchor falls back to firstSessionAt,
 * then createdAt, when no consolidation has run yet.
 */
export const getConsolidationGate = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  handler: async (ctx, args): Promise<{ due: boolean }> => {
    const profile = await ctx.db.get("emotional_profiles", args.emotionalProfileId);
    if (!profile) return { due: false };

    const anchor =
      profile.lastConsolidationAt ??
      profile.firstSessionAt ??
      profile.createdAt;

    // Bounded: the six newest completed sessions is enough to decide >= 5.
    const completed = await ctx.db
      .query("sessions")
      .withIndex("by_profile_state", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId).eq("state", "completed"),
      )
      .order("desc")
      .take(6);

    const count = completed.filter((s) => s.createdAt > anchor).length;
    const due =
      count >= 5 || (Date.now() - anchor >= SEVEN_DAYS_MS && count >= 1);
    return { due };
  },
});
