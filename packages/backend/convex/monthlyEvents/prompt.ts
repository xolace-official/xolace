import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { EVENT_PROMPT_CARRY_MS } from "../lib/shared";
import { appEventValidator, recentEvents, toAppEvent } from "./events";

/**
 * A user's choice on a monthly event's prompt (redesign "Coming back", B2).
 * The greeting lists the prompt while it waits; the user reads it, writes
 * about it, or lets it pass.
 *
 * - **Waiting**: the event is on (the client's local day is inside its dates)
 *   and the user has no row for it. Lasts until the event ends.
 * - **Read / written**: the prompt rides Today's reflect card for
 *   `CARRY_MS` from the first of the two (production's device-only
 *   `pendingEventPrompt`, now on the server). Never extended.
 * - **Passed**: nothing carried, and it never comes back.
 *
 * Each choice is one row in `monthly_event_states`. Transitions after the
 * first choice:
 *
 * | from    | read  | written            | passed                |
 * | ------- | ----- | ------------------ | --------------------- |
 * | read    | —     | written, same week | passed, carry cleared |
 * | written | stays | —                  | stays*                |
 * | passed  | stays | stays              | —                     |
 *
 * Passed is final: "It won't come back". *The greeting never offers it on a
 * written prompt: "Write about it" closes the greeting, and "Still here."
 * hides rows that were already done.
 */

/** How long a read or written prompt stays on the reflect card. */
export const CARRY_MS = EVENT_PROMPT_CARRY_MS;
/** Carried prompts looked at per read; normally one, rarely two. */
const MAX_CARRIED = 5;
/** Rows deleted per batch on wipe and account deletion. */
const BATCH_SIZE = 100;
const LOCAL_DAY = /^\d{4}-\d{2}-\d{2}$/;
const HOUR_MS = 60 * 60 * 1000;
/** Local time runs from UTC−12 to UTC+14: the calendar days someone on Earth
 * could be living in right now lie between these offsets. */
const EARLIEST_OFFSET_MS = -12 * HOUR_MS;
const LATEST_OFFSET_MS = 14 * HOUR_MS;

const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Whether the event is on somewhere right now. The server doesn't know the
 * user's timezone, so this admits every day any timezone could be in. */
function isOnSomewhere(event: Doc<"monthlyEvents">, now: number): boolean {
	return (
		event.startDate <= utcDay(now + LATEST_OFFSET_MS) &&
		event.endDate >= utcDay(now + EARLIEST_OFFSET_MS)
	);
}

const promptChoiceValidator = v.union(
	v.literal("read"),
	v.literal("passed"),
	v.literal("written")
);

const carriedPromptValidator = v.object({
	carryUntil: v.number(),
	choice: v.union(v.literal("read"), v.literal("written")),
	eventId: v.id("monthlyEvents"),
	/** The prompt itself: the event's `sessionPrompt`. */
	prompt: v.string(),
	slug: v.string(),
	/** The event's title, production's label for the prompt. */
	title: v.string(),
});

function stateFor(
	ctx: QueryCtx,
	emotionalProfileId: Id<"emotional_profiles">,
	eventId: Id<"monthlyEvents">
): Promise<Doc<"monthly_event_states"> | null> {
	return ctx.db
		.query("monthly_event_states")
		.withIndex("by_emotionalProfileId_and_eventId", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId).eq("eventId", eventId)
		)
		.unique();
}

/**
 * The event whose prompt is waiting for this user on `today`, their local
 * day ("YYYY-MM-DD"): the highest-priority event that's on and that they
 * haven't read, written about or let pass. `null` when none is.
 */
export const getWaiting = query({
	args: { today: v.string() },
	handler: async (ctx, { today }) => {
		if (!LOCAL_DAY.test(today)) {
			throw new ConvexError({ code: "invalid_day" });
		}
		const { profile } = await requireAuth(ctx);
		const on = (await recentEvents(ctx))
			.filter((e) => e.startDate <= today && today <= e.endDate)
			.sort(
				(a, b) =>
					a.priority - b.priority || a.startDate.localeCompare(b.startDate)
			);
		for (const event of on) {
			if (!(await stateFor(ctx, profile._id, event._id))) {
				return await toAppEvent(ctx, event);
			}
		}
		return null;
	},
	returns: v.union(appEventValidator, v.null()),
});

/**
 * The prompt on Today's reflect card, if one is carried: the latest to
 * expire. Expiry is written by a scheduled mutation, so this reads no clock
 * and updates by itself when the prompt's week is up.
 */
export const getCarried = query({
	args: {},
	handler: async (ctx) => {
		const { profile } = await requireAuth(ctx);
		const carried = await ctx.db
			.query("monthly_event_states")
			.withIndex("by_emotionalProfileId_and_carryUntil", (q) =>
				q.eq("emotionalProfileId", profile._id).gte("carryUntil", 0)
			)
			.order("desc")
			.take(MAX_CARRIED);
		for (const state of carried) {
			if (state.carryUntil === undefined || state.choice === "passed") {
				continue;
			}
			const event = await ctx.db.get("monthlyEvents", state.eventId);
			// The admin may have deleted the event or cleared its prompt since.
			if (!event?.sessionPrompt) {
				continue;
			}
			return {
				carryUntil: state.carryUntil,
				choice: state.choice,
				eventId: event._id,
				prompt: event.sessionPrompt,
				slug: event.slug,
				title: event.title,
			};
		}
		return null;
	},
	returns: v.union(carriedPromptValidator, v.null()),
});

const choiceResultValidator = v.object({
	carryUntil: v.optional(v.number()),
	choice: promptChoiceValidator,
});

async function startCarry(
	ctx: MutationCtx,
	stateId: Id<"monthly_event_states">,
	now: number
): Promise<number> {
	const carryUntil = now + CARRY_MS;
	await ctx.db.patch("monthly_event_states", stateId, { carryUntil });
	await ctx.scheduler.runAt(
		carryUntil,
		internal.monthlyEvents.prompt.expireCarry,
		{ stateId }
	);
	return carryUntil;
}

/**
 * Record what the user did with an event's prompt: `read` (went back from
 * the prompt page), `written` (Write about it) or `passed` (Let it pass).
 * Read and written carry the prompt to the reflect card for `CARRY_MS` when
 * the event has one. A first choice needs the event to be on (somewhere);
 * after that only read → written and read → passed change anything (table
 * at the top). Idempotent; returns the state as it stands.
 */
export const choose = mutation({
	args: {
		choice: promptChoiceValidator,
		eventId: v.id("monthlyEvents"),
	},
	handler: async (ctx, { choice, eventId }) => {
		const { profile } = await requireAuth(ctx);
		const event = await ctx.db.get("monthlyEvents", eventId);
		if (!event) {
			throw new ConvexError({ code: "event_not_found" });
		}
		const now = Date.now();
		const existing = await stateFor(ctx, profile._id, eventId);

		if (existing) {
			if (existing.choice === "read" && choice === "written") {
				await ctx.db.patch("monthly_event_states", existing._id, {
					choice,
				});
				return { carryUntil: existing.carryUntil, choice };
			}
			if (existing.choice === "read" && choice === "passed") {
				// The read row stays tappable on the greeting. Letting it pass
				// takes it off the reflect card too; the scheduled expireCarry
				// then finds no carry and does nothing.
				await ctx.db.patch("monthly_event_states", existing._id, {
					carryUntil: undefined,
					choice,
				});
				return { choice };
			}
			return { carryUntil: existing.carryUntil, choice: existing.choice };
		}

		if (!isOnSomewhere(event, now)) {
			throw new ConvexError({ code: "event_not_active" });
		}

		const stateId = await ctx.db.insert("monthly_event_states", {
			choice,
			chosenAt: now,
			emotionalProfileId: profile._id,
			eventId,
		});
		if (choice === "passed" || !event.sessionPrompt) {
			return { choice };
		}
		return { carryUntil: await startCarry(ctx, stateId, now), choice };
	},
	returns: choiceResultValidator,
});

/**
 * Take a carried prompt off the reflect card before its week is up: the user
 * started a reflection with it, or set it aside (production clears
 * `pendingEventPrompt` in the same places). The choice stays, so the prompt
 * doesn't come back to the greeting either.
 */
export const clearCarried = mutation({
	args: { eventId: v.id("monthlyEvents") },
	handler: async (ctx, { eventId }) => {
		const { profile } = await requireAuth(ctx);
		const state = await stateFor(ctx, profile._id, eventId);
		if (state?.carryUntil !== undefined) {
			await ctx.db.patch("monthly_event_states", state._id, {
				carryUntil: undefined,
			});
		}
		return null;
	},
	returns: v.null(),
});

/** Scheduled at `carryUntil` by `choose`: the prompt's week is up. */
export const expireCarry = internalMutation({
	args: { stateId: v.id("monthly_event_states") },
	handler: async (ctx, { stateId }) => {
		const state = await ctx.db.get("monthly_event_states", stateId);
		if (state?.carryUntil !== undefined && state.carryUntil <= Date.now()) {
			await ctx.db.patch("monthly_event_states", stateId, {
				carryUntil: undefined,
			});
		}
		return null;
	},
	returns: v.null(),
});

/**
 * Delete one batch of a profile's prompt choices, for wipe and account
 * deletion. Returns whether the batch was full (more may remain).
 */
export async function drainPromptStates(
	ctx: MutationCtx,
	emotionalProfileId: Id<"emotional_profiles">
): Promise<boolean> {
	const rows = await ctx.db
		.query("monthly_event_states")
		.withIndex("by_emotionalProfileId_and_eventId", (q) =>
			q.eq("emotionalProfileId", emotionalProfileId)
		)
		.take(BATCH_SIZE);
	for (const row of rows) {
		await ctx.db.delete("monthly_event_states", row._id);
	}
	return rows.length === BATCH_SIZE;
}
