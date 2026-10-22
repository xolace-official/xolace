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
import {
	DOMAIN_LABELS,
	type Domain,
	domainOf,
	emotionFamily,
	LIFE_AREA_HOME,
	type ThematicTag,
} from "../lib/understandingVocab";
import { domainValidator, postSessionMoodValidator } from "../lib/validators";
import type { FactSession } from "./insightFacts";
import { loadReadings } from "./readings";
import { computeSteadiness, UNLOCK_DAYS } from "./steadiness";
import { compoundingFor } from "./stretches";
import { trendFor } from "./trend";

// ponytail: the newest 60 sessions (months for most people). Past that, only search_episodic_memory reaches.
const SESSIONS = 60;
/** Enough of a session to find its neighbours by. */
const QUERY_CHARS = 1500;

/** What each post-mirror path meant, in words the model can use. */
const PATH_WORDS: Record<NonNullable<Doc<"sessions">["pathChosen"]>, string> = {
	exit: "just needed to say it, and left",
	peers: "read how others put the same thing",
	solo: "stayed with it a while (Sit with this)",
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
			day: "numeric",
			hour: "numeric",
			hourCycle: "h23",
			month: "short",
			timeZone: tz,
			weekday: "short",
			year: "numeric",
		}).formatToParts(new Date(at));
		const get = (type: string) =>
			parts.find((p) => p.type === type)?.value ?? "";
		const hour = Number(get("hour"));
		const part =
			hour < 5
				? "late night"
				: hour < 12
					? "morning"
					: hour < 17
						? "afternoon"
						: hour < 22
							? "evening"
							: "late night";
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
	handler: async (ctx, { emotionalProfileId }) => {
		const profile = await ctx.db.get("emotional_profiles", emotionalProfileId);
		if (!profile || profile.dataWipeInProgress === true) {
			return false;
		}
		const prefs = await ctx.db
			.query("preferences")
			.withIndex("by_profile", (q) =>
				q.eq("emotionalProfileId", emotionalProfileId)
			)
			.unique();
		if (prefs?.personalMemoryEnabled === false) {
			return false;
		}
		return await hasPremium(ctx, profile);
	},
	returns: v.boolean(),
});

const nullableString = v.union(v.string(), v.null());
const moodAfterV = v.union(postSessionMoodValidator, v.null());

const domainSteadinessValidator = v.object({
	domains: v.array(
		v.object({
			compounding: v.union(
				v.object({
					linkedOnsetOrder: v.array(v.string()),
					returning: v.boolean(),
					since: v.string(),
					state: v.union(v.literal("compounding"), v.literal("easing")),
				}),
				v.null()
			),
			domain: domainValidator,
			label: v.string(),
			quietSince: nullableString,
			/** Warming only: session days still needed before it unlocks. */
			sessionDaysToUnlock: v.union(v.number(), v.null()),
			/** Warming: too few session days to show a score, so write_insight refuses it as a named part of life. */
			state: v.union(
				v.literal("warming"),
				v.literal("unlocked"),
				v.literal("settled")
			),
			steadiness: v.number(),
			usual: v.number(),
			weekTrend: v.union(v.number(), v.null()),
		})
	),
	raw: v.array(
		v.object({
			alsoAbout: v.array(v.string()),
			at: v.number(),
			checkIn: nullableString,
			domains: v.array(domainValidator),
			good: v.boolean(),
			id: v.string(),
			intensity: v.number(),
			moodAfter: nullableString,
			text: nullableString,
			theirWords: v.array(v.string()),
		})
	),
	sessions: v.array(
		v.object({
			alsoAbout: v.array(v.string()),
			checkIn: v.union(
				v.object({
					answer: v.string(),
					heavierChoice: nullableString,
					whatHelped: nullableString,
				}),
				v.null()
			),
			chose: nullableString,
			domains: v.array(domainValidator),
			emotion: v.string(),
			id: v.id("sessions"),
			intensity: v.number(),
			moodAfter: moodAfterV,
			theirWords: v.array(v.string()),
			when: v.string(),
		})
	),
	timezone: v.string(),
	today: v.string(),
});

/** The get_domain_steadiness tool. */
export const domainSteadiness = internalQuery({
	args: { emotionalProfileId: v.id("emotional_profiles") },
	handler: async (ctx, { emotionalProfileId: profileId }) => {
		const now = Date.now();
		const loaded = await loadReadings(ctx, profileId);
		const { readings, timezone, unlocked } = loaded;
		const trend = trendFor(readings, { now, timezone, unlocked });
		const live = new Map(
			(await compoundingFor(ctx, profileId, { loaded, now })).map((c) => [
				c.domain,
				c,
			])
		);

		const domains = computeSteadiness(readings, {
			now,
			timezone,
			unlocked,
		}).domains.map((d) => {
			const c = live.get(d.domain);
			return {
				compounding: c
					? {
							// In the order they started slipping, this one included.
							linkedOnsetOrder: [
								...c.coDomains.map((o) => ({
									at: o.firstBelowAt,
									domain: o.domain,
								})),
								{ at: c.startedAt, domain: c.domain },
							]
								.sort((a, b) => a.at - b.at)
								.map((o) => `${o.domain} (${when(o.at, timezone)})`),
							returning: c.returning,
							since: when(c.startedAt, timezone),
							state: c.state,
						}
					: null,
				domain: d.domain,
				label: DOMAIN_LABELS[d.domain],
				quietSince: d.quiet ? when(d.lastReadingAt, timezone) : null,
				sessionDaysToUnlock:
					d.state === "warming"
						? Math.max(1, UNLOCK_DAYS - d.sessionDays)
						: null,
				state: d.state,
				steadiness: Math.round(d.raw.steadiness),
				usual: Math.round(d.raw.baseline),
				weekTrend: trend.domains.get(d.domain) ?? null,
			};
		});

		return {
			domains,
			timezone,
			today: when(now, timezone),
			...(await citableSessions(ctx, profileId, timezone)),
		};
	},
	returns: domainSteadinessValidator,
});

async function citableSessions(
	ctx: QueryCtx,
	profileId: Id<"emotional_profiles">,
	timezone: string
) {
	const metas = await ctx.db
		.query("emotional_metadata")
		.withIndex("by_profile_createdAt", (q) =>
			q.eq("emotionalProfileId", profileId)
		)
		.order("desc")
		.take(SESSIONS);
	const sessions = [];
	const raw: FactSession[] = [];
	for (const m of metas) {
		const s = await ctx.db.get("sessions", m.sessionId);
		const domains = domainsOf(m.thematicTags);
		if (!s || s.kept === false || domains.length === 0) {
			continue;
		}
		const crisis = isCrisis(s, m);
		const followUp = await readFollowUp(ctx, s._id);
		const alsoAbout = m.thematicTags.filter(
			(t) => LIFE_AREA_HOME[t as ThematicTag] === "texture"
		);
		sessions.push({
			alsoAbout,
			checkIn: crisis ? null : followUp,
			chose: s.pathChosen ? PATH_WORDS[s.pathChosen] : null,
			domains,
			emotion: m.granularLabel ?? m.primaryEmotion,
			id: s._id,
			intensity: m.intensity,
			moodAfter: s.postSessionMood ?? null,
			theirWords: crisis ? [] : m.userLanguageTags,
			when: when(s.createdAt, timezone),
		});
		const family = emotionFamily(m.primaryEmotion);
		raw.push({
			alsoAbout,
			at: s.createdAt,
			checkIn: followUp?.answer ?? null,
			domains,
			good: family.includes("joy") || family.includes("love"),
			id: s._id,
			intensity: m.intensity,
			moodAfter: s.postSessionMood ?? null,
			text: crisis
				? null
				: (s.distilledText ?? s.rawInput ?? "").slice(0, QUERY_CHARS) || null,
			theirWords: crisis ? [] : m.userLanguageTags,
		});
	}
	return { raw, sessions };
}
