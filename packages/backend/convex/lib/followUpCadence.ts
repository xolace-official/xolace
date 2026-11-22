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
	if (signals.safeguardLevel === "crisis") {
		return "acute";
	}

	const intensity = signals.intensity ?? 0;
	const emotionWords = [signals.primaryEmotion, signals.granularLabel].filter(
		(w): w is string => typeof w === "string" && w.length > 0
	);
	const isGriefShame = emotionWords.some((w) =>
		freeEmotionFamily(w).some((e) => GRIEF_SHAME.has(e))
	);

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
	acute: { expiryMs: 48 * HOUR, stage1Ms: 45 * MINUTE, stage2Ms: 4 * HOUR },
	elevated: { expiryMs: 7 * DAY, stage1Ms: 12 * HOUR, stage2Ms: 1 * DAY },
	standard: { expiryMs: 14 * DAY, stage1Ms: 24 * HOUR, stage2Ms: 3 * DAY },
};

const lifetimeOf = (c: Omit<Cadence, "tier">) =>
	c.stage1Ms + c.stage2Ms + c.expiryMs;

/** How long a card of this tier stays pending if the user never returns. */
export function followUpLifetimeMs(tier: FollowUpTier): number {
	return lifetimeOf(CADENCE_BY_TIER[tier]);
}

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
	activeTier: FollowUpTier
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
// Why a session did or didn't get a follow-up (internal, never shown)
// =============================================================

/**
 * The classifier's rubric lines, one code each (ai/prompts/classifier.ts).
 * "Yes" codes come with requiresFollowUp true, "no" codes with false.
 * `no_trigger` is the plain default: none of the yes lines applied.
 */
export const FOLLOW_UP_YES_CODES = [
	"grief",
	"shame_guilt",
	"relational_rupture",
	"identity_despair",
	"stuck",
] as const;

export const FOLLOW_UP_NO_CODES = [
	"discharged",
	"low_intensity",
	"future_worry",
	"positive",
	"general_stress",
	"no_trigger",
] as const;

/**
 * Every stored code. `unknown` is never offered to the model: the parser
 * writes it when the model gave no valid code, or one on the wrong side of
 * its own flag. The flag always wins; the code only explains it.
 */
export const FOLLOW_UP_REASON_CODES = [
	...FOLLOW_UP_YES_CODES,
	...FOLLOW_UP_NO_CODES,
	"unknown",
] as const;

export type FollowUpReasonCode = (typeof FOLLOW_UP_REASON_CODES)[number];

const YES_CODES: ReadonlySet<string> = new Set(FOLLOW_UP_YES_CODES);
const NO_CODES: ReadonlySet<string> = new Set(FOLLOW_UP_NO_CODES);

/** The model's code, kept only when it sits on the same side as its flag. */
export function parseFollowUpReasonCode(
	requiresFollowUp: boolean,
	raw: unknown
): FollowUpReasonCode {
	if (typeof raw !== "string") {
		return "unknown";
	}
	const code = raw.trim().toLowerCase();
	const side = requiresFollowUp ? YES_CODES : NO_CODES;
	return side.has(code) ? (code as FollowUpReasonCode) : "unknown";
}

/** The classifier's part of the follow-up read, as stored on emotional_metadata. */
export type FollowUpRead = {
	aiRequiresFollowUp?: boolean;
	followUpReason?: string;
	followUpReasonCode?: FollowUpReasonCode;
	noFollowUpReason?: string;
};

/**
 * Did the classifier ask for a follow-up? Rows written before
 * `aiRequiresFollowUp` existed only ever carried `followUpReason` on a yes.
 */
export function classifierFlaggedFollowUp(read: FollowUpRead | null): boolean {
	if (!read) {
		return false;
	}
	return read.aiRequiresFollowUp ?? read.followUpReason !== undefined;
}

/**
 * What a re-classification (clarify) writes to the follow-up read. Raise-only,
 * like the session flag: a yes replaces anything, a no never replaces a yes.
 * So the stored code always matches the classifier's side of the session's
 * flag. `undefined` values in the result delete the field when patched.
 * `followUpReason` keeps the earlier sentence when a new yes gives none.
 */
export function refinedFollowUpRead(
	existing: FollowUpRead,
	next: Required<
		Pick<FollowUpRead, "aiRequiresFollowUp" | "followUpReasonCode">
	> &
		Pick<FollowUpRead, "followUpReason" | "noFollowUpReason">
): FollowUpRead {
	if (next.aiRequiresFollowUp) {
		return {
			aiRequiresFollowUp: true,
			followUpReasonCode: next.followUpReasonCode,
			noFollowUpReason: undefined,
			...(next.followUpReason ? { followUpReason: next.followUpReason } : {}),
		};
	}
	if (classifierFlaggedFollowUp(existing)) {
		return {};
	}
	return {
		aiRequiresFollowUp: false,
		followUpReasonCode: next.followUpReasonCode,
		noFollowUpReason: next.noFollowUpReason,
	};
}

/**
 * What decided a session's follow-up, recorded on the session. `compounding`
 * is written later, by the follow-up start, when compounding alone earned it.
 */
export const FOLLOW_UP_DECISION_SOURCES = [
	"ai",
	"gave_up",
	"escalation",
	"compounding",
	"none",
] as const;

export type FollowUpDecisionSource =
	(typeof FOLLOW_UP_DECISION_SOURCES)[number];

/**
 * The source of the gate `finalizeFollowUp` was given. When several agree,
 * the safety signal is named first: escalation, then the classifier, then
 * gave_up. A stored flag with no other trace (rows from before the
 * classifier's flag was kept) is the classifier's: deliverMirror raises it
 * only from the classifier or escalation.
 */
export function followUpDecisionSource(args: {
	requiresFollowUp: boolean;
	escalationTriggered?: boolean | null;
	classifierFlagged: boolean;
	confirmationState?: string | null;
}): FollowUpDecisionSource {
	if (!args.requiresFollowUp) {
		return "none";
	}
	if (args.escalationTriggered === true) {
		return "escalation";
	}
	if (args.classifierFlagged) {
		return "ai";
	}
	if (args.confirmationState === "gave_up") {
		return "gave_up";
	}
	return "ai";
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
	if (args.shownAt == null) {
		return false;
	}
	return args.now - args.shownAt >= RESHOW_COOLDOWN_MS;
}

/**
 * How long a card waits for an answer once the person is back (Coming back
 * v2): from its first `markShown`, a shown card expires silently after this.
 * Runs after the tier timers, never alongside them: those only act on a
 * `pending` card.
 */
export const WAITING_CARD_LIFETIME_MS = 3 * DAY;

/**
 * When a card's wait began: its first showing, else (a ready card) when the
 * person came back. Cards from before these stamps existed fall back to
 * `shownAt` and `createdAt`.
 */
export function waitingSince(card: {
	createdAt: number;
	firstShownAt?: number;
	readyAt?: number;
	shownAt?: number;
	status: string;
}): number {
	if (card.status === "shown") {
		return card.firstShownAt ?? card.shownAt ?? card.createdAt;
	}
	return card.readyAt ?? card.createdAt;
}

/**
 * Is this card still waiting on the person? Ready or shown, and under
 * `WAITING_CARD_LIFETIME_MS` since its wait began. The 2-hour re-show
 * cooldown plays no part.
 */
export function isCardWaiting(
	card: Parameters<typeof waitingSince>[0],
	now: number
): boolean {
	if (card.status !== "ready" && card.status !== "shown") {
		return false;
	}
	return now - waitingSince(card) < WAITING_CARD_LIFETIME_MS;
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
	if (args.cardStatus !== "pending") {
		return false;
	}
	return args.now - args.cardCreatedAt >= args.minGapMs;
}
