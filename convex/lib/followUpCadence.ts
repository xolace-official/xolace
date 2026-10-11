import { freeEmotionFamily } from "./understandingVocab";
/**
 * Pure follow-up tiering + gating helpers.
 *
 * No Convex imports — every function here is a deterministic pure function so
 * it can be unit-tested with Vitest and (critically for the durable
 * Workflow) replayed without side effects. The cadence durations are passed to
 * `workflow.start` as args, never read as in-body constants, so cadence tuning
 * never reshapes the workflow function (deterministic journal replay).
 */

export type FollowUpTier = "acute" | "elevated" | "standard";

export type Cadence = {
  tier: FollowUpTier;
  /** Delay from workflow start to the first check-in / nudge #1. */
  stage1Ms: number;
  /** Additional delay after stage 1 to nudge #2. */
  stage2Ms: number;
  /** Additional delay after stage 2 before the card expires. */
  expiryMs: number;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Tier order for weight-aware supersede. Higher number = heavier session.
 * A new session may only supersede an active follow-up when its tier weight
 * is >= the active tier (Acute > Elevated > Standard).
 */
const TIER_WEIGHT: Record<FollowUpTier, number> = {
  acute: 3,
  elevated: 2,
  standard: 1,
};

/** Emotions that count as grief/shame for the Elevated intensity>=7 rule. */
const GRIEF_SHAME = new Set([
  "grief",
  "shame",
  "guilt",
  "sadness",
  "loss",
  "bereavement",
  "heartbreak",
]);

export type CadenceSignals = {
  safeguardLevel?: "none" | "gentle" | "elevated" | "crisis" | null;
  intensity?: number | null;
  primaryEmotion?: string | null;
  granularLabel?: string | null;
  confirmationState?: string | null;
};

/**
 * Map a session's weight signals to a follow-up tier.
 * - Acute:    safeguard crisis
 * - Elevated: safeguard elevated, OR grief/shame intensity >= 7, OR gave_up
 * - Standard: everything else that earned a follow-up (classifier flag, low intensity)
 *
 * @deprecated the `gave_up` clause only (remove-after: app >= 1.10.0) — the
 * function stays.
 */
export function followUpTier(signals: CadenceSignals): FollowUpTier {
  if (signals.safeguardLevel === "crisis") return "acute";

  const intensity = signals.intensity ?? 0;
  const emotionWords = [signals.primaryEmotion, signals.granularLabel]
    .filter((w): w is string => typeof w === "string" && w.length > 0);
  const isGriefShame = emotionWords.some((w) => freeEmotionFamily(w).some((e) => GRIEF_SHAME.has(e)));

  if (
    signals.safeguardLevel === "elevated" ||
    (isGriefShame && intensity >= 7) ||
    // DEPRECATED(remove-after: app >= 1.10.0): only pre-#176 clients write gave_up at
    // the cap; new clients reach it only on the isMaxRefinementError race path.
    // No holding/gapNamed equivalent by ruling (doc §8) — a holding session is a
    // completed one, and terseness is not distress.
    signals.confirmationState === "gave_up"
  ) {
    return "elevated";
  }

  return "standard";
}

const CADENCE_BY_TIER: Record<FollowUpTier, Omit<Cadence, "tier">> = {
  // Fast, warm presence check; short window — a 24h gap reads as abandonment.
  acute: { stage1Ms: 45 * MINUTE, stage2Ms: 4 * HOUR, expiryMs: 48 * HOUR },
  elevated: { stage1Ms: 12 * HOUR, stage2Ms: 1 * DAY, expiryMs: 7 * DAY },
  standard: { stage1Ms: 24 * HOUR, stage2Ms: 3 * DAY, expiryMs: 14 * DAY },
};

/** Full cadence (tier + the three durations) for a session. */
export function followUpCadence(signals: CadenceSignals): Cadence {
  const tier = followUpTier(signals);
  return { tier, ...CADENCE_BY_TIER[tier] };
}

/**
 * Should a NEW session (newTier) supersede an active follow-up (activeTier)?
 * Only when the new session's weight is equal or higher. A casual Standard
 * session must never cancel an active Acute crisis check-in.
 */
export function shouldSupersede(
  newTier: FollowUpTier,
  activeTier: FollowUpTier,
): boolean {
  return TIER_WEIGHT[newTier] >= TIER_WEIGHT[activeTier];
}

// =============================================================
// Final follow-up gate (computed at session completion)
// =============================================================

/**
 * The final requiresFollowUp value. The stored flag is the preliminary AI +
 * escalation flag from deliverMirror; gave_up is only known after the clarify
 * loop; escalationTriggered is a belt-and-braces redundancy.
 *
 * @deprecated the `gave_up` clause only (remove-after: app >= 1.10.0) — the
 * function stays.
 */
export function computeRequiresFollowUp(args: {
  storedFlag?: boolean | null;
  confirmationState?: string | null;
  escalationTriggered?: boolean | null;
}): boolean {
  return (
    args.storedFlag === true ||
    // DEPRECATED(remove-after: app >= 1.10.0): only pre-#176 clients write gave_up at
    // the cap; new clients reach it only on the isMaxRefinementError race path.
    // No holding/gapNamed equivalent by ruling (doc §8) — a holding session earns a
    // check-in only through the ordinary signals.
    args.confirmationState === "gave_up" ||
    args.escalationTriggered === true
  );
}

/**
 * The abandon-path gate (IRON rule). An abandoned session earns a follow-up
 * ONLY when escalation fired at the mirror (escalation-then-abandon). It must
 * NOT honour the AI/classifier flag — a plain abandon, even one the classifier
 * flagged at mirror delivery, never starts a check-in. This is deliberately
 * stricter than `computeRequiresFollowUp` (the completion gate).
 */
export function abandonRequiresFollowUp(args: {
  escalationTriggered?: boolean | null;
}): boolean {
  return args.escalationTriggered === true;
}

// =============================================================
// Return-event gap guard
// =============================================================

/**
 * Per-tier return-gap guard. Each tier's gap sits below its stage1 nudge so the
 * in-app check-in card can surface as soon as the first push lands — most
 * importantly for acute (gap < 45min stage1) — while longer tiers keep a
 * next-day guard so a return never resolves in the same sitting.
 */
const MIN_RETURN_GAP_MS_BY_TIER: Record<FollowUpTier, number> = {
  acute: 30 * MINUTE, // below the 45min stage1 push
  elevated: 8 * HOUR,
  standard: 8 * HOUR,
};

// QA-only override: force a short gap for every tier so the check-in card
// surfaces within a minute during manual testing. MUST be null in shipped
// builds — otherwise every tier's return-gap collapses and the card surfaces
// in the same sitting as the session that created it.
const TEST_RETURN_GAP_OVERRIDE_MS: number | null = null;

/**
 * The minimum time since card creation before a reopen may surface the card,
 * for the given tier. Honours the test override when set.
 */
export function minReturnGapForTier(tier: FollowUpTier): number {
  return TEST_RETURN_GAP_OVERRIDE_MS ?? MIN_RETURN_GAP_MS_BY_TIER[tier];
}

/**
 * How long after a card was last shown before an *unresolved* `shown` card may
 * re-surface on a later app open. A user often backgrounds mid-check-in
 * (stepped away, took a call) — we still want to catch them next time, just not
 * on every single launch. Within this window the home stays quiet.
 */
export const RESHOW_COOLDOWN_MS = 2 * HOUR;

/**
 * Should an unresolved `shown` card re-surface now? Only once the re-show
 * cooldown has elapsed since it was last shown. A card with no `shownAt` (never
 * actually rendered) is not eligible here.
 */
export function shouldReshowShownCard(args: {
  shownAt: number | null | undefined;
  now: number;
}): boolean {
  if (args.shownAt == null) return false;
  return args.now - args.shownAt >= RESHOW_COOLDOWN_MS;
}

/**
 * Should a reopen surface this card? Only for a still-pending card, and only
 * once enough time has passed since the card was created (≈ session completion
 * time). This stops the card from resolving while the user is still in the app
 * that created the workflow. `minGapMs` is the tier's gap (see
 * `minReturnGapForTier`).
 */
export function shouldEmitReturn(args: {
  cardStatus: string;
  cardCreatedAt: number;
  now: number;
  minGapMs: number;
}): boolean {
  if (args.cardStatus !== "pending") return false;
  return args.now - args.cardCreatedAt >= args.minGapMs;
}
