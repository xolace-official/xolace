import { v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalMutation, mutation, query } from "../_generated/server";
import { purgeProfilePastCutoff } from "../jobs/dataRetention";
import { requireAuth } from "../lib/auth";
import { dataRetentionPreferenceValidator } from "../lib/validators";
import { updatePreferences } from "../preferences";
import { nextRunCutoff, sessionsBefore } from "./retentionCutoff";

/**
 * Settings' retention controls for the redesigned Privacy page (redesign B9):
 * the count its alert shows before someone shortens retention ("N sessions
 * would go"), and the purge that runs when they confirm.
 *
 * Both take their cutoff from `nextRunCutoff`, so what's deleted on confirm
 * is exactly what was counted. The rule itself lives in `./retentionCutoff`,
 * and the deletion in `jobs/dataRetention.purgeProfilePastCutoff`, both
 * shared with the nightly job.
 *
 * `preferences.update` still saves a retention preference without deleting
 * anything (shipped builds have no alert); the nightly job then catches up.
 */

type RetentionPreference = Doc<"preferences">["dataRetentionPreference"];

/** Longest last: a move down this list shortens retention. */
const KEEPS_LONGER: readonly RetentionPreference[] = [
	"6_months",
	"1_year",
	"indefinite",
];
const shortens = (from: RetentionPreference, to: RetentionPreference) =>
	KEEPS_LONGER.indexOf(to) < KEEPS_LONGER.indexOf(from);

/**
 * The most sessions the count reads; past it the answer is "more than
 * `MAX_COUNTED`". A session row tops out near 70 KB: a talk's `rawInput` is up
 * to 20,000 characters, which in CJK is about 60 KB of UTF-8, plus its mirror
 * and memory text. 101 rows stay near 7 MB, under half a query's 16 MiB read
 * limit; text sessions are a few KB each. A daily user crosses 100 only after
 * more than three months past the cutoff, and by then the exact number no
 * longer changes what the warning says.
 */
export const MAX_COUNTED = 100;

/**
 * How many of the caller's sessions would go if `retention` became their
 * preference now: what `applyRetentionNow` deletes, and what the nightly job
 * deletes by its next run for someone who changes it through
 * `preferences.update`.
 *
 * - **Every session row counts**, not only the ones on the timeline:
 *   `initiated`, `abandoned` and `error` sessions are deleted too, and an
 *   abandoned one can still hold what the person wrote.
 * - **Counted to the next run.** The job runs every
 *   `retentionRunIntervalHours` on its own clock, so a session that crosses
 *   the cutoff before then goes at that run. The count's cutoff is that far
 *   ahead: it may include a session up to one interval early, never miss one.
 * - **Fetch it once**, imperatively, when the person picks a shorter period
 *   (`convex.query(...)`), not as a `useQuery` subscription: the result
 *   depends on the clock, and nothing re-runs it as time passes.
 *   `indefinite` deletes nothing and reads no sessions.
 *
 * Returns `{ count, capped }`; `capped` means more than `count` (= `MAX_COUNTED`).
 */
export const countSessionsPastRetention = query({
	args: { retention: dataRetentionPreferenceValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		if (args.retention === "indefinite") {
			return { capped: false, count: 0 };
		}
		const cutoff = nextRunCutoff(args.retention, Date.now());
		const rows = await sessionsBefore(ctx.db, profile._id, cutoff).take(
			MAX_COUNTED + 1
		);
		return {
			capped: rows.length > MAX_COUNTED,
			count: Math.min(rows.length, MAX_COUNTED),
		};
	},
	returns: v.object({ capped: v.boolean(), count: v.number() }),
});

/**
 * Save a retention preference and, when it shortens retention, delete what
 * it lets go right away: the alert's "Delete them". Only the redesigned
 * Settings calls this; `preferences.update` keeps saving without deleting.
 *
 * - Saves through `preferences.update`'s own handler.
 * - Shortening deletes everything the nightly job would for the caller, at
 *   `nextRunCutoff` (the count's cutoff): one batch inline, the rest in
 *   `continueRetentionPurge` runs scheduled back to back.
 * - That cutoff deliberately reaches one run interval past the nightly job's
 *   cutoff, so "Delete them" deletes exactly the sessions the count showed.
 * - Lengthening, keeping the same value, and `indefinite` delete nothing.
 *
 * Returns `{ scheduled }`: true when a continuation will delete more.
 */
export const applyRetentionNow = mutation({
	args: { preference: dataRetentionPreferenceValidator },
	handler: async (ctx, args) => {
		const { profile } = await requireAuth(ctx);
		const before = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) => q.eq("emotionalProfileId", profile._id))
			.unique();
		await updatePreferences(ctx, {
			dataRetentionPreference: args.preference,
		});
		if (
			args.preference === "indefinite" ||
			!before ||
			!shortens(before.dataRetentionPreference, args.preference)
		) {
			return { scheduled: false };
		}
		const cutoff = nextRunCutoff(args.preference, Date.now());
		const { more } = await purgeProfilePastCutoff(ctx, profile._id, cutoff);
		if (more) {
			await ctx.scheduler.runAfter(
				0,
				internal.privacy.retention.continueRetentionPurge,
				{
					cutoff,
					emotionalProfileId: profile._id,
					preference: args.preference,
				}
			);
		}
		return { scheduled: more };
	},
	returns: v.object({ scheduled: v.boolean() }),
});

/**
 * The rest of an `applyRetentionNow` purge, one batch per run, at the cutoff
 * it was confirmed with. Stops if the preference has changed since: a
 * person who lengthened it again keeps what's left.
 *
 * Two chains can run at once (6 months, back to indefinite, 6 months again
 * before the first chain's next run). Both carry the current preference, and
 * the older one's cutoff is earlier, so it only deletes a subset of what the
 * newer one does: nothing extra is lost, so there's no chain id to dedupe on.
 */
export const continueRetentionPurge = internalMutation({
	args: {
		cutoff: v.number(),
		emotionalProfileId: v.id("emotional_profiles"),
		preference: v.union(v.literal("6_months"), v.literal("1_year")),
	},
	handler: async (ctx, args) => {
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", args.emotionalProfileId)
			)
			.unique();
		if (prefs?.dataRetentionPreference !== args.preference) {
			return null;
		}
		const { more } = await purgeProfilePastCutoff(
			ctx,
			args.emotionalProfileId,
			args.cutoff
		);
		if (more) {
			await ctx.scheduler.runAfter(
				0,
				internal.privacy.retention.continueRetentionPurge,
				args
			);
		}
		return null;
	},
	returns: v.null(),
});
