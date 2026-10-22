/**
 * The one place that decides whether a proactive Xolace+ offer fires, for which
 * moment, and with which copy variant.
 *
 * Pure by design — plain data in, decision out, no db/ctx — so the rules that
 * matter (a safeguard flow is never monetized; a "no" is honored) are testable
 * without a renderer and cannot drift between the five call sites that will
 * eventually read this. Cadence numbers come from #220 §3.
 */

/** The five ranked proactive moments (#220 §5). */
export type PlusOfferMoment = 1 | 2 | 3 | 4 | 5;


/** The three physical places the app may speak first. */
export type PlusOfferSurface =
  | "session_close"
  | "mirror_landed"
  | "profile_insight";

/** Which pitch the card speaks. `register` is a copy swap, never a trigger. */
export type PlusOfferVariant = "default" | "register";

/** A dismissal buys this surface a week of silence. */
export const PLUS_OFFER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
/** Three dismissals stop every proactive surface for a month. */
export const PLUS_OFFER_FULL_STOP_MS = 30 * 24 * 60 * 60 * 1000;
export const PLUS_OFFER_DISMISSAL_LIMIT = 3;

export type PlusOfferDecision =
  | {
      show: false;
      reason:
        | "safeguard"
        | "full_stop"
        | "session_cap"
        | "back_to_back"
        | "cooldown"
        | "no_candidate";
    }
  /** `moment` is null for a user-initiated surface — those have no moment id. */
  | { show: true; moment: PlusOfferMoment | null; variant: PlusOfferVariant };

export type PlusOfferInput = {
  /** Moments eligible this instant, most-preferred first. Empty for reactive surfaces. */
  candidates?: PlusOfferMoment[];
  /** An active safeguard/escalation flow. Hard veto, checked first (#220 rule 4). */
  safeguardActive: boolean;
  /** They tapped the locked thing themselves — never rate-limited (#220 rule 5). */
  userInitiated?: boolean;
  /** The surface asking. Cooldown is keyed by it, not by moment. */
  surface: PlusOfferSurface;
  /** Per-surface last-dismissed epoch ms. */
  lastDismissedAt?: Partial<Record<PlusOfferSurface, number>>;
  /** Lifetime proactive dismissals across all surfaces. */
  dismissalCount?: number;
  /** When the 30-day full stop started. */
  fullStopSince?: number | null;
  shownThisSession?: boolean;
  shownLastSession?: boolean;
  /** This user complained about how the mirror speaks. Swaps copy only. */
  registerComplaint?: boolean;
  now: number;
};

export function choosePlusOffer({
  candidates = [],
  surface,
  safeguardActive,
  userInitiated = false,
  lastDismissedAt = {},
  dismissalCount = 0,
  fullStopSince = null,
  shownThisSession = false,
  shownLastSession = false,
  registerComplaint = false,
  now,
}: PlusOfferInput): PlusOfferDecision {
  // First and unconditional. The moment where escalation is genuinely
  // happening is the one moment the app is forbidden to sell in.
  if (safeguardActive) return { show: false, reason: "safeguard" };

  const variant: PlusOfferVariant = registerComplaint ? "register" : "default";

  // They asked. Cadence, cooldown and the full stop all govern offers the app
  // makes unprompted — none of them apply to a door the user opened.
  if (userInitiated) return { show: true, moment: null, variant };

  const stopped =
    dismissalCount >= PLUS_OFFER_DISMISSAL_LIMIT &&
    fullStopSince !== null &&
    now - fullStopSince < PLUS_OFFER_FULL_STOP_MS;
  if (stopped) return { show: false, reason: "full_stop" };

  if (shownThisSession) return { show: false, reason: "session_cap" };
  if (shownLastSession) return { show: false, reason: "back_to_back" };

  if (candidates.length === 0) return { show: false, reason: "no_candidate" };

  // Keyed by surface, not by moment: a "no" here is a no to this place, and
  // rotating to the next-ranked moment in the same slot would be the same ask
  // wearing a different hat.
  const dismissedAt = lastDismissedAt[surface];
  if (dismissedAt !== undefined && now - dismissedAt < PLUS_OFFER_COOLDOWN_MS) {
    return { show: false, reason: "cooldown" };
  }

  return { show: true, moment: candidates[0], variant };
}

/**
 * Which moments can even be raised at a given surface, in rank order.
 *
 * Moments 1/4/5 all land in the session-end slot, so they compete there and
 * nowhere else; 2 fires mid-session and 3 on the profile. Kept here rather
 * than at the call sites so "which moment belongs where" is one table instead
 * of three conditionals that can drift apart.
 */
const SURFACE_MOMENTS: Record<PlusOfferSurface, PlusOfferMoment[]> = {
  session_close: [1, 4, 5],
  mirror_landed: [2],
  profile_insight: [3],
};

/**
 * Narrows a surface's moments to the ones whose data condition actually holds,
 * preserving the #220 §5 ranking. Separate from `choosePlusOffer` because this
 * answers "what is true right now" and that answers "may we speak" — the
 * cadence rules must not be re-derivable from a call site's own conditions.
 */
export function plusOfferCandidates(
  surface: PlusOfferSurface,
  conditionMet: Partial<Record<PlusOfferMoment, boolean>>,
): PlusOfferMoment[] {
  return SURFACE_MOMENTS[surface].filter((m) => conditionMet[m] === true);
}

/**
 * The surface a moment belongs to. Every moment lives at exactly one surface,
 * so the card can name its own cooldown bucket without every call site
 * threading a surface prop that the table above already knows.
 */
export function plusOfferSurfaceForMoment(
  moment: PlusOfferMoment,
): PlusOfferSurface {
  return (Object.keys(SURFACE_MOMENTS) as PlusOfferSurface[]).find((s) =>
    SURFACE_MOMENTS[s].includes(moment),
  )!;
}
