/**
 * What the Reflection Agent gets to write steadiness insights from (#525,
 * #526): the counted facts per domain (score, usual, trend, compounding with
 * the linked domains in onset order) and the citable sessions behind them,
 * each with when it happened in the person's own week, their words, what they
 * chose and how it sat afterwards. `raw` feeds insightFacts (the action adds
 * the RAG half). Code finds the facts; the model only notices what they mean
 * (ADR 0019). Burned sessions are never listed, so they can't be cited; a
 * crisis session gives its metadata only, and still counts toward every
 * pattern.
 */
import { v } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import { internalQuery, type QueryCtx } from "../_generated/server";
import { readFollowUp } from "../ai/reflectionAgent/toolQueries";
import { hasPremium } from "../lib/premium";
import { domainValidator, postSessionMoodValidator } from "../lib/validators";
import { DOMAIN_LABELS, LIFE_AREA_HOME, domainOf, emotionFamily, type Domain, type ThematicTag } from "../lib/understandingVocab";
import type { FactSession } from "./insightFacts";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";
import { compoundingFor } from "./stretches";
import { trendFor } from "./trend";

// ponytail: the newest 60 sessions (months for most people). Past that, only search_episodic_memory reaches.
const SESSIONS = 60;
/** Enough of a session to find its neighbours by. */
const QUERY_CHARS = 1500;

/** What each post-mirror path meant, in words the model can use. */
const PATH_WORDS: Record<NonNullable<Doc<"sessions">["pathChosen"]>, string> = {
  solo: "stayed with it a while (Sit with this)",
  peers: "read how others put the same thing",
  exit: "just needed to say it, and left",
};

export const domainsOf = (tags: string[]) => [
  ...new Set(tags.map(domainOf).filter((d): d is Domain => d !== null)),
];

const isCrisis = (s: Doc<"sessions">, m: Doc<"emotional_metadata">) =>
  s.safeguardLevel === "crisis" || m.safeguardLevel === "crisis";

/** "Sun 7 Sep 2026, evening" in their timezone: the raw material for recurring shapes. */
export function when(at: number, timeZone: string) {
  const fmt = (tz: string) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz, weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "numeric", hourCycle: "h23",
    }).formatToParts(new Date(at));
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const hour = Number(get("hour"));
    const part = hour < 5 ? "late night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "late night";
    return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}, ${part}`;
  };
  try {
    return fmt(timeZone);
  } catch {
    return fmt("UTC");
  }
}

/** Xolace+ with personal memory on: the only people the insight pass runs for. */
export const insightsEnabled = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: v.boolean(),
  handler: async (ctx, { emotionalProfileId }) => {
    const profile = await ctx.db.get("emotional_profiles", emotionalProfileId);
    if (!profile || profile.dataWipeInProgress === true) return false;
    const prefs = await ctx.db
      .query("preferences")
      .withIndex("by_profile", (q) => q.eq("emotionalProfileId", emotionalProfileId))
      .unique();
    if (prefs?.personalMemoryEnabled === false) return false;
    return await hasPremium(ctx, profile);
  },
});

const nullableString = v.union(v.string(), v.null());
const moodAfterV = v.union(postSessionMoodValidator, v.null());

const domainSteadinessValidator = v.object({
  today: v.string(),
  timezone: v.string(),
  domains: v.array(
    v.object({
      domain: domainValidator,
      label: v.string(),
      steadiness: v.number(),
      usual: v.number(),
      weekTrend: v.union(v.number(), v.null()),
      quietSince: nullableString,
      compounding: v.union(
        v.object({
          state: v.union(v.literal("compounding"), v.literal("easing")),
          since: v.string(),
          returning: v.boolean(),
          linkedOnsetOrder: v.array(v.string()),
        }),
        v.null(),
      ),
    }),
  ),
  sessions: v.array(
    v.object({
      id: v.id("sessions"),
      when: v.string(),
      domains: v.array(domainValidator),
      alsoAbout: v.array(v.string()),
      emotion: v.string(),
      intensity: v.number(),
      theirWords: v.array(v.string()),
      chose: nullableString,
      moodAfter: moodAfterV,
      checkIn: v.union(
        v.object({ answer: v.string(), whatHelped: nullableString, heavierChoice: nullableString }),
        v.null(),
      ),
    }),
  ),
  raw: v.array(
    v.object({
      id: v.string(),
      at: v.number(),
      domains: v.array(domainValidator),
      intensity: v.number(),
      good: v.boolean(),
      moodAfter: nullableString,
      checkIn: nullableString,
      alsoAbout: v.array(v.string()),
      theirWords: v.array(v.string()),
      text: nullableString,
    }),
  ),
});

/** The get_domain_steadiness tool. */
export const domainSteadiness = internalQuery({
  args: { emotionalProfileId: v.id("emotional_profiles") },
  returns: domainSteadinessValidator,
  handler: async (ctx, { emotionalProfileId: profileId }) => {
    const now = Date.now();
    const loaded = await loadReadings(ctx, profileId);
    const { readings, timezone, unlocked } = loaded;
    const trend = trendFor(readings, { now, timezone, unlocked });
    const live = new Map((await compoundingFor(ctx, profileId, { now, loaded })).map((c) => [c.domain, c]));

    const domains = computeSteadiness(readings, { now, timezone, unlocked }).domains.map((d) => {
      const c = live.get(d.domain);
      return {
        domain: d.domain,
        label: DOMAIN_LABELS[d.domain],
        steadiness: Math.round(d.raw.steadiness),
        usual: Math.round(d.raw.baseline),
        weekTrend: trend.domains.get(d.domain) ?? null,
        quietSince: d.quiet ? when(d.lastReadingAt, timezone) : null,
        compounding: c
          ? {
              state: c.state,
              since: when(c.startedAt, timezone),
              returning: c.returning,
              // In the order they started slipping, this one included.
              linkedOnsetOrder: [...c.coDomains.map((o) => ({ domain: o.domain, at: o.firstBelowAt })), { domain: c.domain, at: c.startedAt }]
                .sort((a, b) => a.at - b.at)
                .map((o) => `${o.domain} (${when(o.at, timezone)})`),
            }
          : null,
      };
    });

    return { today: when(now, timezone), timezone, domains, ...(await citableSessions(ctx, profileId, timezone)) };
  },
});

async function citableSessions(ctx: QueryCtx, profileId: Id<"emotional_profiles">, timezone: string) {
  const metas = await ctx.db
    .query("emotional_metadata")
    .withIndex("by_profile_createdAt", (q) => q.eq("emotionalProfileId", profileId))
    .order("desc")
    .take(SESSIONS);
  const sessions = [];
  const raw: FactSession[] = [];
  for (const m of metas) {
    const s = await ctx.db.get("sessions", m.sessionId);
    const domains = domainsOf(m.thematicTags);
    if (!s || s.kept === false || domains.length === 0) continue;
    const crisis = isCrisis(s, m);
    const followUp = await readFollowUp(ctx, s._id);
    const alsoAbout = m.thematicTags.filter((t) => LIFE_AREA_HOME[t as ThematicTag] === "texture");
    sessions.push({
      id: s._id,
      when: when(s.createdAt, timezone),
      domains,
      alsoAbout,
      emotion: m.granularLabel ?? m.primaryEmotion,
      intensity: m.intensity,
      theirWords: crisis ? [] : m.userLanguageTags,
      chose: s.pathChosen ? PATH_WORDS[s.pathChosen] : null,
      moodAfter: s.postSessionMood ?? null,
      checkIn: crisis ? null : followUp,
    });
    const family = emotionFamily(m.primaryEmotion);
    raw.push({
      id: s._id,
      at: s.createdAt,
      domains,
      intensity: m.intensity,
      good: family.includes("joy") || family.includes("love"),
      moodAfter: s.postSessionMood ?? null,
      checkIn: followUp?.answer ?? null,
      alsoAbout,
      theirWords: crisis ? [] : m.userLanguageTags,
      text: crisis ? null : (s.distilledText ?? s.rawInput ?? "").slice(0, QUERY_CHARS) || null,
    });
  }
  return { sessions, raw };
}
