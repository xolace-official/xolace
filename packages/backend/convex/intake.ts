/**
 * Intake v1 and the intake screens' reads, at the flat path shipped builds
 * call (`api.intake.complete`, `api.intake.campfireStats`). New intake
 * functions go in `convex/intake/` (v2: `intake/v2`, `intake/deferred`); this
 * file only shrinks, and goes once no supported build calls it.
 */
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import {
	capSelections,
	findIntake,
	finishOnboarding,
	requireDisplayName,
	seriesAnswers,
} from "./intake/save";
import { reflectionRank } from "./lib/aggregates";
import { requireAuth } from "./lib/auth";
import { INTAKE_VERSION, intakeAnswerValidators } from "./lib/validators";

// Lives in `lib/validators` so the client can read it for the `intake_version`
// person property (T7) without importing a server module.
export { INTAKE_VERSION };

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
