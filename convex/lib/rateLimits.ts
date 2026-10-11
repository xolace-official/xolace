import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

const DAY = 24 * HOUR;

// Plus overrides — passed as an inline `config` override at the call site
// (the free-tier config below stays the registered default). Session
// initiation is deliberately NOT a fixed ratio: free is a 2/hour taste,
// Plus is the "reflect whenever you need to" promise.
export const SESSION_INITIATE_LIMITS_PLUS = {
  kind: "token bucket",
  rate: 10,
  period: HOUR,
  capacity: 5,
} as const;
export const AI_MIRROR_LIMITS_PLUS = {
  kind: "token bucket",
  rate: 16,
  period: HOUR,
  capacity: 4,
} as const;

// Trusted Bridge drafts. The bucket counts Anthropic CALLS, not drafts: the
// product promise is 1 draft/day free and 5/day Plus, each with one free
// regeneration (change the recipient, try again). A call that fails or returns
// empty is refunded, so a user never loses a draft to our error.
//
// Anything user-facing must divide by BRIDGE_CALLS_PER_DRAFT — "2 calls left"
// is one draft plus its retry, and rendering it as two drafts is a lie.
export const BRIDGE_CALLS_PER_DRAFT = 2;
export const BRIDGE_DRAFTS_FREE = 1;
export const BRIDGE_DRAFTS_PLUS = 5;

export const BRIDGE_DRAFT_LIMITS_PLUS = {
  kind: "fixed window",
  rate: BRIDGE_DRAFTS_PLUS * BRIDGE_CALLS_PER_DRAFT,
  period: DAY,
} as const;

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  // Session creation — free tier: 2/hour, burst 2. This is a product gate,
  // not just cost control: Plus widens it 5x via SESSION_INITIATE_LIMITS_PLUS
  // at the call site.
  sessionInitiate: { kind: "token bucket", rate: 2, period: HOUR, capacity: 2 },

  // AI mirror generation — main cost control
  aiMirrorRequest: { kind: "token bucket", rate: 8, period: HOUR, capacity: 2 },

  // Trusted Bridge draft generation — free tier default (1 draft + 1 retry).
  // Plus widens the same bucket via BRIDGE_DRAFT_LIMITS_PLUS at the call site.
  bridgeDraft: {
    kind: "fixed window",
    rate: BRIDGE_DRAFTS_FREE * BRIDGE_CALLS_PER_DRAFT,
    period: DAY,
  },

  // Notification spam prevention — 1 per 24 hours
  notification: { kind: "fixed window", rate: 1, period: DAY },

  // Follow-up nudge (elevated / standard tiers) — SEPARATE bucket so a
  // follow-up check-in never starves (or is starved by) gentle_return /
  // pattern_nudge. These tiers space their two nudges >=24h apart, so a
  // 1 per 24h per profile cap is the right gentle guard.
  followUpNudge: { kind: "fixed window", rate: 1, period: DAY },

  // Acute follow-up (safeguard crisis) — the presence-check workflow fires
  // TWICE inside ~5h (nudge #1 at 45m, nudge #2 ~4h later). The 1/day
  // followUpNudge cap would silently drop that second presence check, which
  // for a crisis tier reads as abandonment. Give acute its own budget sized
  // for both nudges plus a little headroom for a same-day supersede re-trigger.
  followUpAcute: { kind: "fixed window", rate: 3, period: DAY },

  // kindling_ready (docs/paths-v1.md §10) — SEPARATE bucket for the same
  // reason as followUpNudge: generation itself is already capped to one
  // kindling per profile per day (pathsGenerate), so this only needs to
  // survive the day's slot without being silently dropped by an unrelated
  // gentle_return / pattern_nudge / milestone that already spent the shared
  // `notification` bucket.
  kindlingReady: { kind: "fixed window", rate: 1, period: DAY },

  // streak_milestone (#439) — SEPARATE bucket: the action that crosses a
  // milestone is often the one a gentle_return brought back the same day, and
  // the shared bucket would swallow the milestone. Cadence caps it anyway.
  streakMilestone: { kind: "fixed window", rate: 1, period: DAY },

  // domain_unlock (#523) — at most one missed-unlock push in any 7 days
  // (a one-token bucket, so no window boundary lets two through), its own
  // bucket so a same-day nudge can't swallow it.
  domainUnlock: { kind: "token bucket", rate: 1, period: 7 * DAY, capacity: 1 },

  // Resonance toggle abuse prevention
  resonanceToggle: { kind: "token bucket", rate: 20, period: MINUTE, capacity: 5 },

  // Data wipe — once per 7 days (wipeInProgress flag handles in-flight dedup)
  dataWipe: { kind: "fixed window", rate: 1, period: 7 * DAY },

  // Reflection reports — 5 per day to prevent abuse
  reportReflection: { kind: "fixed window", rate: 5, period: DAY },

  // General settings feedback — 5 per 24h per profile
  generalFeedback: { kind: "fixed window", rate: 5, period: DAY },

  // Product feedback (shake-summoned bug/idea tray) — shake submission is
  // easy to spam, so this guard is not optional. 10 per 24h per profile.
  productFeedback: { kind: "fixed window", rate: 10, period: DAY },

  // Safety concerns — SEPARATE bucket so an abuse report is never refused
  // because the reporter spent the day sending feature ideas. The
  // productFeedback rationale does not transfer: a concern is reached from an
  // overflow menu on a specific person, not from a shake. 2/day is
  // deliberately low — genuine concerns are rare, and a low ceiling stops the
  // form being a useful mass-reporting tool. A user with trouble in two
  // threads plus one mis-send is locked out for 24h; that is why the rejection
  // points at support rather than at tomorrow.
  concernReport: { kind: "fixed window", rate: 2, period: DAY },

  // Reflection Agent light pass (Cognition Layer Phase 3) — runs ~1/session.
  // Token bucket ~12/hour, capacity 4: a pure runaway guard, generous enough
  // that a normal burst of completions never drops a trajectory refresh.
  reflectionLightPass: { kind: "token bucket", rate: 12, period: HOUR, capacity: 4 },

  // Reflection Agent consolidation pass — the deep Sonnet tool loop. This is
  // the per-user token budget (doc §3): ~4/day per profile. A global
  // pool-ceiling bucket is a noted hardening TODO.
  reflectionConsolidation: { kind: "fixed window", rate: 4, period: DAY },

  // Daily quote reply — the action calls an external moderation API before
  // any write lands, so this guards that call directly (not just the DB row).
  quoteReply: { kind: "fixed window", rate: 4, period: DAY },

  // Kindling generation (docs/paths-v1.md §2.2), Plus only. One kindling per
  // profile per day: the first qualifying session of the day generates, every
  // later session that day is a no-ship (logged `rate_limited`). A user gets
  // at most one bundle to tend before the next day brings another.
  // `KINDLING_DEV_UNLIMITED=true` on the dev deployment lifts it (same
  // shape as PREMIUM_DEV_OVERRIDE) so every test session generates.
  pathsGenerate:
    process.env.KINDLING_DEV_UNLIMITED === "true"
      ? { kind: "fixed window", rate: 1000, period: DAY }
      : { kind: "fixed window", rate: 1, period: DAY },
});
