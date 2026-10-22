/**
 * The insights screen. The free view (#517) is everything a person without
 * Xolace+ may see (CONTEXT.md "Free view"): the overall steadiness and each
 * touched domain's state. Per-domain numbers, "your usual" and the trend only
 * leave through plusView (#518), which re-checks the entitlement on every read.
 * So does compounding (#520), down to the order: the free view never sorts by it,
 * and so do steadiness insights (#525).
 */
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { query, type QueryCtx } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { hasPremium } from "../lib/premium";
import { DOMAINS, domainOf, type Domain } from "../lib/understandingVocab";
import { bandOf } from "./detect";
import { loadReadings } from "./readings";
import { insightValidator, insightsFor } from "./insightStore";
import { computeSteadiness, type DomainSteadiness } from "./steadiness";
import { compoundingFor } from "./stretches";
import { trendFor } from "./trend";
import { upsellFor, upsellValidator } from "./upsell";

const domainV = v.union(...DOMAINS.map((d) => v.literal(d)));
const nullableNumber = v.union(v.number(), v.null());

const freeDomain = {
  domain: domainV,
  state: v.union(v.literal("warming"), v.literal("unlocked"), v.literal("settled")),
  /** Set once a domain is quiet: "Not recently · last seen <date>". */
  lastSeenAt: nullableNumber,
};

/** Live first, quiet next, warming last (#491). */
const rank = (d: DomainSteadiness) => (d.state === "warming" ? 2 : d.quiet ? 1 : 0);

const ordered = (domains: DomainSteadiness[]) =>
  domains.sort((a, b) => rank(a) - rank(b) || DOMAINS.indexOf(a.domain) - DOMAINS.indexOf(b.domain));

const freeFields = (d: DomainSteadiness) => ({
  domain: d.domain,
  state: d.state,
  lastSeenAt: d.quiet ? d.lastReadingAt : null,
});

/**
 * The client's clock, refreshed on a timer: a query isn't rerun as time passes,
 * so a wall-clock read would freeze the trend and quiet cutoff until the next write.
 */
const nowArg = { now: v.number() };

const round = (n: number | null) => (n === null ? null : Math.round(n));

/**
 * The active kindling: when it was lit and the domains its session touched.
 * The hand-off lands where both hold for a stretch (#520): lit during it, and
 * about it. Generation sees tonight's stretches (#521), so that means made for it.
 */
async function activeKindling(ctx: QueryCtx, profileId: Id<"emotional_profiles">) {
  const path = await ctx.db
    .query("paths")
    .withIndex("by_profile_and_status", (q) => q.eq("emotionalProfileId", profileId).eq("status", "active"))
    .first();
  if (!path) return null;
  const meta = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_session", (q) => q.eq("sessionId", path.sessionId))
    .first();
  const domains = new Set((meta?.thematicTags ?? []).map(domainOf).filter((d): d is Domain => d !== null));
  return { generatedAt: path.generatedAt, domains };
}

export const freeView = query({
  args: nowArg,
  returns: v.object({
    overall: nullableNumber,
    domains: v.array(v.object(freeDomain)),
    /** upsell.get's answer from the same readings, so Insights needn't load them twice (#524). */
    upsell: v.union(upsellValidator, v.null()),
  }),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    const loaded = await loadReadings(ctx, profile._id);
    const { readings, timezone, unlocked } = loaded;
    const { domains, overall } = computeSteadiness(readings, { now: args.now, timezone, unlocked });
    // ponytail: compoundingFor reruns computeSteadiness; pure in-memory over loaded readings, no reads.
    const upsell = await upsellFor(ctx, profile, { now: args.now, loaded });
    return { overall: round(overall), domains: ordered(domains).map(freeFields), upsell };
  },
});

/**
 * The free view plus each domain's number, "your usual" once settled, and the
 * 7-day trend (#510). Null without Xolace+, so a lapse drops back to the free
 * view; nothing is stored, so upgrading shows the full history at once.
 */
export const plusView = query({
  args: nowArg,
  returns: v.union(
    v.null(),
    v.object({
      overall: nullableNumber,
      /** Mean of per-domain deltas; null under 2 domains or in a quiet week. */
      overallTrend: nullableNumber,
      /** Set when the trend runs from a quiet domain's last reading, not 7 days ago: "since <month>". */
      overallTrendSince: nullableNumber,
      domains: v.array(
        v.object({
          ...freeDomain,
          steadiness: nullableNumber,
          baseline: nullableNumber,
          /** Null when warming 7 days ago or quiet since; 0 = "same as last week". */
          trend: nullableNumber,
          /** Set when this domain was quiet 7 days ago: its delta runs from this last reading. */
          trendSince: nullableNumber,
          compounding: v.union(v.literal("compounding"), v.literal("easing"), v.null()),
          /** Compounding, and the active kindling was lit since the stretch began, from a session that touched it. */
          kindling: v.boolean(),
        }),
      ),
      /** Steadiness insights that passed the gate and are current (#525, #526), newest first. */
      insights: v.array(insightValidator),
    }),
  ),
  handler: async (ctx, args) => {
    const { profile } = await requireAuth(ctx);
    if (!(await hasPremium(ctx, profile))) return null;
    const loaded = await loadReadings(ctx, profile._id);
    const { readings, timezone, unlocked } = loaded;
    const { now } = args;
    const { domains, overall } = computeSteadiness(readings, { now, timezone, unlocked });
    const trend = trendFor(readings, { now, timezone, unlocked });
    const live = await compoundingFor(ctx, profile._id, { now, loaded });
    // Compounding first, then easing, each by compoundingFor's rank (#491).
    const flagged = new Map(
      [...live.filter((c) => c.state === "compounding"), ...live.filter((c) => c.state === "easing")].map(
        (c, i) => [c.domain, { i, state: c.state, baseline: c.baseline, startedAt: c.startedAt }],
      ),
    );
    const at = (d: DomainSteadiness) => flagged.get(d.domain)?.i ?? flagged.size;
    const kindling = flagged.size ? await activeKindling(ctx, profile._id) : null;
    return {
      overall: round(overall),
      overallTrend: trend.overall,
      overallTrendSince: trend.overallSince,
      insights: await insightsFor(
        ctx,
        profile._id,
        new Map(domains.map((d) => [d.domain, { state: d.state, steadiness: d.raw.steadiness, band: bandOf(d, now) }])),
      ),
      domains: ordered(domains)
        .sort((a, b) => at(a) - at(b))
        .map((d) => {
          const flag = flagged.get(d.domain);
          const state = flag?.state ?? null;
          return {
            ...freeFields(d),
            steadiness: round(d.steadiness),
            // While it compounds, "your usual" is the anchor it's judged against (CONTEXT.md).
            baseline: round(flag?.baseline ?? d.baseline),
            trend: trend.domains.get(d.domain) ?? null,
            trendSince: trend.since.get(d.domain) ?? null,
            compounding: state,
            kindling:
              !!flag && !!kindling && kindling.generatedAt >= flag.startedAt && kindling.domains.has(d.domain),
          };
        }),
    };
  },
});
