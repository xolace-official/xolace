import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

// Returns all events — date filtering happens client-side in local timezone.
// The table is small and team-managed; collect() is safe here.
// Auth-gated for defense-in-depth: this content is only ever shown inside the
// authenticated app, so there's no reason to expose it publicly.
export const getActive = query({
	args: {},
	handler: async (ctx) => {
		await requireAuth(ctx);
		return await ctx.db.query("monthlyEvents").collect();
	},
});

// Idempotent seed — safe to run multiple times. Skips if slug already exists.
// Run via: npx convex run monthlyEvents:seed --no-push
export const seed = internalMutation({
	args: {
		slug: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const slug = args.slug ?? "mens-mental-health-month-2026-06";

		const existing = await ctx.db
			.query("monthlyEvents")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.unique();

		if (existing) {
			return { id: existing._id, skipped: true };
		}

		const today = new Date();
		const startDate = today.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
		const endDate = new Date(
			today.getFullYear(),
			today.getMonth() + 1,
			0
		).toLocaleDateString("en-CA"); // last day of current month

		const id = await ctx.db.insert("monthlyEvents", {
			body: "June holds space for something that often goes unspoken — the weight, the pressure, the quiet exhaustion of holding it all together. Whatever is here for you right now, it belongs here.",
			ctaLabel: "Find support",
			ctaRoute: "/(protected)/crisis-resources",
			endDate,
			priority: 1,
			sessionPrompt: "What has it been like for you lately?",
			slug,
			startDate,
			title: "Men's Mental Health Month",
		});

		return { id, skipped: false };
	},
});

// Create or update an event by slug (edit copy/image while iterating).
// Run via: npx convex run monthlyEvents:upsert '{...}'
export const upsert = internalMutation({
	args: {
		body: v.string(),
		ctaLabel: v.optional(v.string()),
		ctaRoute: v.optional(v.string()),
		endDate: v.string(),
		imageUrl: v.optional(v.string()),
		linkUrl: v.optional(v.string()),
		priority: v.number(),
		sessionPrompt: v.optional(v.string()),
		slug: v.string(),
		startDate: v.string(),
		title: v.string(),
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("monthlyEvents")
			.withIndex("by_slug", (q) => q.eq("slug", args.slug))
			.unique();
		if (existing) {
			await ctx.db.patch(existing._id, args);
			return { id: existing._id, updated: true };
		}
		return { id: await ctx.db.insert("monthlyEvents", args), updated: false };
	},
});
