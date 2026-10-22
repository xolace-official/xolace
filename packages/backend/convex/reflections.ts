import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth, requireSessionOwnership } from "./lib/auth";
import { hasPremium } from "./lib/premium";
import { rateLimiter } from "./lib/rateLimits";
import { loadSemanticMatches, matchByTags } from "./lib/reflectionMatching";

// Full `reflections` document shape, mirroring schema.ts's `reflections` table.
const reflectionDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("reflections"),
	addedAt: v.number(),
	displayText: v.string(),
	granularLabel: v.optional(v.string()),
	intensity: v.number(),
	isSeed: v.boolean(),
	primaryEmotion: v.string(),
	resonanceCount: v.number(),
	status: v.union(
		v.literal("active"),
		v.literal("flagged"),
		v.literal("removed")
	),
	thematicTags: v.array(v.string()),
});

/**
 * Match reflections for a session based on its emotional metadata.
 * Accepts sessionId, verifies ownership, derives emotion from metadata.
 */
export const matchForSession = query({
	args: {
		sessionId: v.id("sessions"),
	},
	handler: async (ctx, args) => {
		const { profile, session } = await requireSessionOwnership(
			ctx,
			args.sessionId
		);

		// Xolace+: precomputed semantic matches lead. Empty when nothing was
		// precomputed or the user isn't premium — the free path is unchanged.
		const semantic =
			session.semanticMatchIds?.length && (await hasPremium(ctx, profile))
				? await loadSemanticMatches(ctx, session)
				: [];
		if (semantic.length >= 4) {
			return semantic.slice(0, 4);
		}

		// Top up from the tag cascade, deduping against the semantic results.
		const fallback = await matchByTags(ctx, args.sessionId);
		const semanticIds = new Set(semantic.map((r) => r._id));
		return [
			...semantic,
			...fallback.filter((r) => !semanticIds.has(r._id)),
		].slice(0, 4);
	},
	returns: v.array(reflectionDocValidator),
});

/**
 * Toggle "I feel this too" — insert or delete resonance record.
 * Returns { resonated: boolean } so the client knows the new state.
 */
export const toggleResonance = mutation({
	args: {
		reflectionId: v.id("reflections"),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		// Rate limit: prevent resonance toggle spam
		const { ok } = await rateLimiter.limit(ctx, "resonanceToggle", {
			key: profile._id,
		});
		if (!ok) {
			return { rateLimited: true, resonated: false };
		}

		const reflection = await ctx.db.get("reflections", args.reflectionId);
		if (!reflection) {
			throw new Error("Reflection not found");
		}

		const existing = await ctx.db
			.query("reflection_resonances")
			.withIndex("by_profile_reflection", (q) =>
				q
					.eq("emotionalProfileId", profile._id)
					.eq("reflectionId", args.reflectionId)
			)
			.unique();

		if (existing) {
			// Un-resonate
			await ctx.db.delete("reflection_resonances", existing._id);
			await ctx.db.patch("reflections", args.reflectionId, {
				resonanceCount: Math.max(0, reflection.resonanceCount - 1),
			});
			return { resonated: false };
		}

		// Resonate
		await ctx.db.insert("reflection_resonances", {
			createdAt: Date.now(),
			emotionalProfileId: profile._id,
			reflectionId: args.reflectionId,
		});
		await ctx.db.patch("reflections", args.reflectionId, {
			resonanceCount: reflection.resonanceCount + 1,
		});
		return { resonated: true };
	},
	returns: v.object({
		rateLimited: v.optional(v.boolean()),
		resonated: v.boolean(),
	}),
});

/**
 * Batch check whether the current user has resonated with a set of reflections.
 */
export const hasResonated = query({
	args: {
		reflectionIds: v.array(v.id("reflections")),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const result: Record<string, boolean> = {};
		for (const reflectionId of args.reflectionIds) {
			const existing = await ctx.db
				.query("reflection_resonances")
				.withIndex("by_profile_reflection", (q) =>
					q
						.eq("emotionalProfileId", profile._id)
						.eq("reflectionId", reflectionId)
				)
				.unique();
			result[reflectionId] = !!existing;
		}
		return result;
	},
	returns: v.record(v.string(), v.boolean()),
});

/**
 * Fallback: list recent active reflections when matchForSession returns empty.
 */
export const listRecent = query({
	args: {
		limit: v.number(),
	},
	handler: async (ctx, args) => {
		await requireAuth(ctx);

		return await ctx.db
			.query("reflections")
			.withIndex("by_status", (q) => q.eq("status", "active"))
			.order("desc")
			.take(Math.min(args.limit, 20));
	},
	returns: v.array(reflectionDocValidator),
});

const reportReasonValidator = v.union(
	v.literal("offensive"),
	v.literal("self_harm"),
	v.literal("spam"),
	v.literal("other")
);

/**
 * Report a peer reflection for offensive or harmful content.
 * Auto-flags the reflection after ≥3 reports from distinct profiles.
 */
export const reportReflection = mutation({
	args: {
		reason: reportReasonValidator,
		reflectionId: v.id("reflections"),
	},
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);

		const { ok } = await rateLimiter.limit(ctx, "reportReflection", {
			key: profile._id,
		});
		if (!ok) {
			return { rateLimited: true };
		}

		const reflection = await ctx.db.get("reflections", args.reflectionId);
		if (!reflection) {
			throw new Error("Reflection not found");
		}

		const existing = await ctx.db
			.query("reflection_reports")
			.withIndex("by_profile_reflection", (q) =>
				q
					.eq("reporterProfileId", profile._id)
					.eq("reflectionId", args.reflectionId)
			)
			.unique();

		if (existing) {
			return { alreadyReported: true };
		}

		await ctx.db.insert("reflection_reports", {
			createdAt: Date.now(),
			reason: args.reason,
			reflectionId: args.reflectionId,
			reporterProfileId: profile._id,
		});

		// Auto-flag after ≥3 distinct reports
		const reports = await ctx.db
			.query("reflection_reports")
			.withIndex("by_reflection", (q) =>
				q.eq("reflectionId", args.reflectionId)
			)
			.take(3);

		if (reports.length >= 3 && reflection.status === "active") {
			await ctx.db.patch("reflections", args.reflectionId, {
				status: "flagged",
			});
			// Re-run ingest so the now-flagged entry is purged from the RAG pool.
			await ctx.scheduler.runAfter(
				0,
				internal.reflectionsRag.ingestReflection,
				{
					reflectionId: args.reflectionId,
				}
			);
		}

		return { reported: true };
	},
	returns: v.object({
		alreadyReported: v.optional(v.boolean()),
		rateLimited: v.optional(v.boolean()),
		reported: v.optional(v.boolean()),
	}),
});

/**
 * Insert an anonymized reflection into the pool.
 * No profile reference — anonymity is structural.
 */
export const contribute = internalMutation({
	args: {
		displayText: v.string(),
		granularLabel: v.optional(v.string()),
		intensity: v.number(),
		primaryEmotion: v.string(),
		thematicTags: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		// Round to nearest day then add random jitter within that day to
		// prevent timing correlation attacks across low-traffic periods.
		const now = Date.now();
		const roundedDay = Math.floor(now / 86_400_000) * 86_400_000;
		const jitter = Math.floor(Math.random() * 86_400_000);

		const reflectionId = await ctx.db.insert("reflections", {
			addedAt: roundedDay + jitter,
			displayText: args.displayText,
			granularLabel: args.granularLabel,
			intensity: args.intensity,
			isSeed: false,
			primaryEmotion: args.primaryEmotion,
			resonanceCount: 0,
			status: "active",
			thematicTags: args.thematicTags,
		});

		// Embed into the RAG pool so it's semantically searchable for Plus.
		await ctx.scheduler.runAfter(0, internal.reflectionsRag.ingestReflection, {
			reflectionId,
		});
	},
});

/**
 * Seed curated reflections into the pool.
 */
export const seed = internalMutation({
	args: {
		reflections: v.array(
			v.object({
				addedAt: v.optional(v.number()),
				displayText: v.string(),
				granularLabel: v.optional(v.string()),
				intensity: v.number(),
				primaryEmotion: v.string(),
				thematicTags: v.array(v.string()),
			})
		),
	},
	handler: async (ctx, args) => {
		const now = Date.now();
		const roundedDay = Math.floor(now / 86_400_000) * 86_400_000;

		for (const reflection of args.reflections) {
			const { addedAt, ...rest } = reflection;

			// Upsert: skip if this seed reflection already exists (any status).
			const existing = await ctx.db
				.query("reflections")
				.withIndex("by_seed_displayText", (q) =>
					q.eq("isSeed", true).eq("displayText", rest.displayText)
				)
				.first();
			if (existing !== null) {
				continue;
			}

			await ctx.db.insert("reflections", {
				...rest,
				addedAt: addedAt ?? roundedDay,
				isSeed: true,
				resonanceCount: 0,
				status: "active",
			});
		}
	},
});
