import { type Infer, v } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, type QueryCtx, query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Awareness events ("monthly events"), as the app reads them. Team-managed
 * from the admin (`admin/monthlyEvents.ts`). Dates are local calendar days
 * ("YYYY-MM-DD"), so which event is on is decided against the user's own day:
 * `getActive` leaves it to the client, `prompt.getWaiting` is passed it.
 */

/**
 * More than the app could ever need at once: one event a month, a few
 * planned ahead. Reads take the latest-ending ones, so ended events fall
 * off the end without the query reading the clock.
 */
export const MAX_EVENTS = 50;

/**
 * An event as a user sees it. Leaves out who last edited it (an admin's
 * Clerk id) and the storage id, which is handed out as `imageUrl` instead.
 */
export const appEventValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("monthlyEvents"),
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
	updatedAt: v.optional(v.number()),
});

export type AppEvent = Infer<typeof appEventValidator>;

/**
 * An event as `appEventValidator` describes it, field by field: a column
 * added to `monthlyEvents` later never reaches the strict validator (which
 * would throw for every shipped build) until it's added here on purpose.
 * An admin upload lives in file storage; hand it out as `imageUrl`, the field
 * every shipped app already reads.
 */
export async function toAppEvent(
	ctx: QueryCtx,
	event: Doc<"monthlyEvents">
): Promise<AppEvent> {
	const uploaded = event.imageStorageId
		? await ctx.storage.getUrl(event.imageStorageId)
		: null;
	return {
		_creationTime: event._creationTime,
		_id: event._id,
		body: event.body,
		// Unset optional fields come out `undefined`, which Convex drops.
		ctaLabel: event.ctaLabel,
		ctaRoute: event.ctaRoute,
		endDate: event.endDate,
		imageUrl: uploaded ?? event.imageUrl,
		linkUrl: event.linkUrl,
		priority: event.priority,
		sessionPrompt: event.sessionPrompt,
		slug: event.slug,
		startDate: event.startDate,
		title: event.title,
		updatedAt: event.updatedAt,
	};
}

/** The latest-ending events, newest end first. Bounded by `MAX_EVENTS`. */
export function recentEvents(ctx: QueryCtx): Promise<Doc<"monthlyEvents">[]> {
	return ctx.db
		.query("monthlyEvents")
		.withIndex("by_endDate")
		.order("desc")
		.take(MAX_EVENTS);
}

export const getActiveArgs = {};

export async function getActiveCore(ctx: QueryCtx): Promise<AppEvent[]> {
	// Auth-gated for defense-in-depth: this content is only ever shown inside
	// the authenticated app, so there's no reason to expose it publicly.
	await requireAuth(ctx);
	const events = await recentEvents(ctx);
	return await Promise.all(events.map((event) => toAppEvent(ctx, event)));
}

/**
 * Current and upcoming events (and the latest ended ones); the client picks
 * the one that's on in its own timezone.
 */
export const getActive = query({
	args: getActiveArgs,
	handler: getActiveCore,
	returns: v.array(appEventValidator),
});

// Idempotent seed — safe to run multiple times. Skips if slug already exists.
// Run via: npx convex run monthlyEvents/events:seed --no-push
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
	returns: v.object({ id: v.id("monthlyEvents"), skipped: v.boolean() }),
});

// Create or update an event by slug (edit copy/image while iterating).
// Run via: npx convex run monthlyEvents/events:upsert '{...}'
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
	returns: v.object({ id: v.id("monthlyEvents"), updated: v.boolean() }),
});
