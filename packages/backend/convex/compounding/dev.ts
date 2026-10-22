/**
 * Dev-only window onto the steadiness engine (#515). Internal and gated on
 * DEV_TOOLS_ENABLED; nothing in the app reads it.
 *
 *   bunx convex run compounding/dev:steadiness '{"profileId":"…"}'
 *
 * Pass `now` (ms) to replay an earlier day, e.g. a week ago for trend.
 */
import { v } from "convex/values";
import { internalQuery } from "../_generated/server";
import { assertDevToolsEnabled } from "../devTools";
import { DOMAINS } from "../lib/understandingVocab";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";

const domainV = v.union(...DOMAINS.map((d) => v.literal(d)));
const readingV = v.object({
	at: v.number(),
	domain: domainV,
	source: v.union(
		v.literal("session"),
		v.literal("mood"),
		v.literal("follow_up")
	),
	value: v.number(),
	weight: v.number(),
});

export const steadiness = internalQuery({
	args: { now: v.optional(v.number()), profileId: v.id("emotional_profiles") },
	handler: async (ctx, args) => {
		assertDevToolsEnabled();
		const { readings, timezone, unlocked } = await loadReadings(
			ctx,
			args.profileId
		);
		return {
			timezone,
			...computeSteadiness(readings, {
				now: args.now ?? Date.now(),
				timezone,
				unlocked,
			}),
		};
	},
	returns: v.object({
		domains: v.array(
			v.object({
				baseline: v.union(v.number(), v.null()),
				domain: domainV,
				evidenceWeight: v.number(),
				lastReadingAt: v.number(),
				quiet: v.boolean(),
				raw: v.object({ baseline: v.number(), steadiness: v.number() }),
				readings: v.array(readingV),
				sessionDays: v.number(),
				state: v.union(
					v.literal("warming"),
					v.literal("unlocked"),
					v.literal("settled")
				),
				steadiness: v.union(v.number(), v.null()),
			})
		),
		overall: v.union(v.number(), v.null()),
		timezone: v.string(),
	}),
});
