import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalMutation,
	internalQuery,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import {
	isAtRisk,
	isFlagged,
	isGroundingTitle,
	type MatchInput,
	matchExercise,
} from "./exercises/match";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { ERROR_CODES, EXERCISE_MAX_SWAPS } from "./lib/shared";
import { recordActivity } from "./streaks/activityLog";

/** A session with no metadata yet: nothing known but what the session says. */
const UNKNOWN: MatchInput = {
	confirmationState: "confirmed",
	entryType: "open_prompt",
	intensity: 0,
	primaryEmotion: "",
	userLanguageTags: [],
};

/** What the matcher reads from a finished session and its metadata. */
function matchInputFor(
	session: Doc<"sessions">,
	metadata: Doc<"emotional_metadata">
): MatchInput {
	return {
		atRisk: isAtRisk({
			escalated: session.escalationTriggered,
			riskFlag: metadata.riskFlag,
			safeguardLevel: metadata.safeguardLevel,
		}),
		confirmationState: "confirmed",
		entryType: session.entryType ?? "open_prompt",
		granularLabel: metadata.granularLabel,
		intensity: metadata.intensity,
		primaryEmotion: metadata.primaryEmotion,
		userLanguageTags: metadata.userLanguageTags,
	};
}

/**
 * Compute allowed swap target IDs for a session: the reset exercise + the
 * next-best recommendation (excluding the currently active exercise).
 * Shared by getSwapOptions (client hint) and recordSwap (server validation).
 */
async function computeSwapOptions(
	ctx: QueryCtx | MutationCtx,
	session: Doc<"sessions">
): Promise<{
	resetId: Id<"exercises"> | null;
	nextBestId: Id<"exercises"> | null;
}> {
	const resetDoc = await ctx.db
		.query("exercises")
		.withIndex("by_title", (q) => q.eq("title", "reset"))
		.unique();
	const resetId = resetDoc && resetDoc.active ? resetDoc._id : null;

	const metadata = await ctx.db
		.query("emotional_metadata")
		.withIndex("by_session", (q) => q.eq("sessionId", session._id))
		.unique();

	if (!metadata) {
		return { nextBestId: null, resetId };
	}

	const ranked = matchExercise(
		matchInputFor(session, metadata),
		session.exerciseSimilarity
	);

	const currentId = session.swappedExerciseIds?.length
		? session.swappedExerciseIds[session.swappedExerciseIds.length - 1]
		: (session.matchedExerciseId ?? null);

	let nextBestId: Id<"exercises"> | null = null;
	for (const title of ranked) {
		if (title === "reset") {
			continue;
		}
		const doc = await ctx.db
			.query("exercises")
			.withIndex("by_title", (q) => q.eq("title", title))
			.unique();
		if (doc && doc.active && doc._id !== currentId) {
			nextBestId = doc._id;
			break;
		}
	}

	return { nextBestId, resetId };
}

const stepValidator = v.object({
	breathCycles: v.optional(v.number()),
	breathPattern: v.optional(
		v.union(
			v.literal("physiological_sigh"),
			v.literal("extended_exhale"),
			v.literal("slow_exhale")
		)
	),
	content: v.string(),
	defaultContent: v.optional(v.string()),
	durationSeconds: v.optional(v.number()),
	hapticIntensity: v.optional(
		v.union(v.literal("light"), v.literal("medium"), v.literal("heavy"))
	),
	order: v.number(),
	promptMaxSeconds: v.optional(v.number()),
	promptPlaceholder: v.optional(v.string()),
	slotKeys: v.optional(v.array(v.string())),
	syncToBreath: v.optional(v.boolean()),
	type: v.union(
		v.literal("text"),
		v.literal("timer"),
		v.literal("prompt"),
		v.literal("breath"),
		v.literal("haptic"),
		v.literal("private_prompt")
	),
});

// Full `exercises` document shape, mirroring schema.ts's `exercises` table.
const exerciseDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("exercises"),
	active: v.boolean(),
	createdAt: v.number(),
	estimatedMinutes: v.number(),
	intensityRange: v.object({ max: v.number(), min: v.number() }),
	steps: v.array(stepValidator),
	targetEmotions: v.array(v.string()),
	title: v.string(),
	type: v.union(
		v.literal("breathing"),
		v.literal("body_scan"),
		v.literal("grounding"),
		v.literal("self_compassion"),
		v.literal("cognitive_reframe"),
		v.literal("visualization"),
		v.literal("journaling_prompt")
	),
	updatedAt: v.number(),
});

/**
 * Get the active exercise for a running session (matched or latest swap).
 * Returns exercise doc + filled slot values.
 */
export const getForSession = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		const swapped = session.swappedExerciseIds;
		const exerciseId =
			swapped && swapped.length > 0
				? swapped[swapped.length - 1]
				: (session.matchedExerciseId ?? null);

		const metadata = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", session._id))
			.unique();
		const input = metadata ? matchInputFor(session, metadata) : undefined;
		const flagged = input
			? isFlagged(input)
			: session.escalationTriggered === true;

		const exercise = exerciseId
			? await ctx.db.get("exercises", exerciseId)
			: null;
		if (exerciseId && !exercise) {
			return null;
		}
		// A session flagged after it matched (clarify raised the risk or the
		// intensity) still plays only grounding; a grounding swap it chose stays.
		if (!exercise || (flagged && !isGroundingTitle(exercise.title))) {
			// Let it land, or for a flagged session the first grounding exercise
			// there is.
			const titles: string[] = flagged
				? matchExercise(input ?? { ...UNKNOWN, atRisk: true })
				: ["let_it_land"];
			for (const title of titles) {
				const fallback = await ctx.db
					.query("exercises")
					.withIndex("by_title", (q) => q.eq("title", title))
					.unique();
				if (fallback) {
					return { exercise: fallback, slots: {} as Record<string, string> };
				}
			}
			return null;
		}

		return {
			exercise,
			slots: (session.exerciseSlots ?? {}) as Record<string, string>,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			exercise: exerciseDocValidator,
			slots: v.record(v.string(), v.string()),
		})
	),
});

/**
 * Match exercises for a session based on its emotional metadata.
 */
export const matchForSession = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		const metadata = await ctx.db
			.query("emotional_metadata")
			.withIndex("by_session", (q) => q.eq("sessionId", args.sessionId))
			.unique();

		if (!metadata) {
			return [];
		}

		const exercises = await ctx.db
			.query("exercises")
			.withIndex("by_active", (q) => q.eq("active", true))
			.take(50);

		const input = matchInputFor(session, metadata);
		// A flagged session's list is the grounding four whatever its feeling
		// or intensity, so their target emotions and ranges don't narrow it.
		const matching = isFlagged(input)
			? exercises
			: exercises.filter((e) => {
					const emotionMatch = e.targetEmotions.includes(
						metadata.primaryEmotion
					);
					const intensityMatch =
						metadata.intensity >= e.intensityRange.min &&
						metadata.intensity <= e.intensityRange.max;
					return emotionMatch && intensityMatch;
				});

		const rankedTitles = matchExercise(input, session.exerciseSimilarity);

		const byTitle = new Map(matching.map((e) => [e.title, e]));
		const ordered: typeof matching = [];
		for (const title of rankedTitles) {
			const doc = byTitle.get(title);
			if (doc) {
				ordered.push(doc);
			}
		}

		return ordered.slice(0, 3);
	},
	returns: v.array(exerciseDocValidator),
});

/**
 * Get ranked swap options for a session (reset + next-best).
 * Returns IDs only — client passes to recordSwap.
 */
export const getSwapOptions = query({
	args: { sessionId: v.id("sessions") },
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);
		return await computeSwapOptions(ctx, session);
	},
	returns: v.object({
		nextBestId: v.union(v.id("exercises"), v.null()),
		resetId: v.union(v.id("exercises"), v.null()),
	}),
});

/**
 * Get a single exercise by ID.
 */
export const getById = query({
	args: { exerciseId: v.id("exercises") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		return await ctx.db.get("exercises", args.exerciseId);
	},
	returns: v.union(exerciseDocValidator, v.null()),
});

/**
 * An exercise that runs on its own, outside a session: Sit with this opened from Today
 * (Three breaths, `reset`). Looked up by its stable internal title, since ids differ per
 * deployment; null unless the row is active. Only the titles Today offers are accepted,
 * so the catalogue can't be listed through it. Free, as `getById` is.
 */
export const getStandalone = query({
	args: { title: v.literal("reset") },
	handler: async (ctx, args) => {
		await requireAuth(ctx);
		const exercise = await ctx.db
			.query("exercises")
			.withIndex("by_title", (q) => q.eq("title", args.title))
			.unique();
		return exercise?.active ? exercise : null;
	},
	returns: v.union(exerciseDocValidator, v.null()),
});

/**
 * Three breaths from Today ran to its end: the same streak credit as a tended breathing
 * twig (`paths.completeStep`), through the same helper, so it's a day showed up and can
 * unlock "sat-with-it" once. Several the same day are still one day and one award; no
 * sparks beyond the achievement's. Nothing for a missing or inactive exercise.
 */
export const completeStandalone = mutation({
	args: { title: v.literal("reset") },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const exercise = await ctx.db
			.query("exercises")
			.withIndex("by_title", (q) => q.eq("title", args.title))
			.unique();
		if (!exercise?.active) {
			return null;
		}
		await recordActivity(ctx, {
			actionType: "sit_with_this",
			emotionalProfileId: profile._id,
		});
		return null;
	},
	returns: v.null(),
});

/**
 * Record an exercise swap for a session (max EXERCISE_MAX_SWAPS swaps enforced).
 */
export const recordSwap = mutation({
	args: {
		newExerciseId: v.id("exercises"),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { session } = await requireSessionOwnership(ctx, args.sessionId);

		const currentSwaps = session.swappedExerciseIds ?? [];
		if (currentSwaps.length >= EXERCISE_MAX_SWAPS) {
			throw new ConvexError({
				code: ERROR_CODES.swapLimitReached,
				message: "Maximum swaps reached",
			});
		}

		const { resetId, nextBestId } = await computeSwapOptions(ctx, session);
		const allowed = new Set(
			[resetId, nextBestId].filter((id): id is Id<"exercises"> => id !== null)
		);
		if (!allowed.has(args.newExerciseId)) {
			throw new ConvexError({
				code: ERROR_CODES.swapNotAllowed,
				message: "Exercise not allowed for this session",
			});
		}

		const updatedSwaps = [...currentSwaps, args.newExerciseId];
		await ctx.db.patch("sessions", args.sessionId, {
			swappedExerciseIds: updatedSwaps,
		});
		return { swapsUsed: updatedSwaps.length };
	},
	returns: v.object({ swapsUsed: v.number() }),
});

/**
 * Look up an exercise by internal title.
 */
export const getByTitle = internalQuery({
	args: { title: v.string() },
	handler: async (ctx, args) =>
		await ctx.db
			.query("exercises")
			.withIndex("by_title", (q) => q.eq("title", args.title))
			.unique(),
});

/**
 * Set the matched exercise on a session (called from generateMirror).
 */
export const setMatched = internalMutation({
	args: {
		exerciseSimilarity: v.optional(v.record(v.string(), v.number())),
		matchedExerciseId: v.id("exercises"),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			return;
		}
		await ctx.db.patch("sessions", args.sessionId, {
			exerciseSimilarity: args.exerciseSimilarity,
			matchedExerciseId: args.matchedExerciseId,
		});
	},
});

/**
 * Refresh a session's exercise scores after refinement adds text
 * (undefined clears them).
 */
export const setExerciseSimilarity = internalMutation({
	args: {
		exerciseSimilarity: v.optional(v.record(v.string(), v.number())),
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const session = await ctx.db.get("sessions", args.sessionId);
		if (!session) {
			return;
		}
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
				estimatedMinutes: v.number(),
				intensityRange: v.object({ max: v.number(), min: v.number() }),
				steps: v.array(stepValidator),
				targetEmotions: v.array(v.string()),
				title: v.string(),
				type: v.union(
					v.literal("breathing"),
					v.literal("body_scan"),
					v.literal("grounding"),
					v.literal("self_compassion"),
					v.literal("cognitive_reframe"),
					v.literal("visualization"),
					v.literal("journaling_prompt")
				),
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
				await ctx.db.patch("exercises", existing._id, {
					...exercise,
					updatedAt: now,
				});
			} else {
				await ctx.db.insert("exercises", {
					...exercise,
					active: true,
					createdAt: now,
					updatedAt: now,
				});
			}
		}
		await ctx.scheduler.runAfter(
			0,
			internal.ai.exercises.embed.indexExercises,
			{}
		);
	},
});
