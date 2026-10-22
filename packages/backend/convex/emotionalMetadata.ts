import { v } from "convex/values";
import { query, internalMutation, internalQuery } from "./_generated/server";
import { requireSessionOwnership } from "./lib/auth";
import {
  safeguardLevelValidator,
  supportNeedValidator,
  triggerTypeValidator,
} from "./lib/validators";
import { adjustImportance, DEFAULT_IMPORTANCE } from "./episodicImportance";
import {
  isInSuggestionCooldown,
  retainedSuggestion,
  suggestedSpecialty,
  SUGGESTION_COOLDOWN_MS,
  type SuggestionInput,
} from "./lib/xolacerSuggestion";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { specialtyValidator } from "./lib/specialties";

/**
 * The two IO gates the pure suggestion module deliberately doesn't own: a
 * user already talking to someone, and the 7-day cooldown. Both are plain
 * index scans, so wrapping them would add a seam that only tests array
 * membership.
 *
 * `sessionId` is excluded from the cooldown walk so a pipeline retry — the
 * store mutation is an idempotent upsert — doesn't see its own earlier write
 * and suppress the suggestion it already made.
 */
async function resolveSuggestedSpecialty(
  ctx: MutationCtx,
  args: Omit<SuggestionInput, "entryType"> & {
    sessionId: Id<"sessions">;
    emotionalProfileId: Id<"emotional_profiles">;
  },
) {
  // Read rather than passed as an argument: `entryType` lives on the session
  // and every store arg is spread into the metadata row, so taking it as an
  // arg would either persist a duplicate of it or need destructuring out.
  // Matches "open_prompt" to the pipeline's own default for legacy rows.
  const session = await ctx.db.get("sessions", args.sessionId);
  const specialty = suggestedSpecialty({
    ...args,
    entryType: session?.entryType ?? "open_prompt",
  });
  if (!specialty) return undefined;

  // Never talk over a request the user is already waiting on.
  for (const status of ["requested", "open", "resting"] as const) {
    const live = await ctx.db
      .query("xolacer_conversations")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userProfileId", args.emotionalProfileId).eq("status", status),
      )
      .first();
    if (live) return undefined;
  }

  // Streamed rather than collected: the predicate short-circuits, so a user
  // who *was* suggested recently stops at the first hit. Only the common
  // no-suggestion case walks the window, and that is one row per session for
  // one user over 7 days — bounded and small, which is why no timestamp field
  // exists. The rule itself stays in the pure module; this only feeds it.
  const now = Date.now();
  for await (const row of ctx.db
    .query("emotional_metadata")
    .withIndex("by_profile_createdAt", (q) =>
      q
        .eq("emotionalProfileId", args.emotionalProfileId)
        .gte("createdAt", now - SUGGESTION_COOLDOWN_MS),
    )) {
    if (row.sessionId === args.sessionId) continue;
    if (isInSuggestionCooldown([row], now)) return undefined;
  }

  return specialty;
}

/**
 * AI stores the emotional classification for a session.
 */
export const store = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    emotionalProfileId: v.id("emotional_profiles"),
    classifierVersion: v.string(),
    primaryEmotion: v.string(),
    primaryEmotionConfidence: v.number(),
    granularLabel: v.optional(v.string()),
    secondaryEmotion: v.optional(v.string()),
    intensity: v.number(),
    specificity: v.number(),
    thematicTags: v.array(v.string()),
    userLanguageTags: v.array(v.string()),
    temporalContext: v.optional(
      v.union(
        v.literal("past_focused"),
        v.literal("present_focused"),
        v.literal("future_focused")
      )
    ),
    riskFlag: v.boolean(),
    // Understanding fields (Cognition Layer Phase 2): full safeguard
    // verdict, episodic memories in context, semantic profile version.
    safeguardLevel: v.optional(safeguardLevelValidator),
    safeguardTrigger: v.optional(triggerTypeValidator),
    // Kindling trigger (docs/paths-v1.md §1). Already forced to "none" by
    // the caller when safeguard escalates — this mutation stores the
    // resolved value, it does not re-derive it.
    supportNeed: v.optional(supportNeedValidator),
    episodicMatchKeys: v.optional(v.array(v.string())),
    // As returned by rag.search. Omitted (never 0) when no search ran or
    // nothing was retrieved.
    episodicTopScore: v.optional(v.number()),
    profileVersion: v.optional(v.number()),
    // Follow-up system: brief internal reason from the classifier. Never
    // shown to the user. Present only when the classifier flagged a follow-up.
    followUpReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Idempotent per session: the pipeline can legitimately re-run (a retry
    // after a partial failure past this step) and every reader assumes a
    // 1:1 session→row invariant via .unique(). Upsert to guarantee it.
    const existing = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    // Part of the Understanding, decided here because every input it needs is
    // already an argument.
    //
    // Never let it cost the classification write. Resolving a suggestion does
    // real IO (a session read, up to three conversation index reads, a 7-day
    // metadata walk), and this is the only write of the Understanding itself —
    // the far more valuable half.
    let suggestion: Awaited<ReturnType<typeof resolveSuggestedSpecialty>>;
    try {
      suggestion = await resolveSuggestedSpecialty(ctx, args);
    } catch (error) {
      console.error("[emotionalMetadata] suggestion resolve failed", error);
    }

    // Applies to both the resolve that declined (the user has since opened a
    // conversation, or the re-classified session no longer qualifies) and the
    // resolve that threw — in both cases undefined would erase the cooldown
    // record rather than record an absence.
    const row = {
      ...args,
      suggestedSpecialty: retainedSuggestion(
        suggestion,
        existing?.suggestedSpecialty,
        args.safeguardLevel,
      ),
    };

    if (existing) {
      await ctx.db.patch("emotional_metadata", existing._id, row);
      return;
    }
    await ctx.db.insert("emotional_metadata", {
      ...row,
      createdAt: Date.now(),
    });
  },
});

/**
 * Replace the Understanding of a session after a refinement turn
 * (docs/confidence-aware-mirroring.md §5.3).
 *
 * Replace, not merge: every downstream consumer runs after the session ends
 * and wants the FINAL read of the moment, so a new null `granularLabel` must
 * win over the old label rather than losing to it. Each optional field is
 * therefore passed explicitly — an omitted one patches as `undefined`, which
 * Convex deletes.
 *
 * Narrow on purpose. `store` requires `riskFlag` (safeguard-derived, and
 * clarify never runs safeguard), and preservation of the safety fields there
 * is an invisible property of which keys the caller happened to spread. This
 * validator has no safety fields at all, so wiping one is not expressible.
 *
 * `followUpReason` is raise-only — a re-classification may turn a follow-up
 * on, never off.
 */
export const replaceForRefinement = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    classifierVersion: v.string(),
    primaryEmotion: v.string(),
    primaryEmotionConfidence: v.number(),
    granularLabel: v.optional(v.string()),
    secondaryEmotion: v.optional(v.string()),
    intensity: v.number(),
    specificity: v.number(),
    thematicTags: v.array(v.string()),
    userLanguageTags: v.array(v.string()),
    temporalContext: v.optional(
      v.union(
        v.literal("past_focused"),
        v.literal("present_focused"),
        v.literal("future_focused"),
      ),
    ),
    // Replaced too: Loop #3 fires once at terminal confirmation and reads
    // whatever the row holds then, so these must credit the memories that
    // informed the mirror the person actually confirmed. The pair moves
    // together, and only when `episodicMatchKeys` is passed — omitting it says
    // the search never ran (outage), which must leave the existing provenance
    // alone rather than erase it.
    episodicMatchKeys: v.optional(v.array(v.string())),
    episodicTopScore: v.optional(v.number()),
    followUpReason: v.optional(v.string()),
    // Kindling trigger (docs/paths-v1.md §1). Refreshed here too — this
    // write is the final read of the moment, and a turn can move the grade
    // just as it moves emotion/intensity. Already forced to "none" by the
    // caller when safeguard was escalated; this mutation stores, not derives.
    supportNeed: v.optional(supportNeedValidator),
    // Safety verdict re-evaluated on the accumulated input. The trio moves
    // together and only when the turn actually re-ran safeguard (added text);
    // a zero-added-text turn leaves the initial-pass verdict alone.
    riskFlag: v.optional(v.boolean()),
    safeguardLevel: v.optional(safeguardLevelValidator),
    safeguardTrigger: v.optional(triggerTypeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    // No row means the session was never classified — clarify fails the
    // session before it gets here, so there is nothing to replace.
    if (!existing) return null;

    await ctx.db.patch("emotional_metadata", existing._id, {
      ...(args.safeguardLevel !== undefined
        ? {
            safeguardLevel: args.safeguardLevel,
            riskFlag: args.riskFlag ?? existing.riskFlag,
            safeguardTrigger: args.safeguardTrigger,
          }
        : {}),
      classifierVersion: args.classifierVersion,
      primaryEmotion: args.primaryEmotion,
      primaryEmotionConfidence: args.primaryEmotionConfidence,
      granularLabel: args.granularLabel,
      secondaryEmotion: args.secondaryEmotion,
      intensity: args.intensity,
      specificity: args.specificity,
      thematicTags: args.thematicTags,
      userLanguageTags: args.userLanguageTags,
      temporalContext: args.temporalContext,
      ...(args.supportNeed !== undefined
        ? { supportNeed: args.supportNeed }
        : {}),
      ...(args.episodicMatchKeys !== undefined
        ? {
            episodicMatchKeys: args.episodicMatchKeys,
            episodicTopScore: args.episodicTopScore,
          }
        : {}),
      // Stamped only when absent: replace otherwise loses the fact that
      // confidence moved, and the field's presence IS "this session refined".
      ...(existing.initialConfidence === undefined
        ? { initialConfidence: existing.primaryEmotionConfidence }
        : {}),
      ...(args.followUpReason ? { followUpReason: args.followUpReason } : {}),
    });
    return null;
  },
});

/**
 * Phase 4, Loop #3 — nudge one memory's salience weight from confirmation
 * feedback. Cheap and transactional: reads the current weight, applies the
 * bump/decay, patches. Returns whether the weight actually moved so the
 * caller can skip the (expensive) re-embed on a no-op or missing row.
 * `feedback` is a terminal confirmationState; only "confirmed"/"gave_up"
 * move the weight (see episodicImportance.ts).
 */
export const adjustEpisodicImportance = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    feedback: v.union(
      v.literal("confirmed"),
      v.literal("refined"),
      v.literal("gave_up"),
      v.literal("abandoned"),
    ),
  },
  handler: async (ctx, args): Promise<{ changed: boolean }> => {
    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    // No Understanding row → this memory was never classified/embedded.
    if (!metadata) return { changed: false };

    // Compare against the effective current weight (undefined = default), so a
    // neutral nudge or one already clamped at a boundary writes nothing and
    // skips the caller's re-embed.
    const current = metadata.episodicImportance ?? DEFAULT_IMPORTANCE;
    const next = adjustImportance(metadata.episodicImportance, args.feedback);
    if (next === current) return { changed: false };

    await ctx.db.patch("emotional_metadata", metadata._id, { episodicImportance: next });
    return { changed: true };
  },
});

// Full `emotional_metadata` document shape, mirroring schema.ts exactly.
const emotionalMetadataDocValidator = v.object({
  _id: v.id("emotional_metadata"),
  _creationTime: v.number(),
  sessionId: v.id("sessions"),
  emotionalProfileId: v.id("emotional_profiles"),
  classifierVersion: v.string(),
  primaryEmotion: v.string(),
  primaryEmotionConfidence: v.number(),
  granularLabel: v.optional(v.string()),
  secondaryEmotion: v.optional(v.string()),
  intensity: v.number(),
  specificity: v.number(),
  thematicTags: v.array(v.string()),
  userLanguageTags: v.array(v.string()),
  temporalContext: v.optional(
    v.union(
      v.literal("past_focused"),
      v.literal("present_focused"),
      v.literal("future_focused"),
    ),
  ),
  riskFlag: v.boolean(),
  safeguardLevel: v.optional(safeguardLevelValidator),
  safeguardTrigger: v.optional(triggerTypeValidator),
  supportNeed: v.optional(supportNeedValidator),
  episodicMatchKeys: v.optional(v.array(v.string())),
  episodicTopScore: v.optional(v.number()),
  initialConfidence: v.optional(v.number()),
  episodicImportance: v.optional(v.number()),
  profileVersion: v.optional(v.number()),
  followUpReason: v.optional(v.string()),
  suggestedSpecialty: v.optional(specialtyValidator),
  createdAt: v.number(),
  reclassifiedAt: v.optional(v.number()),
});

/**
 * Get emotional metadata for a session (with ownership check).
 */
export const getBySession = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.union(emotionalMetadataDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireSessionOwnership(ctx, args.sessionId);

    return await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

/**
 * Get emotional metadata for a session (internal, no auth check).
 * Used by AI actions that already verified session ownership.
 */
export const getBySessionInternal = internalQuery({
  args: {
    sessionId: v.id("sessions"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
  },
});

/**
 * Get recent emotional metadata for a profile (for AI context building).
 */
export const getRecentByProfile = internalQuery({
  args: {
    emotionalProfileId: v.id("emotional_profiles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    return await ctx.db
      .query("emotional_metadata")
      .withIndex("by_profile_theme", (q) =>
        q.eq("emotionalProfileId", args.emotionalProfileId)
      )
      .order("desc")
      .take(limit);
  },
});
