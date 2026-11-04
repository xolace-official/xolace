import { ConvexError, type Infer, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { intakeAnswerValidators } from "../lib/validators";
import { capSelections, findIntake, seriesAnswers } from "./save";

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
 * answer, under the same branch rule as v1's `api.intake.complete`.
 *
 * Idempotent per field: the first answer stands, so a repeat (a retry, a
 * second device, a v1 user who already answered at intake) is a no-op and
 * returns `recorded: false`. Needs a completed intake to attach to.
 */
export const record = mutation({
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
export const missing = query({
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
