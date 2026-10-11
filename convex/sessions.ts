import { ConvexError, v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { paginationOptsValidator } from "convex/server";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { deriveClaimStrength } from "./lib/claimStrength";
import { EPISODIC_CONNECT_FLOOR } from "./ai/routing";
import {
  entryTypeValidator,
  confirmationStateValidator,
  pathChosenValidator,
  postSessionMoodValidator,
  resourceValidator,
  mirrorToneValidator,
} from "./lib/validators";
import { getTimeOfDay, getDayOfWeek } from "./lib/timeOfDay";
import { recordActivity } from "./streaks/activityLog";
import { rateLimiter, SESSION_INITIATE_LIMITS_PLUS } from "./lib/rateLimits";
import {
  abandonRequiresFollowUp,
  computeRequiresFollowUp,
} from "./lib/followUpCadence";
import schema from "./schema";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const ABANDON_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// Hard ceiling on a single reflection's text. The client's TextArea enforces
// the same limit via maxLength, so a normal user never reaches this — the
// server throw only fires against a tampered client. A generous bound (~800
// words); the mirror rate limit is the real cost containment, this is cheap
// insurance on token spend. Keep in sync with MAX_RAW_INPUT in typing-state.tsx.
const MAX_RAW_INPUT = 5_000;

// Terminal states — sessions in these states cannot be transitioned further.
const TERMINAL_STATES = new Set(["completed", "abandoned"]);

// Full `sessions` document shape, derived from schema.ts so a new column
// can't silently break every query that returns a raw session doc.
const sessionDocValidator = v.object({
  ...schema.tables.sessions.validator.fields,
  _id: v.id("sessions"),
  _creationTime: v.number(),
});

/**
 * Finalize the follow-up gate at session close and (idempotently) kick off the
 * durable follow-up workflow when warranted.
 *
 * `requiresFollowUp` is the gate the caller computed:
 * - completion paths use `computeRequiresFollowUp` (folds in gave_up);
 * - the abandon path gates strictly on `escalationTriggered` (escalation-then-
 *   abandon is the highest-value check-in; a plain abandon never starts one).
 */
async function finalizeFollowUp(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  requiresFollowUp: boolean,
): Promise<void> {
  if (session.requiresFollowUp !== requiresFollowUp) {
    await ctx.db.patch("sessions", session._id, { requiresFollowUp });
  }
  // One-active-per-profile + idempotency are enforced in followUps; here we
  // only guard against the obvious double-start on the same session. A
  // follow-up compounding alone may earn is started by the evaluation (#529).
  if (requiresFollowUp && !session.followUpWorkflowId) {
    await ctx.scheduler.runAfter(0, internal.followUps.startFollowUpWorkflow, {
      sessionId: session._id,
    });
  }
}

/**
 * Flip a session terminal (→ completed) and fire the post-session job tail.
 *
 * This is the single source of truth for "the reflective work is done." It is
 * called the moment that work ends — at the Exit tap, when a solo exercise
 * finishes, when the peer screen is done — NOT when the user later interacts
 * with the session-end screen. Post-session enrichment (mood, contribution)
 * lands separately via `recordPostSessionFeedback` as a patch on the already-
 * completed session, so closing the app on the session-end screen can never
 * strand a session at `path_selected` / `path_in_progress`.
 */
async function finalizeCompletion(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  opts: {
    pathCompleted: boolean;
    pathChosen?: Doc<"sessions">["pathChosen"];
    /** The cron's stranded reconciliation: never fires the compounding trigger. */
    stranded?: boolean;
  },
): Promise<void> {
  const now = Date.now();

  await ctx.db.patch("sessions", session._id, {
    state: "completed",
    pathCompleted: opts.pathCompleted,
    ...(opts.pathChosen ? { pathChosen: opts.pathChosen } : {}),
    completedAt: now,
    sessionDuration: now - session.createdAt,
    updatedAt: now,
  });

  // One reflect per completion, whichever route (exit, solo, peers, or the
  // cron's stranded reconciliation) — same transaction, so the streak moves
  // with the session.
  await recordActivity(ctx, {
    emotionalProfileId: session.emotionalProfileId,
    actionType: "reflect",
    timestamp: now,
  });

  const requiresFollowUp = computeRequiresFollowUp({
    storedFlag: session.requiresFollowUp,
    confirmationState: session.confirmationState,
    escalationTriggered: session.escalationTriggered,
  });
  // Compounding (#519): this session's reading may open a stretch, and any
  // open one may close. Its own transaction (#529), so a heavy history or a
  // bad reading can never roll back the completion. A follow-up only the
  // compounding trigger (#522) could earn starts from there, once the stretch
  // this reading opened exists. One the session earned anyway starts now and
  // never waits on compounding: it rides along only on a stretch already open.
  // The cron's stranded reconciliation never fires the trigger.
  const mayCompound = !opts.stranded && session.kept !== false;
  await ctx.scheduler.runAfter(0, internal.compounding.stretches.evaluate, {
    profileId: session.emotionalProfileId,
    sessionId: session._id,
    ...(mayCompound && !requiresFollowUp && !session.followUpWorkflowId
      ? { startFollowUp: true }
      : {}),
  });

  // Schedule post-session jobs.
  await ctx.scheduler.runAfter(
    0,
    internal.jobs.profileStats.updateAfterSession,
    {
      emotionalProfileId: session.emotionalProfileId,
      sessionId: session._id,
    },
  );
  // Reflection Agent (Cognition Layer Phase 3): light pass + consolidation
  // gate. Off the critical path, best-effort, completion-only.
  await ctx.scheduler.runAfter(
    0,
    internal.ai.reflectionAgent.trigger.onSessionComplete,
    {
      emotionalProfileId: session.emotionalProfileId,
      sessionId: session._id,
    },
  );
  // Kindling (docs/paths-v1.md §2.1): genuine completion, any path — solo,
  // peers, or exit — not the abandoned-session cron's stranded reconciliation
  // (pathCompleted: false, no pathChosen). Premium gate lives inside
  // `generate.run`; off the critical path.
  const pathChosen = opts.pathChosen ?? session.pathChosen;
  if (opts.pathCompleted && pathChosen) {
    await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
      sessionId: session._id,
      emotionalProfileId: session.emotionalProfileId,
    });
  }

  // Finalize follow-up gate + maybe start the check-in workflow.
  await finalizeFollowUp(ctx, session, requiresFollowUp);
}

/**
 * Patch optional post-session enrichment (mood + peer-pool contribution) onto
 * a session. Shared by `recordPostSessionFeedback` and the legacy inline-args
 * path on `completePath`. `session` must be the pre-patch doc so the fresh
 * opt-in guard sees the prior contribution state.
 */
async function applyPostSessionFeedback(
  ctx: MutationCtx,
  session: Doc<"sessions">,
  feedback: {
    contributedReflection?: boolean;
    postSessionMood?: Doc<"sessions">["postSessionMood"];
  },
  /** Completion already scheduled an evaluation that will read this mood. */
  evaluating = false,
): Promise<void> {
  await ctx.db.patch("sessions", session._id, {
    ...(feedback.contributedReflection !== undefined
      ? { contributedReflection: feedback.contributedReflection }
      : {}),
    ...(feedback.postSessionMood
      ? { postSessionMood: feedback.postSessionMood }
      : {}),
    updatedAt: Date.now(),
  });

  // A mood check is a reading: it can close a stretch, never open one (#519).
  // Its own transaction, so it can't fail the save (#529).
  if (feedback.postSessionMood && !evaluating) {
    await ctx.scheduler.runAfter(0, internal.compounding.stretches.evaluate, {
      profileId: session.emotionalProfileId,
    });
  }

  // Schedule the anonymizer only on a fresh opt-in, so repeated feedback
  // writes (or a re-tap) never double-contribute to the peer pool.
  if (
    feedback.contributedReflection &&
    session.contributedReflection !== true
  ) {
    await ctx.scheduler.runAfter(
      0,
      internal.jobs.reflectionAnonymizer.anonymize,
      {
        sessionId: session._id,
      },
    );
  }
}

// --- Public Mutations ---

/**
 * Create a new session in "initiated" state.
 * Rate limited to 2 sessions per hour per profile (10/hour on Plus).
 */
export const initiate = mutation({
  args: {
    entryType: entryTypeValidator,
    sessionMode: v.optional(v.union(v.literal("day"), v.literal("night"))),
    fromEntryId: v.optional(v.id("library_entries")), // "Reflect on this" (#413)
  },
  returns: v.id("sessions"),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const now = Date.now();

    // Rate limit: 2 sessions/hour per profile (token bucket, burst 2),
    // 10/hour for Plus.
    const premium = await hasPremium(ctx, profile);
    await rateLimiter.limit(ctx, "sessionInitiate", {
      key: profile._id,
      throws: true,
      ...(premium ? { config: SESSION_INITIATE_LIMITS_PLUS } : {}),
    });

    // Only link a live entry; a stale or retired one is dropped, not an error.
    const fromEntry = args.fromEntryId
      ? await ctx.db.get("library_entries", args.fromEntryId)
      : null;

    const sessionId = await ctx.db.insert("sessions", {
      emotionalProfileId: profile._id,
      state: "initiated",
      entryType: args.entryType,
      kept: true,
      ...(args.sessionMode ? { sessionMode: args.sessionMode } : {}),
      ...(fromEntry?.active ? { fromEntryId: fromEntry._id } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return sessionId;
  },
});

/**
 * Submit user input. Transitions initiated → processing and schedules AI.
 */
export const submitInput = mutation({
  args: {
    sessionId: v.id("sessions"),
    rawInput: v.string(),
    // DEPRECATED(remove-after: app >= next shipped build): the server no longer
    // trusts these. `rawText` must equal `rawInput` (a tampered client could
    // send different text than it stored), and `rawInputLength` is derivable —
    // both are now derived from `rawInput` server-side. Optional so a future
    // client can stop sending them; their values are ignored.
    /** @deprecated derived from rawInput server-side; value ignored */
    rawText: v.optional(v.string()),
    /** @deprecated derived from rawInput server-side; value ignored */
    rawInputLength: v.optional(v.number()),
    inputDuration: v.optional(v.number()),
    freezeOccurred: v.boolean(),
    freezeDuration: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "initiated") {
      throw new Error(`Cannot submit input in state "${session.state}"`);
    }

    if (args.rawInput.length > MAX_RAW_INPUT) {
      throw new ConvexError({
        code: "input_too_long",
        max: MAX_RAW_INPUT,
      });
    }

    // Single source of truth: the AI processes exactly what we store, and the
    // stored length matches the stored text. Client-sent rawText/rawInputLength
    // are ignored (see deprecation note above).
    const rawText = args.rawInput;
    const now = new Date();

    await ctx.db.patch("sessions", args.sessionId, {
      state: "processing",
      rawInput: rawText,
      rawInputLength: rawText.length,
      inputDuration: args.inputDuration,
      freezeOccurred: args.freezeOccurred,
      freezeDuration: args.freezeDuration,
      timeOfDay: getTimeOfDay(now),
      dayOfWeek: getDayOfWeek(now),
      updatedAt: now.getTime(),
    });

    // Schedule AI processing
    await ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, {
      sessionId: args.sessionId,
      rawText,
    });

    return null;
  },
});

/**
 * User confirms the mirror. → confirmed
 */
export const confirmMirror = mutation({
  args: {
    sessionId: v.id("sessions"),
    confirmationState: confirmationStateValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "mirror_delivered") {
      throw new Error(`Cannot confirm mirror in state "${session.state}"`);
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "confirmed",
      confirmationState: args.confirmationState,
      updatedAt: Date.now(),
    });

    // Phase 4, Loop #3 — memory relevance feedback. This is the single
    // terminal confirmation write (the state guard above makes it fire once),
    // so it's the clean place to reward/penalize the episodic memories that
    // informed this mirror. Off the hot path via the scheduler; the tap
    // returns immediately and the re-embed happens in the background.
    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();
    const matchedKeys = metadata?.episodicMatchKeys ?? [];
    if (matchedKeys.length > 0) {
      // The demotion's subject is "a reach went out and memory did not carry
      // it" (doc §8), not a terminal UI state. A capped session now records
      // `refined` — a no-op for importance — so keying off `confirmationState`
      // would silently stop the demotion on exactly the sessions where memory
      // demonstrably failed to connect.
      //
      // BOTH halves are required. `gapNamed` is raise-only while
      // `episodicMatchKeys` is replaced every refinement turn, so a session
      // that reached on turn 1 and then connected on turn 2 would otherwise
      // decay the very memories that informed the mirror the user confirmed.
      const memoryConnected =
        metadata?.episodicTopScore !== undefined &&
        metadata.episodicTopScore >= EPISODIC_CONNECT_FLOOR;
      const feedback =
        session.gapNamed === true && !memoryConnected
          ? "gave_up"
          : args.confirmationState;
      await ctx.scheduler.runAfter(
        0,
        internal.episodicMemory.applyMemoryFeedback,
        { matchedKeys, feedback },
      );
    }

    return null;
  },
});

/**
 * User selects a path (solo/peers/exit). → path_selected
 */
export const selectPath = mutation({
  args: {
    sessionId: v.id("sessions"),
    pathChosen: pathChosenValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile, session } = await requireSessionOwnership(
      ctx,
      args.sessionId,
    );

    if (session.state !== "confirmed") {
      throw new Error(`Cannot select path in state "${session.state}"`);
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "path_selected",
      pathChosen: args.pathChosen,
      updatedAt: Date.now(),
    });

    // Xolace+: precompute semantic peer matches while the user transitions to
    // the peers screen. matchForSession is reactive, so it upgrades from the
    // tag cascade to these results live once the embed action lands.
    if (args.pathChosen === "peers" && (await hasPremium(ctx, profile))) {
      await ctx.scheduler.runAfter(
        0,
        internal.reflectionsRag.computeSemanticMatches,
        { sessionId: args.sessionId },
      );
    }

    return null;
  },
});

/**
 * Start a path (e.g. begin exercise). → path_in_progress
 */
export const startPath = mutation({
  args: {
    sessionId: v.id("sessions"),
    exerciseId: v.optional(v.id("exercises")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "path_selected") {
      throw new Error(`Cannot start path in state "${session.state}"`);
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "path_in_progress",
      exerciseId: args.exerciseId,
      updatedAt: Date.now(),
    });

    return null;
  },
});

/**
 * Complete an activity path (solo/peers). → completed.
 *
 * Called from the activity screen the moment the exercise/peer view is done,
 * BEFORE navigating to session-end — so completion is durable even if the user
 * closes the app on the session-end screen. Post-session mood + contribution
 * are recorded afterwards via `recordPostSessionFeedback`.
 */
export const completePath = mutation({
  args: {
    sessionId: v.id("sessions"),
    pathCompleted: v.boolean(),
    // Deprecated — 1.6.x clients send post-session feedback inline; newer
    // clients use `recordPostSessionFeedback`. Remove once old app versions
    // age out of the store.
    contributedReflection: v.optional(v.boolean()),
    postSessionMood: v.optional(postSessionMoodValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const hasLegacyFeedback =
      args.contributedReflection !== undefined ||
      args.postSessionMood !== undefined;
    const legacyFeedback = {
      contributedReflection: args.contributedReflection,
      postSessionMood: args.postSessionMood,
    };

    // Idempotent for already-completed sessions: the abandoned-session cron
    // reconciles stranded path_selected / path_in_progress sessions to
    // completed, and a 1.6.x client still sitting on session-end then retries
    // completePath — that retry must not dead-end. Still honor its feedback.
    if (session.state === "completed") {
      if (hasLegacyFeedback) {
        await applyPostSessionFeedback(ctx, session, legacyFeedback);
      }
      return null;
    }

    if (
      session.state !== "path_in_progress" &&
      session.state !== "path_selected" &&
      session.state !== "confirmed"
    ) {
      throw new Error(`Cannot complete path in state "${session.state}"`);
    }

    // A confirmed session was never path-selected, so the path was not completed.
    const pathCompleted =
      session.state === "confirmed" ? false : args.pathCompleted;

    await finalizeCompletion(ctx, session, { pathCompleted });

    if (hasLegacyFeedback) {
      await applyPostSessionFeedback(ctx, session, legacyFeedback, true);
    }

    return null;
  },
});

/**
 * Record optional post-session enrichment (mood + peer-pool contribution) onto
 * an already-completed session. Idempotent; safe to skip entirely (which is
 * exactly what happens when the user closes the app on the session-end screen).
 */
export const recordPostSessionFeedback = mutation({
  args: {
    sessionId: v.id("sessions"),
    contributedReflection: v.optional(v.boolean()),
    postSessionMood: v.optional(postSessionMoodValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "completed") {
      throw new Error(
        `Cannot record post-session feedback in state "${session.state}"`,
      );
    }

    await applyPostSessionFeedback(ctx, session, {
      contributedReflection: args.contributedReflection,
      postSessionMood: args.postSessionMood,
    });

    return null;
  },
});

/**
 * Direct complete for the "exit" path, straight from `confirmed`. → completed.
 *
 * The exit path has no activity, so selection and completion collapse into one
 * terminal transition at the Exit tap. The session-end "Heard." screen then
 * renders off an already-completed session (fetched by id), never leaving it
 * dangling at `path_selected`.
 */
export const completeSession = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "confirmed") {
      throw new Error(`Cannot complete session in state "${session.state}"`);
    }

    await finalizeCompletion(ctx, session, {
      pathCompleted: true,
      pathChosen: "exit",
    });

    return null;
  },
});

/**
 * Retry a failed session. → processing, re-schedule AI.
 */
export const retrySession = mutation({
  args: {
    sessionId: v.id("sessions"),
    // DEPRECATED(remove-after: app >= next shipped build): retry now reprocesses
    // the text already stored on the session (session.rawInput), not a client
    // arg — a retry should re-run what the user actually submitted, and a
    // tampered client shouldn't be able to swap in different text on retry.
    // Optional so a future client can stop sending it; value ignored.
    /** @deprecated retry reprocesses session.rawInput; value ignored */
    rawText: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (session.state !== "error") {
      throw new Error(`Cannot retry session in state "${session.state}"`);
    }

    const rawText = session.rawInput;
    if (!rawText) {
      throw new Error("Cannot retry a session with no stored input");
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "processing",
      errorMessage: undefined,
      updatedAt: Date.now(),
    });

    // Re-schedule AI processing with the stored input (client arg ignored).
    await ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, {
      sessionId: args.sessionId,
      rawText,
    });

    return null;
  },
});

/**
 * Abandon a session (user left).
 */
export const abandon = mutation({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    if (TERMINAL_STATES.has(session.state)) {
      throw new Error(
        `Cannot abandon session in terminal state "${session.state}"`,
      );
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "abandoned",
      updatedAt: Date.now(),
    });

    // Abandon only earns a follow-up when escalation fired at the mirror
    // (escalation-then-abandon). A plain abandon never starts one — even if the
    // AI flag was set at mirror delivery. This is the IRON rule (T13).
    await finalizeFollowUp(ctx, session, abandonRequiresFollowUp(session));

    return null;
  },
});

// --- Public Queries ---

/**
 * Find a resumable (non-terminal) session for the current profile.
 */
export const getActive = query({
  args: {},
  returns: v.union(sessionDocValidator, v.null()),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);

    // Query each non-terminal state via the by_profile_state index.
    // 8 bounded index lookups (each returns at most 1 doc), then pick
    // the most recent. O(1) per state regardless of total sessions.
    const nonTerminalStates = [
      "initiated",
      "input_received",
      "processing",
      "mirror_delivered",
      "confirmed",
      "path_selected",
      "path_in_progress",
      "error",
    ] as const;

    let latest = null;
    for (const state of nonTerminalStates) {
      const session = await ctx.db
        .query("sessions")
        .withIndex("by_profile_state", (q) =>
          q.eq("emotionalProfileId", profile._id).eq("state", state),
        )
        .order("desc")
        .first();

      if (
        session &&
        (!latest || session._creationTime > latest._creationTime)
      ) {
        latest = session;
      }
    }

    return latest;
  },
});

/**
 * Get a single session by ID (with ownership check).
 *
 * `claimStrength` is derived here rather than read: it is never persisted
 * (docs/confidence-aware-mirroring.md §6). The mirror action row needs it to
 * decide whether "Say more" carries the "Recommended" pill.
 */
export const getById = query({
  args: {
    sessionId: v.id("sessions"),
  },
  returns: v.object({
    ...sessionDocValidator.fields,
    claimStrength: v.union(
      v.literal("reaching"),
      v.literal("holding"),
      v.literal("measured"),
      v.literal("confident"),
      v.null(),
    ),
  }),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);
    return { ...session, claimStrength: await deriveClaimStrength(ctx, session) };
  },
});

/**
 * Paginated timeline of sessions for the current profile.
 * Client uses usePaginatedQuery from convex/react.
 */
export const listByProfile = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(sessionDocValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);

    return await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", profile._id),
      )
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Free tier sees a rolling window of timeline history; Plus sees everything.
// Surfaced to the client via getTimelineWindowInfo (windowDays) so the nudge
// copy always tracks this number — tuning the window is a server-only change,
// no app resubmit.
//
// Held at 30 until the Xolace+ build is live in the store. The shipped app has
// no upgrade banner and no paywall, and hasPremium() is false for everyone
// while subs are unreleased — so a tighter window there would silently vanish
// sessions with no explanation and no way to unlock them. Drop to 7 the day
// the subs build goes live.
const FREE_TIMELINE_WINDOW_DAYS = 30;
const FREE_TIMELINE_WINDOW_MS = FREE_TIMELINE_WINDOW_DAYS * 24 * 60 * 60 * 1000;

// Bucketed to the start of the UTC day so the cutoff stays constant across a
// single pagination session — usePaginatedQuery requires paginated queries to
// be a deterministic function of their args (excluding paginationOpts); a raw
// Date.now() here would drift between the first page and later loadMore calls
// and invalidate the cursor ("InvalidCursor: ... from a different query").
function getFreeTimelineWindowStart(): number {
  const cutoff = new Date(Date.now() - FREE_TIMELINE_WINDOW_MS);
  return Date.UTC(
    cutoff.getUTCFullYear(),
    cutoff.getUTCMonth(),
    cutoff.getUTCDate(),
  );
}

/**
 * Paginated timeline entries enriched with emotional metadata.
 * Only returns sessions that have a mirror (meaningful to display).
 */
export const listForTimeline = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  returns: v.object({
    page: v.array(
      v.object({
        _id: v.id("sessions"),
        mirrorText: v.string(),
        entryType: entryTypeValidator,
        hasMirrorAudio: v.boolean(),
        confirmationState: v.union(confirmationStateValidator, v.null()),
        pathChosen: v.union(pathChosenValidator, v.null()),
        toneUsed: v.union(mirrorToneValidator, v.null()),
        primaryEmotion: v.union(v.string(), v.null()),
        granularLabel: v.union(v.string(), v.null()),
        createdAt: v.number(),
      }),
    ),
    isDone: v.boolean(),
    continueCursor: v.string(),
    splitCursor: v.optional(v.union(v.string(), v.null())),
    pageStatus: v.optional(
      v.union(v.literal("SplitRecommended"), v.literal("SplitRequired"), v.null()),
    ),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const isPremium = await hasPremium(ctx, profile);
    const windowStart = isPremium ? null : getFreeTimelineWindowStart();

    const result = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        windowStart === null
          ? q.eq("emotionalProfileId", profile._id)
          : q
              .eq("emotionalProfileId", profile._id)
              .gte("createdAt", windowStart),
      )
      .order("desc")
      .paginate(args.paginationOpts);

    const enrichedPage = await Promise.all(
      result.page
        .filter((s) => s.mirrorText != null)
        .map(async (session) => {
          const metadata = await ctx.db
            .query("emotional_metadata")
            .withIndex("by_session", (q) => q.eq("sessionId", session._id))
            .unique();

          return {
            _id: session._id,
            mirrorText: session.mirrorText!,
            entryType: session.entryType,
            hasMirrorAudio: session.mirrorAudioStorageId != null,
            confirmationState: session.confirmationState ?? null,
            pathChosen: session.pathChosen ?? null,
            toneUsed: session.toneUsed ?? null,
            primaryEmotion: metadata?.primaryEmotion ?? null,
            granularLabel: metadata?.granularLabel ?? null,
            createdAt: session.createdAt,
          };
        }),
    );

    return {
      page: enrichedPage,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
      splitCursor: result.splitCursor,
      pageStatus: result.pageStatus,
    };
  },
});

/**
 * Whether the free-tier timeline window is hiding older sessions — drives the
 * "upgrade for full history" nudge. Plus users never have anything hidden.
 *
 * Returns windowDays so the nudge renders the window length from server truth;
 * the client must never hardcode it, or the copy drifts the moment the window
 * is retuned.
 */
export const getTimelineWindowInfo = query({
  args: {},
  returns: v.object({
    premiumRequired: v.boolean(),
    hasOlderSessions: v.boolean(),
    windowDays: v.union(v.number(), v.null()),
  }),
  handler: async (ctx) => {
    const { profile } = await requireAuth(ctx);
    const isPremium = await hasPremium(ctx, profile);
    if (isPremium) {
      return {
        premiumRequired: false,
        hasOlderSessions: false,
        windowDays: null,
      };
    }

    const windowStart = getFreeTimelineWindowStart();
    const older = await ctx.db
      .query("sessions")
      .withIndex("by_profile_time", (q) =>
        q.eq("emotionalProfileId", profile._id).lt("createdAt", windowStart),
      )
      .first();

    return {
      premiumRequired: true,
      hasOlderSessions: older !== null,
      windowDays: FREE_TIMELINE_WINDOW_DAYS,
    };
  },
});

/**
 * Combined session + emotional metadata for the details screen.
 * Single subscription, single auth check.
 */
export const getSessionDetails = query({
  args: { sessionId: v.id("sessions") },
  returns: v.object({
    ...sessionDocValidator.fields,
    primaryEmotion: v.union(v.string(), v.null()),
    granularLabel: v.union(v.string(), v.null()),
    intensity: v.union(v.number(), v.null()),
    thematicTags: v.union(v.array(v.string()), v.null()),
  }),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);

    const metadata = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
      .unique();

    return {
      ...session,
      primaryEmotion: metadata?.primaryEmotion ?? null,
      granularLabel: metadata?.granularLabel ?? null,
      intensity: metadata?.intensity ?? null,
      thematicTags: metadata?.thematicTags ?? null,
    };
  },
});

// --- Internal Mutations ---

/**
 * AI delivers the mirror text. processing → mirror_delivered
 */
export const deliverMirror = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    mirrorText: v.string(),
    mirrorModelVersion: v.string(),
    toneUsed: mirrorToneValidator,
    safeguardLevel: v.optional(
      v.union(
        v.literal("none"),
        v.literal("gentle"),
        v.literal("elevated"),
        v.literal("crisis"),
      ),
    ),
    escalationTriggered: v.optional(v.boolean()),
    escalationResources: v.optional(v.array(resourceValidator)),
    // Preliminary follow-up flag (AI + escalation). Finalized at completion.
    requiresFollowUp: v.optional(v.boolean()),
    // A reach went out on this mirror. Raise-only: a later holding turn must
    // not unset it, since it is what makes the session hold rather than reach.
    gapNamed: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.state !== "processing") {
      // Session may have been abandoned while AI was working
      return;
    }

    await ctx.db.patch("sessions", args.sessionId, {
      state: "mirror_delivered",
      mirrorText: args.mirrorText,
      mirrorModelVersion: args.mirrorModelVersion,
      toneUsed: args.toneUsed,
      ...(args.safeguardLevel ? { safeguardLevel: args.safeguardLevel } : {}),
      ...(args.escalationTriggered ? { escalationTriggered: true } : {}),
      ...(args.escalationResources
        ? { escalationResources: args.escalationResources }
        : {}),
      ...(args.requiresFollowUp ? { requiresFollowUp: true } : {}),
      ...(args.gapNamed ? { gapNamed: true } : {}),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Internal read for TTS idempotency check — returns only the audio storage ID field.
 */
export const getMirrorAudioStorageId = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    return session?.mirrorAudioStorageId ?? null;
  },
});

/**
 * TTS action stores the generated audio storage ID on the session.
 */
export const storeMirrorAudio = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;
    await ctx.db.patch("sessions", args.sessionId, {
      mirrorAudioStorageId: args.storageId,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Clears the mirror audio storage ID from the session (called before regenerating TTS on clarification).
 */
export const clearMirrorAudio = internalMutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;
    await ctx.db.patch("sessions", args.sessionId, {
      mirrorAudioStorageId: undefined,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Returns a signed URL for the session's mirror audio, or null if not yet ready.
 */
export const getMirrorAudioUrl = query({
  args: { sessionId: v.id("sessions") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const { session } = await requireSessionOwnership(ctx, args.sessionId);
    if (!session.mirrorAudioStorageId) return null;
    return ctx.storage.getUrl(session.mirrorAudioStorageId);
  },
});

/**
 * AI processing failed. processing → error
 */
export const failSession = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;

    if (session.state !== "processing") return;

    await ctx.db.patch("sessions", args.sessionId, {
      state: "error",
      errorMessage: args.errorMessage,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Write filled slot values onto a session.
 * Called from the slot-fill action after Haiku resolves user_phrase.
 */
export const writeExerciseSlots = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    slots: v.record(v.string(), v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;
    const existing = session.exerciseSlots ?? {};
    await ctx.db.patch("sessions", args.sessionId, {
      exerciseSlots: { ...existing, ...args.slots },
    });
  },
});

/**
 * Store the AI-distilled reflection text on a session.
 * Called speculatively after mirror delivery — the distillation
 * runs in the background so it's ready by contribution time.
 */
export const storeDistilledText = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    distilledText: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    if (!session) return;

    // Only store if session hasn't been abandoned/completed already
    if (session.state === "completed" || session.state === "abandoned") return;

    await ctx.db.patch("sessions", args.sessionId, {
      distilledText: args.distilledText,
      updatedAt: Date.now(),
    });
  },
});

/**
 * Read the `kept` flag for a session.
 * Used by the distiller action (Node.js runtime) which cannot call ctx.db directly.
 */
export const getSessionKept = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get("sessions", args.sessionId);
    return session?.kept ?? null;
  },
});

/**
 * Mark stale non-terminal sessions as abandoned.
 * Called by cron every 15 minutes.
 */
export const checkAbandoned = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - ABANDON_THRESHOLD_MS;

    const staleStates = [
      "initiated",
      "input_received",
      "processing",
      "mirror_delivered",
      "confirmed",
      "error",
    ] as const;

    // path_selected / path_in_progress are now transient — a session only
    // reaches them for the moment between the path tap and completion (which
    // fires before navigating to session-end). A session stranded here means
    // the app died mid-navigation; the mirror was already confirmed, so
    // reconcile to completed (path not finished) rather than abandoned, and
    // never leave it resumable via getActive.
    const stalePathStates = ["path_selected", "path_in_progress"] as const;

    for (const state of [...staleStates, ...stalePathStates]) {
      const staleSessions = await ctx.db
        .query("sessions")
        .withIndex("by_state_and_updatedAt", (q) =>
          q.eq("state", state).lt("updatedAt", cutoff)
        )
        .take(50);

      for (const session of staleSessions) {
        if ((stalePathStates as readonly string[]).includes(state)) {
          await finalizeCompletion(ctx, session, { pathCompleted: false, stranded: true });
        } else {
          await ctx.db.patch("sessions", session._id, {
            state: "abandoned",
            updatedAt: Date.now(),
          });
          // Same gate as the manual abandon path: escalation-then-abandon only.
          await finalizeFollowUp(ctx, session, abandonRequiresFollowUp(session));
        }
      }
    }
  },
});
