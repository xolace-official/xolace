/**
 * Compounding stretches (#519): stored rows (ADR 0020) judged live by the
 * rules in detect.ts (#489).
 *
 * Every mutation that writes a reading (session completion, the mood check,
 * a follow-up answer) schedules `evaluate` right after it, in its own
 * transaction (#529): a heavy history or a bad reading can fail the
 * evaluation, never the person's session, mood or answer. A session
 * reading also stamps any domain it unlocks (unlocks.ts). compoundingFor
 * is the pure read every consumer shares (#492).
 *
 * Neither reads nor writes safeguard state (riskFlag, safeguardLevel,
 * escalation), and safeguard never reads this: separate axes, no cross-feed.
 */
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internal } from "../_generated/api";
import { internalMutation, type MutationCtx, type QueryCtx } from "../_generated/server";
import { domainOf, type Domain } from "../lib/understandingVocab";
import { judgeOpen, opens, sharedSessions, shareTrend } from "./detect";
import { loadReadings } from "./readings";
import { computeSteadiness } from "./steadiness";
import { recordUnlock } from "./unlocks";

const RETURNING_MS = 30 * 86_400_000;
const LINK_MIN_SESSIONS = 2;

export type Compounding = {
  domain: Domain;
  state: "compounding" | "easing";
  /** Points below the (anchored) baseline. */
  gap: number;
  /** The usual it's judged against: the anchor for 90 days, then the live baseline. */
  baseline: number;
  band: number;
  /** Started within 30 days of this domain's previous stretch ending. */
  returning: boolean;
  /** 21-day share of sessions minus 90-day share; ranking only. */
  shareTrend: number;
  /** domain:startedAt — stable for the life of the stretch. */
  stretchId: string;
  startedAt: number;
  /** This stretch's one compounding follow-up has started (#522). */
  followUpUsed: boolean;
  /** This stretch's one free-user upsell has shown (#524). */
  upsellShown: boolean;
  /** Linked domains, in the order their stretches started. */
  coDomains: { domain: Domain; firstBelowAt: number }[];
};

/** This domain's newest stretch and the one before it. */
const newestStretches = (ctx: QueryCtx, profileId: Id<"emotional_profiles">, domain: Domain) =>
  ctx.db
    .query("compounding_stretches")
    .withIndex("by_emotionalProfileId_and_domain_and_startedAt", (q) =>
      q.eq("emotionalProfileId", profileId).eq("domain", domain),
    )
    .order("desc")
    .take(2);

/**
 * Close what has ended and open what the landing session tipped in. Pass
 * `sessionId` only for a session reading: self-reports can close a stretch,
 * never open one. Idempotent: a second run in the same moment changes nothing.
 */
export async function evaluateCompounding(
  ctx: MutationCtx,
  profileId: Id<"emotional_profiles">,
  { sessionId }: { sessionId?: Id<"sessions"> } = {},
): Promise<void> {
  const now = Date.now();
  const opening = new Set<Domain>();
  if (sessionId) {
    const meta = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .unique();
    for (const tag of meta?.thematicTags ?? []) {
      const domain = domainOf(tag);
      if (domain) opening.add(domain);
    }
  }

  const loaded = await loadReadings(ctx, profileId);
  const { readings, timezone, unlocked } = loaded;
  const clock = { now, timezone, unlocked };
  // The same reading may unlock a domain (#523).
  const session = sessionId && (await ctx.db.get("sessions", sessionId));
  if (session) await recordUnlock(ctx, session, loaded);
  for (const d of computeSteadiness(readings, clock).domains) {
    const [newest] = await newestStretches(ctx, profileId, d.domain);
    if (newest && newest.endedAt === undefined) {
      const judged = judgeOpen(d, newest, clock);
      if (!("ended" in judged)) continue;
      await ctx.db.patch("compounding_stretches", newest._id, { endedAt: judged.endedAt });
      // Back to the usual just now: hysteresis says it can't reopen in the same breath.
      if (judged.ended === "usual") continue;
    }
    if (opening.has(d.domain) && opens(d, clock)) {
      await ctx.db.insert("compounding_stretches", {
        emotionalProfileId: profileId,
        domain: d.domain,
        startedAt: now,
        anchorBaseline: d.raw.baseline,
      });
    }
  }
}

/**
 * The evaluation in its own transaction, scheduled by each reading's
 * mutation. `startFollowUp`: the completed session's follow-up starts from
 * here, after its reading has opened any stretch, so the compounding trigger
 * (#522) can't look before the stretch exists.
 */
export const evaluate = internalMutation({
  args: {
    profileId: v.id("emotional_profiles"),
    sessionId: v.optional(v.id("sessions")),
    startFollowUp: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, { profileId, sessionId, startFollowUp }) => {
    await evaluateCompounding(ctx, profileId, { sessionId });
    if (startFollowUp && sessionId) {
      await ctx.scheduler.runAfter(0, internal.followUps.startFollowUpWorkflow, { sessionId });
    }
    return null;
  },
});

/**
 * Every domain compounding or easing right now, ranked by gap then share
 * trend (#489). Rows plus live readings, nothing written: a quiet or released
 * stretch reads as ended here before any evaluation writes it. For everyone;
 * gating Xolace+ is each consumer's job (#496).
 */
export async function compoundingFor(
  ctx: QueryCtx,
  profileId: Id<"emotional_profiles">,
  { now = Date.now(), loaded }: { now?: number; loaded?: Awaited<ReturnType<typeof loadReadings>> } = {},
): Promise<Compounding[]> {
  const { readings, timezone, unlocked } = loaded ?? (await loadReadings(ctx, profileId));
  const live: Omit<Compounding, "coDomains">[] = [];
  for (const d of computeSteadiness(readings, { now, timezone, unlocked }).domains) {
    const [row, previous] = await newestStretches(ctx, profileId, d.domain);
    if (!row || row.endedAt !== undefined) continue;
    const judged = judgeOpen(d, row, { now, timezone });
    if ("ended" in judged) continue;
    live.push({
      ...judged,
      domain: d.domain,
      returning:
        previous?.endedAt !== undefined && row.startedAt - previous.endedAt <= RETURNING_MS,
      shareTrend: shareTrend(readings, d.domain, now),
      stretchId: `${d.domain}:${row.startedAt}`,
      startedAt: row.startedAt,
      followUpUsed: row.followUpStartedAt !== undefined,
      upsellShown: row.upsellShownAt !== undefined,
    });
  }

  return live
    .sort((a, b) => b.gap - a.gap || b.shareTrend - a.shareTrend)
    .map((c) => ({
      ...c,
      coDomains: live
        .filter(
          (o) =>
            o.domain !== c.domain &&
            sharedSessions(readings, c.domain, o.domain, now) >= LINK_MIN_SESSIONS,
        )
        .map((o) => ({ domain: o.domain, firstBelowAt: o.startedAt }))
        .sort((a, b) => a.firstBelowAt - b.firstBelowAt),
    }));
}

/** One stretch, by its natural key. */
export type StretchRef = { domain: Domain; stretchStartedAt: number };

/**
 * Spend one of a stretch's once-only events: its compounding follow-up (#522),
 * in the transaction that starts the workflow, or its upsell (#524). False
 * when it was already spent (a sibling got there first) or the row is gone,
 * so the caller can stand down.
 */
export async function spendStretch(
  ctx: MutationCtx,
  profileId: Id<"emotional_profiles">,
  { domain, stretchStartedAt }: StretchRef,
  event: "followUpStartedAt" | "upsellShownAt",
): Promise<boolean> {
  const row = await ctx.db
    .query("compounding_stretches")
    .withIndex("by_emotionalProfileId_and_domain_and_startedAt", (q) =>
      q.eq("emotionalProfileId", profileId).eq("domain", domain).eq("startedAt", stretchStartedAt),
    )
    .unique();
  if (!row || row[event] !== undefined) return false;
  await ctx.db.patch("compounding_stretches", row._id, { [event]: Date.now() });
  return true;
}
