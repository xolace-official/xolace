import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
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
      return { skipped: true, id: existing._id };
    }

    const today = new Date();
    const startDate = today.toLocaleDateString("en-CA"); // "YYYY-MM-DD"
    const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      .toLocaleDateString("en-CA"); // last day of current month

    const id = await ctx.db.insert("monthlyEvents", {
      slug,
      title: "Men's Mental Health Month",
      body: "June holds space for something that often goes unspoken — the weight, the pressure, the quiet exhaustion of holding it all together. Whatever is here for you right now, it belongs here.",
      ctaLabel: "Find support",
      ctaRoute: "/(protected)/crisis-resources",
      sessionPrompt: "What has it been like for you lately?",
      startDate,
      endDate,
      priority: 1,
    });

    return { skipped: false, id };
  },
});

// Create or update an event by slug (edit copy/image while iterating).
// Run via: npx convex run monthlyEvents:upsert '{...}'
export const upsert = internalMutation({
  args: {
    slug: v.string(),
    title: v.string(),
    body: v.string(),
    ctaLabel: v.optional(v.string()),
    ctaRoute: v.optional(v.string()),
    sessionPrompt: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    linkUrl: v.optional(v.string()),
    startDate: v.string(),
    endDate: v.string(),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("monthlyEvents")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, args);
      return { updated: true, id: existing._id };
    }
    return { updated: false, id: await ctx.db.insert("monthlyEvents", args) };
  },
});
