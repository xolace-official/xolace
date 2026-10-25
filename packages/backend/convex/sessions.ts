import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { EPISODIC_CONNECT_FLOOR } from "./ai/routing";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { deriveClaimStrength } from "./lib/claimStrength";
import {
	abandonRequiresFollowUp,
	computeRequiresFollowUp,
} from "./lib/followUpCadence";
import { hasPremium } from "./lib/premium";
import { rateLimiter, SESSION_INITIATE_LIMITS_PLUS } from "./lib/rateLimits";
import { purgeSessions } from "./lib/sessionCascade";
import { getDayOfWeek, getTimeOfDay } from "./lib/timeOfDay";
import {
	confirmationStateValidator,
	entryTypeValidator,
	mirrorToneValidator,
	pathChosenValidator,
	postSessionMoodValidator,
	resourceValidator,
} from "./lib/validators";
import schema from "./schema";
import { recordActivity } from "./streaks/activityLog";
import { finalizeTalk } from "./talk/session";

const ABANDON_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
// A cut-off talk's mirror is made while the person is away (#588): it waits
// for their return this long, not the typed 30 minutes.
const TALK_MIRROR_WAIT_MS = 24 * 60 * 60 * 1000;

// Hard ceiling on a single reflection's text. The client's TextArea enforces
// the same limit via maxLength, so a normal user never reaches this — the
// server throw only fires against a tampered client. A generous bound (~800
// words); the mirror rate limit is the real cost containment, this is cheap
// insurance on token spend. Keep in sync with MAX_RAW_INPUT in typing-state.tsx.
const MAX_RAW_INPUT = 5000;

// Terminal states — sessions in these states cannot be transitioned further.
const TERMINAL_STATES = new Set(["completed", "abandoned"]);

// Full `sessions` document shape, derived from schema.ts so a new column
// can't silently break every query that returns a raw session doc.
const sessionDocValidator = v.object({
	...schema.tables.sessions.validator.fields,
	_creationTime: v.number(),
	_id: v.id("sessions"),
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
	requiresFollowUp: boolean
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
	}
): Promise<void> {
	const now = Date.now();

	await ctx.db.patch("sessions", session._id, {
		pathCompleted: opts.pathCompleted,
		state: "completed",
		...(opts.pathChosen ? { pathChosen: opts.pathChosen } : {}),
		completedAt: now,
		sessionDuration: now - session.createdAt,
		updatedAt: now,
	});

	// One reflect per completion, whichever route (exit, solo, peers, or the
	// cron's stranded reconciliation) — same transaction, so the streak moves
	// with the session.
	await recordActivity(ctx, {
		actionType: "reflect",
		emotionalProfileId: session.emotionalProfileId,
		timestamp: now,
	});

	const requiresFollowUp = computeRequiresFollowUp({
		confirmationState: session.confirmationState,
		escalationTriggered: session.escalationTriggered,
		storedFlag: session.requiresFollowUp,
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
		}
	);
	// Reflection Agent (Cognition Layer Phase 3): light pass + consolidation
	// gate. Off the critical path, best-effort, completion-only.
	await ctx.scheduler.runAfter(
		0,
		internal.ai.reflectionAgent.trigger.onSessionComplete,
		{
			emotionalProfileId: session.emotionalProfileId,
			sessionId: session._id,
		}
	);
	// Kindling (docs/paths-v1.md §2.1): genuine completion, any path — solo,
	// peers, or exit — not the abandoned-session cron's stranded reconciliation
	// (pathCompleted: false, no pathChosen). Premium gate lives inside
	// `generate.run`; off the critical path.
	const pathChosen = opts.pathChosen ?? session.pathChosen;
	if (opts.pathCompleted && pathChosen) {
		await ctx.scheduler.runAfter(0, internal.ai.paths.generate.run, {
			emotionalProfileId: session.emotionalProfileId,
			sessionId: session._id,
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
	evaluating = false
): Promise<void> {
	await ctx.db.patch("sessions", session._id, {
		...(feedback.contributedReflection === undefined
			? {}
			: { contributedReflection: feedback.contributedReflection }),
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
			}
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
		fromEntryId: v.optional(v.id("library_entries")), // "Reflect on this" (#413)
		sessionMode: v.optional(v.union(v.literal("day"), v.literal("night"))),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();
		// A talk's session is created by talk.live.start, bound to its talk.
		if (args.entryType === "talk") {
			throw new ConvexError({ code: "not_a_talk" });
		}

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
			entryType: args.entryType,
			kept: true,
			state: "initiated",
			...(args.sessionMode ? { sessionMode: args.sessionMode } : {}),
			...(fromEntry?.active ? { fromEntryId: fromEntry._id } : {}),
			createdAt: now,
			updatedAt: now,
		});

		return sessionId;
	},
	returns: v.id("sessions"),
});

/**
 * Submit user input. Transitions initiated → processing and schedules AI.
 */
export const submitInput = mutation({
	args: {
		freezeDuration: v.optional(v.number()),
		freezeOccurred: v.boolean(),
		inputDuration: v.optional(v.number()),
		rawInput: v.string(),
		/** @deprecated derived from rawInput server-side; value ignored */
		rawInputLength: v.optional(v.number()),
		// DEPRECATED(remove-after: app >= next shipped build): the server no longer
		// trusts these. `rawText` must equal `rawInput` (a tampered client could
		// send different text than it stored), and `rawInputLength` is derivable —
		// both are now derived from `rawInput` server-side. Optional so a future
		// client can stop sending them; their values are ignored.
		/** @deprecated derived from rawInput server-side; value ignored */
		rawText: v.optional(v.string()),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "initiated") {
			throw new Error(`Cannot submit input in state "${session.state}"`);
		}
		// A talk's input is its transcript, set when the talk closes.
		if (session.entryType === "talk") {
			throw new ConvexError({ code: "not_a_talk" });
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
			dayOfWeek: getDayOfWeek(now),
			freezeDuration: args.freezeDuration,
			freezeOccurred: args.freezeOccurred,
			inputDuration: args.inputDuration,
			processingStage: undefined,
			rawInput: rawText,
			rawInputLength: rawText.length,
			state: "processing",
			timeOfDay: getTimeOfDay(now),
			updatedAt: now.getTime(),
		});

		// Schedule AI processing
		await ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, {
			rawText,
			sessionId: args.sessionId,
		});

		return null;
	},
	returns: v.null(),
});

/**
 * User confirms the mirror. → confirmed
 */
export const confirmMirror = mutation({
	args: {
		confirmationState: confirmationStateValidator,
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "mirror_delivered") {
			throw new Error(`Cannot confirm mirror in state "${session.state}"`);
		}

		await ctx.db.patch("sessions", args.sessionId, {
			confirmationState: args.confirmationState,
			state: "confirmed",
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
				{ feedback, matchedKeys }
			);
		}

		return null;
	},
	returns: v.null(),
});

/**
 * User selects a path (solo/peers/exit). → path_selected
 */
export const selectPath = mutation({
	args: {
		pathChosen: pathChosenValidator,
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { profile, session } = await requireSessionOwnership(
			ctx,
			args.sessionId
		);

		if (session.state !== "confirmed") {
			throw new Error(`Cannot select path in state "${session.state}"`);
		}

		await ctx.db.patch("sessions", args.sessionId, {
			pathChosen: args.pathChosen,
			state: "path_selected",
			updatedAt: Date.now(),
		});

		// Xolace+: precompute semantic peer matches while the user transitions to
		// the peers screen. matchForSession is reactive, so it upgrades from the
		// tag cascade to these results live once the embed action lands.
		if (args.pathChosen === "peers" && (await hasPremium(ctx, profile))) {
			await ctx.scheduler.runAfter(
				0,
				internal.reflectionsRag.computeSemanticMatches,
				{ sessionId: args.sessionId }
			);
		}

		return null;
	},
	returns: v.null(),
});

/**
 * Start a path (e.g. begin exercise). → path_in_progress
 */
export const startPath = mutation({
	args: {
		exerciseId: v.optional(v.id("exercises")),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "path_selected") {
			throw new Error(`Cannot start path in state "${session.state}"`);
		}

		await ctx.db.patch("sessions", args.sessionId, {
			exerciseId: args.exerciseId,
			state: "path_in_progress",
			updatedAt: Date.now(),
		});

		return null;
	},
	returns: v.null(),
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
		// Deprecated — 1.6.x clients send post-session feedback inline; newer
		// clients use `recordPostSessionFeedback`. Remove once old app versions
		// age out of the store.
		contributedReflection: v.optional(v.boolean()),
		pathCompleted: v.boolean(),
		postSessionMood: v.optional(postSessionMoodValidator),
		sessionId: v.id("sessions"),
	},
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
	returns: v.null(),
});

/**
 * Record optional post-session enrichment (mood + peer-pool contribution) onto
 * an already-completed session. Idempotent; safe to skip entirely (which is
 * exactly what happens when the user closes the app on the session-end screen).
 */
export const recordPostSessionFeedback = mutation({
	args: {
		contributedReflection: v.optional(v.boolean()),
		postSessionMood: v.optional(postSessionMoodValidator),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "completed") {
			throw new Error(
				`Cannot record post-session feedback in state "${session.state}"`
			);
		}

		await applyPostSessionFeedback(ctx, session, {
			contributedReflection: args.contributedReflection,
			postSessionMood: args.postSessionMood,
		});

		return null;
	},
	returns: v.null(),
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
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "confirmed") {
			throw new Error(`Cannot complete session in state "${session.state}"`);
		}

		await finalizeCompletion(ctx, session, {
			pathChosen: "exit",
			pathCompleted: true,
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Retry a failed session. → processing, re-schedule AI.
 */
export const retrySession = mutation({
	args: {
		// DEPRECATED(remove-after: app >= next shipped build): retry now reprocesses
		// the text already stored on the session (session.rawInput), not a client
		// arg — a retry should re-run what the user actually submitted, and a
		// tampered client shouldn't be able to swap in different text on retry.
		// Optional so a future client can stop sending it; value ignored.
		/** @deprecated retry reprocesses session.rawInput; value ignored */
		rawText: v.optional(v.string()),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (session.state !== "error") {
			throw new Error(`Cannot retry session in state "${session.state}"`);
		}

		if (!session.rawInput) {
			throw new Error("Cannot retry a session with no stored input");
		}

		// Re-schedule AI processing with the stored input (client arg ignored).
		await reprocess(ctx, args.sessionId, session.rawInput);

		return null;
	},
	returns: v.null(),
});

/** error → processing, and the mirror is made again from the stored input. */
async function reprocess(
	ctx: MutationCtx,
	sessionId: Id<"sessions">,
	rawText: string
) {
	await ctx.db.patch("sessions", sessionId, {
		errorMessage: undefined,
		processingStage: undefined,
		state: "processing",
		updatedAt: Date.now(),
	});
	await ctx.scheduler.runAfter(0, internal.ai.process.generateMirror, {
		rawText,
		sessionId,
	});
}

/** The server's retry of a "Just end" talk's failed mirror (see failSession). */
export const retryMirrorLater = internalMutation({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		const session = await ctx.db.get("sessions", sessionId);
		if (
			session?.talkMirrorLater &&
			session.state === "error" &&
			session.rawInput
		) {
			await reprocess(ctx, sessionId, session.rawInput);
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Abandon a session (user left).
 */
export const abandon = mutation({
	args: {
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		if (TERMINAL_STATES.has(session.state)) {
			throw new Error(
				`Cannot abandon session in terminal state "${session.state}"`
			);
		}

		// Backing out of a talk still mirrors what the person said (#588).
		if (session.entryType === "talk" && session.state === "initiated") {
			await finalizeTalk(ctx, session);
			return null;
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
	returns: v.null(),
});

// --- Public Queries ---

/**
 * Find a resumable (non-terminal) session for the current profile.
 */
export const getActive = query({
	args: {},
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
					q.eq("emotionalProfileId", profile._id).eq("state", state)
				)
				.order("desc")
				.first();

			// A talk ended with "Just end" makes its mirror for the timeline, not
			// home. A failed one is retried by the server (failSession).
			if (session?.talkMirrorLater) {
				continue;
			}
			if (
				session &&
				(!latest || session._creationTime > latest._creationTime)
			) {
				latest = session;
			}
		}

		return latest;
	},
	returns: v.union(sessionDocValidator, v.null()),
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
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);
		return {
			...session,
			claimStrength: await deriveClaimStrength(ctx, session),
		};
	},
	returns: v.object({
		...sessionDocValidator.fields,
		claimStrength: v.union(
			v.literal("reaching"),
			v.literal("holding"),
			v.literal("measured"),
			v.literal("confident"),
			v.null()
		),
	}),
});

/**
 * Paginated timeline of sessions for the current profile.
 * Client uses usePaginatedQuery from convex/react.
 */
export const listByProfile = query({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		return await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", profile._id)
			)
			.order("desc")
			.paginate(args.paginationOpts);
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		page: v.array(sessionDocValidator),
	}),
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
		cutoff.getUTCDate()
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
							.gte("createdAt", windowStart)
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
						confirmationState: session.confirmationState ?? null,
						createdAt: session.createdAt,
						entryType: session.entryType,
						granularLabel: metadata?.granularLabel ?? null,
						hasMirrorAudio: session.mirrorAudioStorageId != null,
						mirrorText: session.mirrorText!,
						pathChosen: session.pathChosen ?? null,
						primaryEmotion: metadata?.primaryEmotion ?? null,
						toneUsed: session.toneUsed ?? null,
					};
				})
		);

		return {
			continueCursor: result.continueCursor,
			isDone: result.isDone,
			page: enrichedPage,
			pageStatus: result.pageStatus,
			splitCursor: result.splitCursor,
		};
	},
	returns: v.object({
		continueCursor: v.string(),
		isDone: v.boolean(),
		page: v.array(
			v.object({
				_id: v.id("sessions"),
				confirmationState: v.union(confirmationStateValidator, v.null()),
				createdAt: v.number(),
				entryType: entryTypeValidator,
				granularLabel: v.union(v.string(), v.null()),
				hasMirrorAudio: v.boolean(),
				mirrorText: v.string(),
				pathChosen: v.union(pathChosenValidator, v.null()),
				primaryEmotion: v.union(v.string(), v.null()),
				toneUsed: v.union(mirrorToneValidator, v.null()),
			})
		),
		pageStatus: v.optional(
			v.union(
				v.literal("SplitRecommended"),
				v.literal("SplitRequired"),
				v.null()
			)
		),
		splitCursor: v.optional(v.union(v.string(), v.null())),
	}),
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
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const isPremium = await hasPremium(ctx, profile);
		if (isPremium) {
			return {
				hasOlderSessions: false,
				premiumRequired: false,
				windowDays: null,
			};
		}

		const windowStart = getFreeTimelineWindowStart();
		const older = await ctx.db
			.query("sessions")
			.withIndex("by_profile_time", (q) =>
				q.eq("emotionalProfileId", profile._id).lt("createdAt", windowStart)
			)
			.first();

		return {
			hasOlderSessions: older !== null,
			premiumRequired: true,
			windowDays: FREE_TIMELINE_WINDOW_DAYS,
		};
	},
	returns: v.object({
		hasOlderSessions: v.boolean(),
		premiumRequired: v.boolean(),
		windowDays: v.union(v.number(), v.null()),
	}),
});

/**
 * Combined session + emotional metadata for the details screen.
 * Single subscription, single auth check.
 */
export const getSessionDetails = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		const metadata = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		return {
			...session,
			granularLabel: metadata?.granularLabel ?? null,
			intensity: metadata?.intensity ?? null,
			primaryEmotion: metadata?.primaryEmotion ?? null,
			thematicTags: metadata?.thematicTags ?? null,
		};
	},
	returns: v.object({
		...sessionDocValidator.fields,
		granularLabel: v.union(v.string(), v.null()),
		intensity: v.union(v.number(), v.null()),
		primaryEmotion: v.union(v.string(), v.null()),
		thematicTags: v.union(v.array(v.string()), v.null()),
	}),
});

// --- Internal Mutations ---

/**
 * AI delivers the mirror text. processing → mirror_delivered
 */
export const deliverMirror = internalMutation({
	args: {
		escalationResources: v.optional(v.array(resourceValidator)),
		escalationTriggered: v.optional(v.boolean()),
		// A reach went out on this mirror. Raise-only: a later holding turn must
		// not unset it, since it is what makes the session hold rather than reach.
		gapNamed: v.optional(v.boolean()),
		mirrorModelVersion: v.string(),
		mirrorText: v.string(),
		// Preliminary follow-up flag (AI + escalation). Finalized at completion.
		requiresFollowUp: v.optional(v.boolean()),
		safeguardLevel: v.optional(
			v.union(
				v.literal("none"),
				v.literal("gentle"),
				v.literal("elevated"),
				v.literal("crisis")
			)
		),
		sessionId: v.id("sessions"),
		toneUsed: mirrorToneValidator,
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
			mirrorModelVersion: args.mirrorModelVersion,
			mirrorText: args.mirrorText,
			state: "mirror_delivered",
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
		// A "Just end" talk closes at the end of generateMirror, once its reading
		// is stored. An escalated one stays open now, so home shows its help even
		// if the rest of the pipeline fails.
		if (
			session.talkMirrorLater &&
			(args.escalationTriggered || session.escalationTriggered)
		) {
			await ctx.db.patch("sessions", args.sessionId, {
				talkMirrorLater: undefined,
			});
		}
	},
});

/**
 * A talk ended with "Just end" (talkMirrorLater) closes once its mirror is in:
 * completed like a reflection, so it's in the timeline and counts, without
 * a mirror screen. An escalated mirror stays open instead, for home to show
 * with its help. Waits for the session's reading (emotional_metadata): the
 * completion's jobs read it, and generateMirror stores it after delivery.
 */
async function closeIfMirrorLater(ctx: MutationCtx, sessionId: Id<"sessions">) {
	const session = await ctx.db.get("sessions", sessionId);
	if (!session?.talkMirrorLater || session.state !== "mirror_delivered") {
		return;
	}
	if (session.escalationTriggered) {
		await ctx.db.patch("sessions", sessionId, { talkMirrorLater: undefined });
		return;
	}
	const reading = await ctx.db
		.query("emotional_metadata")
		.withIndex("by_session", (q) => q.eq("sessionId", sessionId))
		.unique();
	if (!reading) {
		return;
	}
	await finalizeCompletion(ctx, session, { pathCompleted: false });
}

/**
 * Closes a "Just end" talk: called at the end of generateMirror, and by
 * talk.session.end for a mirror that was already delivered.
 */
export const closeMirrorLater = internalMutation({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, { sessionId }) => {
		await closeIfMirrorLater(ctx, sessionId);
		return null;
	},
	returns: v.null(),
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
		if (!session) {
			return;
		}
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
		if (!session) {
			return;
		}
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
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);
		if (!session.mirrorAudioStorageId) {
			return null;
		}
		return ctx.storage.getUrl(session.mirrorAudioStorageId);
	},
	returns: v.union(v.string(), v.null()),
});

/**
 * AI processing failed. processing → error
 */
export const failSession = internalMutation({
	args: {
		errorMessage: v.string(),
		/** The safeguard refused the input: a retry can only fail again. */
		rejected: v.optional(v.boolean()),
		/** The rate limit's wait, for a "Just end" talk's retry. */
		retryAfterMs: v.optional(v.number()),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			return;
		}

		if (session.state !== "processing") {
			return;
		}

		await ctx.db.patch("sessions", args.sessionId, {
			errorMessage: args.errorMessage,
			state: "error",
			updatedAt: Date.now(),
		});
		if (session.talkMirrorLater) {
			await retryOrDropMirrorLater(ctx, session, args);
		}
	},
});

const MIRROR_LATER_RETRIES = 3;
// Doubles each retry; every wait stays under ABANDON_THRESHOLD_MS, or the
// cron would abandon the session before its retry runs.
const MIRROR_LATER_RETRY_MS = 60 * 1000;
const MIRROR_LATER_MAX_WAIT_MS = 10 * 60 * 1000;

/**
 * A "Just end" talk's mirror failed. Nobody is on home to press Retry, so the
 * server retries it. One it can't make (refused, or out of retries) goes the
 * way of a talk nobody came back to: abandoned, with no error shown.
 */
async function retryOrDropMirrorLater(
	ctx: MutationCtx,
	session: Doc<"sessions">,
	opts: { rejected?: boolean; retryAfterMs?: number }
) {
	const retries = session.talkMirrorRetries ?? 0;
	if (opts.rejected || retries >= MIRROR_LATER_RETRIES) {
		await ctx.db.patch("sessions", session._id, {
			state: "abandoned",
			updatedAt: Date.now(),
		});
		await finalizeFollowUp(ctx, session, abandonRequiresFollowUp(session));
		return;
	}
	const wait = Math.min(
		opts.retryAfterMs ?? MIRROR_LATER_RETRY_MS * 2 ** retries,
		MIRROR_LATER_MAX_WAIT_MS
	);
	await ctx.db.patch("sessions", session._id, {
		talkMirrorRetries: retries + 1,
	});
	await ctx.scheduler.runAfter(wait, internal.sessions.retryMirrorLater, {
		sessionId: session._id,
	});
}

/**
 * Mark that articulation has started (drives the processing copy). No-op once
 * the session has left "processing", so a late call can't touch a delivered row.
 */
export const setProcessingStage = internalMutation({
	args: {
		sessionId: v.id("sessions"),
		stage: v.union(v.literal("writing"), v.literal("connecting")),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (session?.state !== "processing") {
			return null;
		}
		await ctx.db.patch("sessions", args.sessionId, {
			processingStage: args.stage,
		});
		return null;
	},
	returns: v.null(),
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
		if (!session) {
			return;
		}
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
		distilledText: v.string(),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			return;
		}

		// Only store if session hasn't been abandoned/completed already. A "Just
		// end" talk completes as its mirror lands, before this runs; episodic
		// memory still reads it.
		if (
			session.state === "abandoned" ||
			(session.state === "completed" && !session.talkMirrorLater)
		) {
			return;
		}

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
				// A talk that never closed (its idle check failed): close it the
				// talk way, mirror or not.
				if (session.entryType === "talk" && state === "initiated") {
					await finalizeTalk(ctx, session);
					continue;
				}
				// ponytail: skipped rows stay in this take(50) window for up to a day;
				// give talks their own index range if they ever crowd it. A "Just end"
				// talk has no one coming back for it, so it doesn't wait.
				if (
					session.entryType === "talk" &&
					state === "mirror_delivered" &&
					!session.talkMirrorLater &&
					session.updatedAt > Date.now() - TALK_MIRROR_WAIT_MS
				) {
					continue;
				}
				// A "Just end" talk whose pipeline died before closing it: its mirror
				// is in, so it completes rather than being abandoned.
				if (
					(stalePathStates as readonly string[]).includes(state) ||
					(session.talkMirrorLater && state === "mirror_delivered")
				) {
					await finalizeCompletion(ctx, session, {
						pathCompleted: false,
						stranded: true,
					});
				} else {
					await ctx.db.patch("sessions", session._id, {
						state: "abandoned",
						updatedAt: Date.now(),
					});
					// Same gate as the manual abandon path: escalation-then-abandon only.
					await finalizeFollowUp(
						ctx,
						session,
						abandonRequiresFollowUp(session)
					);
				}
			}
		}

		// A talk abandoned with nothing to mirror goes with its transcript (#588).
		// A talk with input keeps the typed lifetime (data retention).
		// ponytail: 50 per pass; page through if short talks outpace it.
		const emptyTalks = await ctx.db
			.query("sessions")
			.withIndex("by_entryType_and_state_and_rawInputLength", (q) =>
				q
					.eq("entryType", "talk")
					.eq("state", "abandoned")
					.eq("rawInputLength", undefined)
			)
			.take(50);
		for (const session of emptyTalks) {
			await purgeSessions(ctx, session.emotionalProfileId, [session]);
		}
	},
});
