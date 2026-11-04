import { ConvexError, type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalQuery,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import { reflectionRank } from "./lib/aggregates";
import { requireAuth } from "./lib/auth";
import { validateDisplayName } from "./lib/displayName";
import {
	INTAKE_V2_VERSION,
	INTAKE_VERSION,
	intakeAnswerValidators,
} from "./lib/validators";

// Lives in `lib/validators` so the client can read it for the `intake_version`
// person property (T7) without importing a server module.
export { INTAKE_VERSION };

/** Max options a multi-select question accepts. A validator can't express it. */
const MAX_SELECTIONS = 3;

/** Q1, trimmed, or a `invalid_display_name` error. */
function requireDisplayName(displayName: string): string {
	const validated = validateDisplayName(displayName);
	if (!validated.ok) {
		throw new ConvexError({
			code: "invalid_display_name",
			message: validated.message,
		});
	}
	return validated.trimmed;
}

/** Enforces {@link MAX_SELECTIONS} on a multi-select answer. */
function capSelections(
	field: "weighingOn" | "copingStyle",
	selections: readonly unknown[]
) {
	if (selections.length > MAX_SELECTIONS) {
		throw new ConvexError({
			code: "too_many_selections",
			message: `${field} accepts at most ${MAX_SELECTIONS} options`,
		});
	}
}

/**
 * Writes Q1 and flips the onboarding gate: the half of completing an intake
 * that v1 and v2 share, in the caller's transaction.
 */
async function finishOnboarding(
	ctx: MutationCtx,
	profileId: Id<"emotional_profiles">,
	displayName: string
) {
	const prefs = await ctx.db
		.query("preferences")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();
	if (!prefs) {
		throw new ConvexError({
			code: "preferences_not_found",
			message: "Preferences not found",
		});
	}
	await ctx.db.patch("preferences", prefs._id, { displayName });

	await ctx.db.patch("emotional_profiles", profileId, {
		onboardingComplete: true,
		updatedAt: Date.now(),
	});
}

/**
 * The series branch (Q10/Q11) only fires for short-form-video arrivals.
 * Dropping stray answers keeps "absent" meaning exactly one thing: the branch
 * never ran (never "declined").
 */
function seriesAnswers(args: {
	acquisitionSource: Infer<typeof intakeAnswerValidators.acquisitionSource>;
	seriesSeen?: Infer<typeof intakeAnswerValidators.seriesSeen>;
	seriesWantInApp?: boolean;
}) {
	if (args.acquisitionSource !== "short_form_video") {
		return { seriesSeen: undefined, seriesWantInApp: undefined };
	}
	if (args.seriesSeen === undefined || args.seriesWantInApp === undefined) {
		throw new ConvexError({
			code: "missing_series_answer",
			message: "Both series answers are required for short-form-video arrivals",
		});
	}
	return { seriesSeen: args.seriesSeen, seriesWantInApp: args.seriesWantInApp };
}

const findIntake = (ctx: QueryCtx, profileId: Id<"emotional_profiles">) =>
	ctx.db
		.query("intake_responses")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();

/**
 * Terminal mutation of the intake flow (T3, issue #234).
 *
 * Writes the `intake_responses` row, `preferences.displayName` (Q1), and
 * `emotional_profiles.onboardingComplete = true` in ONE transaction — the
 * flag is the server-side gate, so it must never be true without the answers
 * beside it, nor the reverse.
 *
 * Identity is derived server-side via `requireAuth`; no user or profile id is
 * accepted for authorization.
 *
 * Idempotent: a retry after a flaky network overwrites the existing row
 * rather than failing or duplicating.
 */
export const complete = mutation({
	args: {
		/** Q1. Written to the existing `preferences.displayName`, max 30 chars. */
		displayName: v.string(),
		...intakeAnswerValidators,
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const displayName = requireDisplayName(args.displayName);
		capSelections("weighingOn", args.weighingOn);
		capSelections("copingStyle", args.copingStyle);

		const series = seriesAnswers(args);

		const answers = {
			acquisitionSource: args.acquisitionSource,
			ageBracket: args.ageBracket,
			completedAt: Date.now(),
			copingStyle: args.copingStyle,
			disclosureStyle: args.disclosureStyle,
			emotionAwareness: args.emotionAwareness,
			emotionalProfileId: profile._id,
			intakeVersion: INTAKE_VERSION,
			intent: args.intent,
			...series,
			supportFrequency: args.supportFrequency,
			weighingOn: args.weighingOn,
		};

		const existing = await findIntake(ctx, profile._id);
		if (existing) {
			await ctx.db.replace("intake_responses", existing._id, answers);
		} else {
			await ctx.db.insert("intake_responses", answers);
		}

		await finishOnboarding(ctx, profile._id, displayName);

		return null;
	},
	returns: v.null(),
});

/**
 * Completes a v2 (one-answer) intake (#704, #715): Q1 plus whichever of the
 * four fields the first answer told us, every one optional. Stamps
 * {@link INTAKE_V2_VERSION}; the deferred questions are asked later by the
 * feature that needs them (`recordDeferredAnswer`).
 *
 * Same single transaction and gate as {@link complete}. A retry overwrites
 * the four fields it owns, including clearing one the user tapped off since,
 * and leaves any deferred answer already on the row alone.
 */
export const completeV2 = mutation({
	args: {
		disclosureStyle: v.optional(intakeAnswerValidators.disclosureStyle),
		displayName: v.string(),
		emotionAwareness: v.optional(intakeAnswerValidators.emotionAwareness),
		intent: v.optional(intakeAnswerValidators.intent),
		weighingOn: v.optional(intakeAnswerValidators.weighingOn),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const displayName = requireDisplayName(args.displayName);
		if (args.weighingOn) {
			capSelections("weighingOn", args.weighingOn);
		}

		const answers = {
			completedAt: Date.now(),
			disclosureStyle: args.disclosureStyle,
			emotionAwareness: args.emotionAwareness,
			intakeVersion: INTAKE_V2_VERSION,
			intent: args.intent,
			// Every chip tapped off reads as "not told", same as never sent.
			weighingOn: args.weighingOn?.length ? args.weighingOn : undefined,
		};

		const existing = await findIntake(ctx, profile._id);
		if (existing) {
			await ctx.db.patch("intake_responses", existing._id, answers);
		} else {
			await ctx.db.insert("intake_responses", {
				...answers,
				emotionalProfileId: profile._id,
			});
		}

		await finishOnboarding(ctx, profile._id, displayName);

		return null;
	},
	returns: v.null(),
});

/** The questions v2 defers, in the order a client should prefer asking them. */
const DEFERRED_QUESTIONS = [
	"ageBracket",
	"acquisitionSource",
	"copingStyle",
	"supportFrequency",
] as const;

/**
 * One question v2 no longer asks at intake, answered later in the feature
 * that needs it (#704): age before the first Xolacer chat, how they found
 * Xolace (with the series pair) on a day-3 card, coping style at session end,
 * support frequency with the notification ask.
 */
const deferredAnswerValidator = v.union(
	v.object({
		ageBracket: intakeAnswerValidators.ageBracket,
		question: v.literal("ageBracket"),
	}),
	v.object({
		acquisitionSource: intakeAnswerValidators.acquisitionSource,
		question: v.literal("acquisitionSource"),
		seriesSeen: intakeAnswerValidators.seriesSeen,
		seriesWantInApp: intakeAnswerValidators.seriesWantInApp,
	}),
	v.object({
		copingStyle: intakeAnswerValidators.copingStyle,
		question: v.literal("copingStyle"),
	}),
	v.object({
		question: v.literal("supportFrequency"),
		supportFrequency: intakeAnswerValidators.supportFrequency,
	})
);

/** The fields one deferred answer writes onto the intake row. */
function deferredFields(answer: Infer<typeof deferredAnswerValidator>) {
	switch (answer.question) {
		case "ageBracket":
			return { ageBracket: answer.ageBracket };
		case "acquisitionSource":
			return {
				acquisitionSource: answer.acquisitionSource,
				...seriesAnswers(answer),
			};
		case "copingStyle":
			// Unlike v2's `weighingOn`, where an empty list is every chip tapped
			// off, this is an answer to a direct question, and storing [] would
			// mark it answered forever. "prefer_not_to_say" is the way to decline.
			if (answer.copingStyle.length === 0) {
				throw new ConvexError({
					code: "empty_selection",
					message: "copingStyle needs at least one option",
				});
			}
			capSelections("copingStyle", answer.copingStyle);
			return { copingStyle: answer.copingStyle };
		case "supportFrequency":
			return { supportFrequency: answer.supportFrequency };
		default:
			throw new Error(
				`Unknown deferred question: ${JSON.stringify(answer satisfies never)}`
			);
	}
}

/**
 * Records one deferred answer on the caller's intake row (#715). Fills only
 * that question's field(s); the series pair rides with the acquisition
 * answer, under the same branch rule as {@link complete}.
 *
 * Idempotent per field: the first answer stands, so a repeat (a retry, a
 * second device, a v1 user who already answered at intake) is a no-op and
 * returns `recorded: false`. Needs a completed intake to attach to.
 */
export const recordDeferredAnswer = mutation({
	args: { answer: deferredAnswerValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const fields = deferredFields(args.answer);

		const existing = await findIntake(ctx, profile._id);
		if (!existing) {
			throw new ConvexError({
				code: "intake_not_completed",
				message: "Complete the intake before answering a deferred question",
			});
		}
		if (existing[args.answer.question] !== undefined) {
			return { recorded: false };
		}

		await ctx.db.patch("intake_responses", existing._id, fields);
		return { recorded: true };
	},
	returns: v.object({ recorded: v.boolean() }),
});

/**
 * The deferred questions the caller still hasn't answered (#715), so a
 * client asks each one at most once. Empty for a v1 intake (answered
 * everything up front) and before any intake, when there is no row to
 * answer onto.
 */
export const missingDeferredAnswers = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);

		const intake = await findIntake(ctx, profile._id);
		if (!intake) {
			return [];
		}
		return DEFERRED_QUESTIONS.filter(
			(question) => intake[question] === undefined
		);
	},
	returns: v.array(
		v.union(...DEFERRED_QUESTIONS.map((question) => v.literal(question)))
	),
});

/**
 * How many sessions back from now the "left lighter" share is measured over.
 * One transaction, one read — this is a once-per-user screen, not a hot path.
 *
 * ponytail: bounded scan. If intake volume makes it hot, materialize it the
 * way `jobs/cohortCounts` does and read one row instead.
 */
const MOOD_WINDOW = 250;

/** Below this many rated sessions the share is noise, so we don't show it. */
const MIN_RATED = 25;

/**
 * The two real numbers the intake count screen stands on.
 *
 * `campers` is the population of the `reflectionRank` aggregate — every
 * emotional profile, O(log n), no scan. `lighterPercent` is the share of the
 * last {@link MOOD_WINDOW} sessions *that recorded a post-session mood* which
 * recorded "lighter"; null until there are enough of them to mean anything.
 * A null is the client's cue to drop the line, never to invent one.
 */
export const campfireStats = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);

		const campers = await reflectionRank.count(ctx);

		const recent = await ctx.db
			.query("sessions")
			.withIndex("by_date")
			.order("desc")
			.take(MOOD_WINDOW);

		const rated = recent.filter((s) => s.postSessionMood !== undefined);
		const lighter = rated.filter((s) => s.postSessionMood === "lighter").length;

		return {
			campers,
			lighterPercent:
				rated.length >= MIN_RATED
					? Math.round((lighter / rated.length) * 100)
					: null,
		};
	},
	returns: v.object({
		campers: v.number(),
		lighterPercent: v.union(v.number(), v.null()),
	}),
});

/**
 * Dashboard-only helper: paste the storage ids of the founder-marquee images
 * (uploaded via the Convex dashboard Files tab) and get back their serving
 * URLs, in the same order, to hard-code into `marquee-data.ts`. `null` means
 * no file for that id. Serving URLs are stable, so this is a one-time lookup,
 * not a runtime read.
 */
export const storageUrls = internalQuery({
	args: { storageIds: v.array(v.id("_storage")) },
	handler: async (ctx, args) =>
		Promise.all(args.storageIds.map((id) => ctx.storage.getUrl(id))),
	returns: v.array(v.union(v.string(), v.null())),
});
