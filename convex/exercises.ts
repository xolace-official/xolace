import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { internal } from "./_generated/api";
import { matchExercise } from "./exercises/match";

/**
 * Compute allowed swap target IDs for a session: the reset exercise + the
 * next-best recommendation (excluding the currently active exercise).
 * Shared by getSwapOptions (client hint) and recordSwap (server validation).
 */
async function computeSwapOptions(
  ctx: QueryCtx | MutationCtx,
  session: Doc<"sessions">,
): Promise<{ resetId: Id<"exercises"> | null; nextBestId: Id<"exercises"> | null }> {
  const resetDoc = await ctx.db
    .query("exercises")
    .withIndex("by_title", (q) => q.eq("title", "reset"))
    .unique();
  const resetId = resetDoc && resetDoc.active ? resetDoc._id : null;

  const metadata = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", session._id))
    .unique();

  if (!metadata) return { resetId, nextBestId: null };

  const ranked = matchExercise({
    primaryEmotion: metadata.primaryEmotion,
    granularLabel: metadata.granularLabel,
    intensity: metadata.intensity,
    userLanguageTags: metadata.userLanguageTags,
    entryType: session.entryType ?? "open_prompt",
    confirmationState: "confirmed",
  }, session.exerciseSimilarity);

  const currentId = session.swappedExerciseIds?.length
    ? session.swappedExerciseIds[session.swappedExerciseIds.length - 1]
    : (session.matchedExerciseId ?? null);

  let nextBestId: Id<"exercises"> | null = null;
  for (const title of ranked) {
    if (title === "reset") continue;
    const doc = await ctx.db
      .query("exercises")
      .withIndex("by_title", (q) => q.eq("title", title))
      .unique();
    if (doc && doc.active && doc._id !== currentId) {
      nextBestId = doc._id;
      break;
    }
  }

  return { resetId, nextBestId };
}

const stepValidator = v.object({
  order: v.number(),
  content: v.string(),
  defaultContent: v.optional(v.string()),
  durationSeconds: v.optional(v.number()),
  type: v.union(
    v.literal("text"),
    v.literal("timer"),
    v.literal("prompt"),
    v.literal("breath"),
    v.literal("haptic"),
    v.literal("private_prompt"),
  ),
  breathPattern: v.optional(v.union(
    v.literal("physiological_sigh"),
    v.literal("extended_exhale"),
    v.literal("slow_exhale"),
  )),
  breathCycles: v.optional(v.number()),
  hapticIntensity: v.optional(v.union(
    v.literal("light"),
    v.literal("medium"),
    v.literal("heavy"),
  )),
  slotKeys: v.optional(v.array(v.string())),
  promptPlaceholder: v.optional(v.string()),
  promptMaxSeconds: v.optional(v.number()),
  syncToBreath: v.optional(v.boolean()),
});

// Full `exercises` document shape, mirroring schema.ts's `exercises` table.
const exerciseDocValidator = v.object({
  _id: v.id("exercises"),
  _creationTime: v.number(),
  title: v.string(),
  type: v.union(
    v.literal("breathing"),
    v.literal("body_scan"),
    v.literal("grounding"),
    v.literal("self_compassion"),
    v.literal("cognitive_reframe"),
    v.literal("visualization"),
    v.literal("journaling_prompt"),
  ),
  targetEmotions: v.array(v.string()),
  intensityRange: v.object({ min: v.number(), max: v.number() }),
  steps: v.array(stepValidator),
  estimatedMinutes: v.number(),
  active: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

/**
 * Get the active exercise for a running session (matched or latest swap).
 * Returns exercise doc + filled slot values.
 */
export const getForSession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(
    v.null(),
    v.object({
      exercise: exerciseDocValidator,
      slots: v.record(v.string(), v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const swapped = session.swappedExerciseIds;
    const exerciseId =
      swapped && swapped.length > 0
        ? swapped[swapped.length - 1]
        : (session.matchedExerciseId ?? null);

    if (!exerciseId) {
      const fallback = await ctx.db
        .query("exercises")
        .withIndex("by_title", (q) => q.eq("title", "let_it_land"))
        .unique();
      if (!fallback) return null;
      return { exercise: fallback, slots: {} as Record<string, string> };
    }

    const exercise = await ctx.db.get("exercises", exerciseId);
    if (!exercise) return null;

    return {
      exercise,
      slots: (session.exerciseSlots ?? {}) as Record<string, string>,
    };
  },
});

/**
 * Match exercises for a session based on its emotional metadata.
 */
export const matchForSession = query({
  args: { sessionId: v.id("sessions") },
  returns: v.array(exerciseDocValidator),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    if (!metadata) return [];

    const exercises = await ctx.db
      .query("exercises")
      .withIndex("by_active", (q) => q.eq("active", true))
      .take(50);

    const matching = exercises.filter((e) => {
      const emotionMatch = e.targetEmotions.includes(metadata.primaryEmotion);
      const intensityMatch =
        metadata.intensity >= e.intensityRange.min &&
        metadata.intensity <= e.intensityRange.max;
      return emotionMatch && intensityMatch;
    });

    const rankedTitles = matchExercise({
      primaryEmotion: metadata.primaryEmotion,
      granularLabel: metadata.granularLabel,
      intensity: metadata.intensity,
      userLanguageTags: metadata.userLanguageTags,
      entryType: session.entryType ?? "open_prompt",
      confirmationState: "confirmed",
    }, session.exerciseSimilarity);

    const byTitle = new Map(matching.map((e) => [e.title, e]));
    const ordered: typeof matching = [];
    for (const title of rankedTitles) {
      const doc = byTitle.get(title);
      if (doc) ordered.push(doc);
    }

    return ordered.slice(0, 3);
  },
});

/**
 * Get ranked swap options for a session (reset + next-best).
 * Returns IDs only — client passes to recordSwap.
 */
export const getSwapOptions = query({
  args: { sessionId: v.id("sessions") },
  returns: v.object({
    resetId: v.union(v.id("exercises"), v.null()),
    nextBestId: v.union(v.id("exercises"), v.null()),
  }),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);
    return await computeSwapOptions(ctx, session);
  },
});

/**
 * Get a single exercise by ID.
 */
export const getById = query({
  args: { exerciseId: v.id("exercises") },
  returns: v.union(exerciseDocValidator, v.null()),
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get("exercises", args.exerciseId);
  },
});

/**
 * Record an exercise swap for a session (max 2 swaps enforced).
 */
export const recordSwap = mutation({
  args: {
    sessionId: v.id("sessions"),
    newExerciseId: v.id("exercises"),
  },
  returns: v.object({ swapsUsed: v.number() }),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const currentSwaps = session.swappedExerciseIds ?? [];
    if (currentSwaps.length >= 2) throw new Error("Maximum swaps reached");

    const { resetId, nextBestId } = await computeSwapOptions(ctx, session);
    const allowed = new Set(
      [resetId, nextBestId].filter((id): id is Id<"exercises"> => id !== null),
    );
    if (!allowed.has(args.newExerciseId)) {
      throw new Error("Exercise not allowed for this session");
    }

    const updatedSwaps = [...currentSwaps, args.newExerciseId];
    await ctx.db.patch("sessions", args.sessionId, {
      swappedExerciseIds: updatedSwaps,
    });
    return { swapsUsed: updatedSwaps.length };
  },
});

/**
 * Look up an exercise by internal title.
 */
export const getByTitle = internalQuery({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("exercises")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .unique();
  },
});

/**
 * Set the matched exercise on a session (called from generateMirror).
 */
export const setMatched = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    matchedExerciseId: v.id("exercises"),
    exerciseSimilarity: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;
    await ctx.db.patch("sessions", args.sessionId, {
      matchedExerciseId: args.matchedExerciseId,
      exerciseSimilarity: args.exerciseSimilarity,
    });
  },
});

/**
 * Refresh a session's exercise scores after refinement adds text
 * (undefined clears them).
 */
export const setExerciseSimilarity = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseSimilarity: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;
    await ctx.db.patch("sessions", args.sessionId, {
      exerciseSimilarity: args.exerciseSimilarity,
    });
  },
});

/**
 * Seed exercises into the library (upserts by title).
 */
export const seed = internalMutation({
  args: {
    exercises: v.array(
      v.object({
        title: v.string(),
        type: v.union(
          v.literal("breathing"),
          v.literal("body_scan"),
          v.literal("grounding"),
          v.literal("self_compassion"),
          v.literal("cognitive_reframe"),
          v.literal("visualization"),
          v.literal("journaling_prompt"),
        ),
        targetEmotions: v.array(v.string()),
        intensityRange: v.object({ min: v.number(), max: v.number() }),
        steps: v.array(stepValidator),
        estimatedMinutes: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const exercise of args.exercises) {
      const existing = await ctx.db
        .query("exercises")
        .withIndex("by_title", (q) => q.eq("title", exercise.title))
        .unique();
      if (existing) {
        await ctx.db.patch("exercises", existing._id, { ...exercise, updatedAt: now });
      } else {
        await ctx.db.insert("exercises", {
          ...exercise,
          active: true,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
    await ctx.scheduler.runAfter(0, internal.ai.exercises.embed.indexExercises, {});
  },
});
