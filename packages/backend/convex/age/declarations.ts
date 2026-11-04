import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { platformValidator } from "../lib/validators";
import { posthog } from "../posthog";
import { ageStatusOn, ageStatusValidator, isDateOfBirth } from "./ageStatus";
import { effectiveAgeStatus, latestDeclaration, userLocalDay } from "./status";

/**
 * Records the caller's date of birth, asked at the gate that needs it (#716).
 * Appends a row and never edits one.
 *
 * The first date stands: a repeat of the same date (a retry, a second device)
 * writes nothing, and a different one is refused with `age_already_declared`.
 * Changing a declared date is a correction, which needs its own limited,
 * logged path.
 */
export const declare = mutation({
	args: {
		appVersion: v.optional(v.string()),
		dateOfBirth: v.string(),
		platform: platformValidator,
		promptVersion: v.string(),
		surface: v.literal("xolacer_chat"),
	},
	handler: async (ctx, args) => {
		const { profile, user } = await requireAuth(ctx);

		const localDay = await userLocalDay(ctx, { profile, user });
		if (!isDateOfBirth(args.dateOfBirth, localDay)) {
			throw new ConvexError({
				code: "invalid_date_of_birth",
				message:
					"dateOfBirth must be a real YYYY-MM-DD date, not in the future",
			});
		}

		const existing = await latestDeclaration(ctx, user._id);
		if (existing) {
			if (existing.dateOfBirth !== args.dateOfBirth) {
				throw new ConvexError({
					code: "age_already_declared",
					message: "A date of birth is already on record",
				});
			}
			return { status: ageStatusOn(existing.dateOfBirth, localDay) };
		}

		await ctx.db.insert("age_declarations", {
			...args,
			declaredAt: Date.now(),
			source: "self",
			userId: user._id,
		});
		// Swallowed: a lost analytics event must never roll back the
		// declaration. The date of birth itself never goes to PostHog.
		try {
			await posthog.capture(ctx, {
				distinctId: profile._id,
				event: "age_declared",
				properties: { source: "self", surface: args.surface },
			});
		} catch (error) {
			console.error("age_declared capture failed", error);
		}
		return { status: ageStatusOn(args.dateOfBirth, localDay) };
	},
	returns: v.object({ status: ageStatusValidator }),
});

/** The caller's effective age status, so a client knows which screen a gate needs. */
export const status = query({
	args: {},
	handler: async (ctx) => {
		const { profile, user } = await requireAuth(ctx);
		return { status: await effectiveAgeStatus(ctx, { profile, user }) };
	},
	returns: v.object({ status: ageStatusValidator }),
});
