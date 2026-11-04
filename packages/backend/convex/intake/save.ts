/**
 * The rules every intake save shares, v1 (`convex/intake.ts`) and v2
 * (`intake/v2.ts`, `intake/deferred.ts`) alike. They live in the folder so the
 * flat v1 file depends on it and never the reverse: once no supported build
 * calls `api.intake.complete`, that file goes and nothing here changes.
 */
import { ConvexError, type Infer } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { validateDisplayName } from "../lib/displayName";
import type { intakeAnswerValidators } from "../lib/validators";

/** Max options a multi-select question accepts. A validator can't express it. */
const MAX_SELECTIONS = 3;

/** Q1, trimmed, or a `invalid_display_name` error. */
export function requireDisplayName(displayName: string): string {
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
export function capSelections(
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
 * The series branch (Q10/Q11) only fires for short-form-video arrivals.
 * Dropping stray answers keeps "absent" meaning exactly one thing: the branch
 * never ran (never "declined").
 */
export function seriesAnswers(args: {
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

/** The profile's one `intake_responses` row, or null before any intake. */
export const findIntake = (
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">
) =>
	ctx.db
		.query("intake_responses")
		.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profileId))
		.unique();

/**
 * Writes Q1 and flips the onboarding gate: the half of completing an intake
 * that v1 and v2 share, in the caller's transaction.
 */
export async function finishOnboarding(
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
