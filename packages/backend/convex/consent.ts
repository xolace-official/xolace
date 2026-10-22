import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { consentTypeValidator } from "./lib/validators";

/**
 * Append a consent grant record.
 */
export const grant = mutation({
	args: {
		consentLanguageVersion: v.string(),
		consentType: consentTypeValidator,
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();

		await ctx.db.insert("consent_records", {
			consentLanguageVersion: args.consentLanguageVersion,
			consentType: args.consentType,
			createdAt: now,
			emotionalProfileId: profile._id,
			grantedAt: now,
			status: "granted",
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Append a consent revocation record.
 */
export const revoke = mutation({
	args: {
		consentType: consentTypeValidator,
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const now = Date.now();

		// Get the latest consent record to carry forward the language version
		const latest = await ctx.db
			.query("consent_records")
			.withIndex("by_profile_type", (q) =>
				q
					.eq("emotionalProfileId", profile._id)
					.eq("consentType", args.consentType)
			)
			.order("desc")
			.first();

		await ctx.db.insert("consent_records", {
			consentLanguageVersion: latest?.consentLanguageVersion ?? "1.0",
			consentType: args.consentType,
			createdAt: now,
			emotionalProfileId: profile._id,
			revokedAt: now,
			status: "revoked",
		});

		return null;
	},
	returns: v.null(),
});

/**
 * Get the current consent status for a given type.
 * Returns the most recent record (most recent wins).
 */
export const getCurrentStatus = query({
	args: {
		consentType: consentTypeValidator,
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const latest = await ctx.db
			.query("consent_records")
			.withIndex("by_profile_type", (q) =>
				q
					.eq("emotionalProfileId", profile._id)
					.eq("consentType", args.consentType)
			)
			.order("desc")
			.first();

		if (!latest) {
			return null;
		}

		return {
			consentLanguageVersion: latest.consentLanguageVersion,
			createdAt: latest.createdAt,
			status: latest.status,
		};
	},
	returns: v.union(
		v.null(),
		v.object({
			consentLanguageVersion: v.string(),
			createdAt: v.number(),
			status: v.union(v.literal("granted"), v.literal("revoked")),
		})
	),
});
