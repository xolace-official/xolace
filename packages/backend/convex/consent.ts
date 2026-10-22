import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";
import { consentTypeValidator } from "./lib/validators";

/**
 * Append a consent grant record.
 */
export const grant = mutation({
  args: {
    consentType: consentTypeValidator,
    consentLanguageVersion: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const now = Date.now();

    await ctx.db.insert("consent_records", {
      emotionalProfileId: profile._id,
      consentType: args.consentType,
      status: "granted",
      consentLanguageVersion: args.consentLanguageVersion,
      grantedAt: now,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Append a consent revocation record.
 */
export const revoke = mutation({
  args: {
    consentType: consentTypeValidator,
  },
  returns: v.null(),
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
      emotionalProfileId: profile._id,
      consentType: args.consentType,
      status: "revoked",
      consentLanguageVersion: latest?.consentLanguageVersion ?? "1.0",
      revokedAt: now,
      createdAt: now,
    });

    return null;
  },
});

/**
 * Get the current consent status for a given type.
 * Returns the most recent record (most recent wins).
 */
export const getCurrentStatus = query({
  args: {
    consentType: consentTypeValidator,
  },
  returns: v.union(
    v.null(),
    v.object({
      status: v.union(v.literal("granted"), v.literal("revoked")),
      consentLanguageVersion: v.string(),
      createdAt: v.number(),
    }),
  ),
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
      status: latest.status,
      consentLanguageVersion: latest.consentLanguageVersion,
      createdAt: latest.createdAt,
    };
  },
});
