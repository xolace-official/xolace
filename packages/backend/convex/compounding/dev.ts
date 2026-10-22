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
  domain: domainV,
  value: v.number(),
  weight: v.number(),
  at: v.number(),
  source: v.union(v.literal("session"), v.literal("mood"), v.literal("follow_up")),
});

export const steadiness = internalQuery({
  args: { profileId: v.id("emotional_profiles"), now: v.optional(v.number()) },
  returns: v.object({
    timezone: v.string(),
    overall: v.union(v.number(), v.null()),
    domains: v.array(
      v.object({
        domain: domainV,
        state: v.union(v.literal("warming"), v.literal("unlocked"), v.literal("settled")),
        steadiness: v.union(v.number(), v.null()),
        baseline: v.union(v.number(), v.null()),
        raw: v.object({ steadiness: v.number(), baseline: v.number() }),
        lastReadingAt: v.number(),
        quiet: v.boolean(),
        evidenceWeight: v.number(),
        sessionDays: v.number(),
        readings: v.array(readingV),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    assertDevToolsEnabled();
    const { readings, timezone, unlocked } = await loadReadings(ctx, args.profileId);
    return {
      timezone,
      ...computeSteadiness(readings, { now: args.now ?? Date.now(), timezone, unlocked }),
    };
  },
});
