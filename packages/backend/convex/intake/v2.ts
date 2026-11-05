import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { INTAKE_V2_VERSION, intakeAnswerValidators } from "../lib/validators";
import {
	capSelections,
	findIntake,
	finishOnboarding,
	requireDisplayName,
} from "./save";

/**
 * Completes a v2 (one-answer) intake (#704, #715): Q1 plus whichever of the
 * four fields the first answer told us, every one optional. Stamps
 * {@link INTAKE_V2_VERSION}; the deferred questions are asked later by the
 * feature that needs them (`intake/deferred`).
 *
 * Same single transaction and gate as v1's `api.intake.complete`. A retry
 * overwrites the four fields it owns, including clearing one the user tapped
 * off since, and leaves any deferred answer already on the row alone.
 */
export const complete = mutation({
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
