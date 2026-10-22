/**
 * Rule-based safeguard engine. No LLM calls.
 * Combines OpenAI moderation scores + Haiku classification
 * to determine risk level and appropriate response.
 */

import type { ClassificationResult, SupportNeed } from "./providers/anthropic";
import { emotionFamily } from "../lib/understandingVocab";
import type { ModerationResult } from "./providers/moderation";

// --- Types ---

export type SafeguardLevel = "none" | "gentle" | "elevated" | "crisis";

export type TriggerType =
  | "explicit_crisis_language"
  | "implicit_risk_language"
  | "pattern_escalation"
  | "crisis_keywords"
  | "user_requested";

type ActionTaken =
  | "resources_shown"
  | "warm_handoff_offered"
  | "crisis_line_presented"
  | "session_redirected";

export type Resource = {
  type: "phone" | "url" | "text" | "email";
  source: "crisis_line" | "xolace_support" | "text_support" | "local_service" | "online_resource";
  priority: number;
  label: string;
  value: string;
  description?: string;
};

interface SafeguardBase {
  level: SafeguardLevel;
  triggerType?: TriggerType;
  triggerConfidence: number;
  triggerEvidence: string;
  actionTaken: ActionTaken;
  resourcesPresented: Resource[];
  shouldReject: boolean;
  rejectionReason?: string;
}

/**
 * The safeguard verdict plus its consequences. The three flags are derived
 * once here — callers must never re-derive them from level/triggerType.
 */
export interface SafeguardResult extends SafeguardBase {
  /** Crisis or elevated with a concrete trigger → escalation event + client flag. */
  isEscalation: boolean;
  /** Feeds emotional_metadata.riskFlag (pattern_escalation excluded to avoid self-reinforcement). */
  riskFlag: boolean;
  /** Crisis sessions are excluded from distillation / the peer pool. */
  isCrisis: boolean;
}

interface RecentMetadataEntry {
  primaryEmotion: string;
  intensity: number;
  riskFlag?: boolean;
  createdAt: number;
}

// --- Resources ---

// Xolace first-party contact — included in every resource set so users
// always know we're here regardless of their situation.
const XOLACE_CONTACT: Resource = {
  type: "email",
  source: "xolace_support",
  priority: 1,
  label: "Xolace Support",
  value: "support@xolaceinc.com",
  description: "We're here - reach us any time",
};

export const CRISIS_RESOURCES: Resource[] = [
  XOLACE_CONTACT,
  { type: "phone", source: "crisis_line", priority: 2, label: "Mental Health Authority (Ghana)", value: "0800 678 678", description: "Free, 24/7" },
  { type: "phone", source: "crisis_line", priority: 3, label: "Ghana Emergency Line", value: "112", description: "National emergency" },
  { type: "url", source: "online_resource", priority: 4, label: "Find a local crisis centre", value: "https://www.iasp.info/resources/Crisis_Centres/", description: "If outside Ghana" },
];

export const SUPPORT_RESOURCES: Resource[] = [
  XOLACE_CONTACT,
  { type: "phone", source: "local_service", priority: 2, label: "Mental Health Authority (Ghana)", value: "0800 678 678" },
  { type: "text", source: "local_service", priority: 3, label: "MindFreedom Ghana", value: "Mental health advocacy & support" },
];

const TRAUMA_RESOURCES: Resource[] = [
  XOLACE_CONTACT,
  { type: "phone", source: "crisis_line", priority: 2, label: "DOVVSU (Domestic Violence Support)", value: "18555", description: "Ghana Police" },
  { type: "phone", source: "local_service", priority: 3, label: "Mental Health Authority (Ghana)", value: "0800 678 678" },
  { type: "url", source: "online_resource", priority: 4, label: "Find a local support centre", value: "https://www.iasp.info/resources/Crisis_Centres/", description: "If outside Ghana" },
];

// --- Time window for pattern escalation (48 hours) ---

const PATTERN_WINDOW_MS = 48 * 60 * 60 * 1000;

// --- Emotions that signal distress at high intensity ---

const DISTRESS_EMOTIONS = new Set([
  "despair",
  "hopelessness",
  "numbness",
  "helplessness",
  "worthlessness",
  "emptiness",
  "anguish",
  "grief",
  "exhaustion",
  "demotivation",
  "loneliness",
]);

const HIGH_DISTRESS_EMOTIONS = new Set([
  "despair",
  "hopelessness",
  "numbness",
  "worthlessness",
  "helplessness",
]);

const SURVIVOR_NARRATIVE_EMOTIONS = new Set([
  "grief",
  "fear",
  "shame",
  "anger",
  "sadness",
  "disgust",
  "numbness",
]);

/** True if the emotion, or the broad emotion it sits under, is in the set (ADR 0018). */
const inSet = (set: ReadonlySet<string>, emotion: string) =>
  emotionFamily(emotion).some((e) => set.has(e));

/**
 * The first of the classification's emotion words (granular, then primary) in
 * the set, or undefined. Both are checked: a finer primary like "hopelessness"
 * usually carries a granular label that isn't in the set itself.
 *
 * `family: false` for HIGH_DISTRESS — parents there would pull children into
 * crisis escalation by association (exhaustion → numbness).
 */
function distressWord(
  set: ReadonlySet<string>,
  c: ClassificationResult,
  family = true,
): string | undefined {
  return [c.granularLabel, c.primaryEmotion].find(
    (w): w is string => !!w && (family ? inSet(set, w.toLowerCase()) : set.has(w.toLowerCase())),
  );
}

/**
 * Determines the appropriate safeguard level and associated actions for a message by evaluating moderation signals, classification outputs, and recent session metadata.
 *
 * @param classification - Model-derived labels including intensity, primaryEmotion, granularLabel, and their confidences
 * @param moderation - Content moderation categories and per-category scores
 * @param recentMetadata - Recent session metadata entries (most recent first) used to detect pattern escalation across interactions
 * @returns A SafeguardResult containing the decided `level`, optional `triggerType` and `triggerEvidence`, `triggerConfidence`, `actionTaken`, `resourcesPresented`, and `shouldReject` (with `rejectionReason` when applicable)
 */

export function evaluateSafeguard(
  classification: ClassificationResult,
  moderation: ModerationResult,
  recentMetadata: RecentMetadataEntry[]
): SafeguardResult {
  const base: SafeguardBase =
    checkRejection(moderation, classification) ??
    checkCrisis(classification, moderation) ??
    checkElevated(classification, moderation, recentMetadata) ??
    checkGentle(classification, moderation) ?? {
      level: "none",
      triggerConfidence: 0,
      triggerEvidence: "No risk signals detected.",
      actionTaken: "resources_shown",
      resourcesPresented: [],
      shouldReject: false,
    };

  // Consequences derived exactly once — the single source callers read.
  const escalatable = base.level === "crisis" || base.level === "elevated";
  return {
    ...base,
    isEscalation: escalatable && !!base.triggerType,
    riskFlag: escalatable && base.triggerType !== "pattern_escalation",
    isCrisis: base.level === "crisis",
  };
}

/**
 * Pattern escalation's history half: of the last 5 sessions within 48 hours,
 * how many carried a risk flag. 3+ is the pattern. A typed session also needs
 * current distress; a talk opens elevated on the history alone (#599).
 */
export function patternRisk(
  recentMetadata: Pick<RecentMetadataEntry, "riskFlag" | "createdAt">[],
  now: number,
): { riskCount: number; windowCount: number } {
  const windowSessions = recentMetadata
    .slice(0, 5)
    .filter((m) => now - m.createdAt < PATTERN_WINDOW_MS);
  return {
    windowCount: windowSessions.length,
    riskCount: windowSessions.filter((m) => m.riskFlag).length,
  };
}

const RANK: Record<SafeguardLevel, number> = { none: 0, gentle: 1, elevated: 2, crisis: 3 };

/** True when `level` is above `than`. */
export const levelAbove = (level: SafeguardLevel, than: SafeguardLevel) => RANK[level] > RANK[than];

/** The highest a live talk reached (#599): stored on the session as `talkSafety`. */
export type TalkPeak = {
  level: "elevated" | "crisis";
  triggerType: TriggerType;
  triggerConfidence: number;
  triggerEvidence: string;
  /** Opened elevated on pattern history alone: a precaution, not a verdict. */
  fromHistory?: boolean;
};

/**
 * A talk's session level is the higher of its live peak and the end-of-talk
 * verdict (#599). On a tie the end verdict stands (its evidence covers the
 * whole talk); a history-only opening never counts. A crisis peak also beats
 * a rejection: someone met in crisis is not turned away at the end.
 */
export function withTalkPeak(end: SafeguardResult, peak: TalkPeak | undefined): SafeguardResult {
  if (!peak || peak.fromHistory) return end;
  if (end.shouldReject ? peak.level !== "crisis" : !levelAbove(peak.level, end.level)) return end;
  const crisis = peak.level === "crisis";
  return {
    level: peak.level,
    triggerType: peak.triggerType,
    triggerConfidence: peak.triggerConfidence,
    triggerEvidence: `Live talk: ${peak.triggerEvidence}`,
    actionTaken: crisis ? "crisis_line_presented" : "resources_shown",
    resourcesPresented: crisis ? CRISIS_RESOURCES : SUPPORT_RESOURCES,
    shouldReject: false,
    isEscalation: true,
    riskFlag: peak.triggerType !== "pattern_escalation",
    isCrisis: crisis,
  };
}

/**
 * The session's own words stay out of distillation and episodic memory:
 * crisis, and a talk at elevated too (#599). Its metadata still counts.
 */
export const keepsWordsPrivate = (entryType: string | undefined, level: SafeguardLevel | undefined) =>
  level === "crisis" || (entryType === "talk" && level === "elevated");

/**
 * Kindling trigger (docs/paths-v1.md §1). The classifier's graded
 * `supportNeed` stands unless safeguard is above the escalation threshold
 * (crisis or elevated) — safeguard owns that person, and kindling must
 * never compete with a safety response. Enforced here, server-side, not by
 * prompt instruction alone.
 */
export function resolveSupportNeed(
  classifierSupportNeed: SupportNeed,
  safeguardLevel: SafeguardLevel
): SupportNeed {
  if (safeguardLevel === "crisis" || safeguardLevel === "elevated") {
    return "none";
  }
  return classifierSupportNeed;
}

/**
 * Detects whether the classification signals a survivor recounting past
 * trauma rather than producing harmful content.
 *
 * Requires ALL THREE of:
 * - past_focused temporal context (describing something that happened)
 * - specificity >= 6 (describing real events with detail, not vague/fictional)
 * - primary emotion in the trauma-relevant set
 */
function isSurvivorNarrative(
  classification: ClassificationResult
): boolean {
  if (classification.temporalContext !== "past_focused") return false;
  if (classification.specificity < 6) return false;

  // Check primaryEmotion first (broad, reliable match like "grief")
  if (inSet(SURVIVOR_NARRATIVE_EMOTIONS, classification.primaryEmotion))
    return true;

  // Fallback: check granularLabel for exact match
  if (
    classification.granularLabel &&
    inSet(SURVIVOR_NARRATIVE_EMOTIONS, classification.granularLabel)
  )
    return true;

  return false;
}

/**
 * Detects moderation categories that require immediate session rejection.
 * Consults classification to avoid rejecting survivor trauma disclosures.
 *
 * @param moderation - Moderation result with `categories` and `categoryScores` used to identify disallowed content flags.
 * @param classification - Classification result used to detect survivor narrative context.
 * @returns A `SafeguardResult` configured to reject the session with `rejectionReason` set to `"content_policy_violation"` when a disallowed category is detected and the input is not a survivor narrative, `null` otherwise.
 */

function checkRejection(
  moderation: ModerationResult,
  classification: ClassificationResult
): SafeguardBase | null {
  console.log("moderation result ", moderation);
  const cats = moderation.categories;
  const scores = moderation.categoryScores;

  if (cats["sexual/minors"]) {
    if (!isSurvivorNarrative(classification)) {
      return makeRejection(
        `Moderation: sexual/minors flagged (score: ${fmtScore(scores["sexual/minors"])}).`,
        "content_policy_violation"
      );
    }
    // Survivor narrative detected — fall through to elevated/gentle checks
  }

  if (cats["hate/threatening"]) {
    return makeRejection(
      `Moderation: hate/threatening flagged (score: ${fmtScore(scores["hate/threatening"])}).`,
      "content_policy_violation"
    );
  }

  if (cats.violence && cats.harassment) {
    if (!isSurvivorNarrative(classification)) {
      return makeRejection(
        `Moderation: violence (${fmtScore(scores.violence)}) + harassment (${fmtScore(scores.harassment)}) both flagged.`,
        "content_policy_violation"
      );
    }
  }

  return null;
}

/**
 * Determines whether the provided moderation scores and classification indicate crisis-level risk and, if so, constructs a corresponding crisis SafeguardResult.
 *
 * @param classification - The classification analysis containing intensity and emotion-related fields used for implicit risk checks.
 * @param moderation - The moderation result containing category flags and numeric categoryScores used for explicit crisis detection.
 * @returns A `SafeguardResult` with `level: "crisis"` (and `triggerType` set to either `"explicit_crisis_language"` or `"implicit_risk_language"`, `triggerConfidence`, `triggerEvidence`, `actionTaken: "crisis_line_presented"`, `resourcesPresented: CRISIS_RESOURCES`, and `shouldReject: false`) when crisis conditions match; `null` if no crisis conditions are detected.
 */

function checkCrisis(
  classification: ClassificationResult,
  moderation: ModerationResult
): SafeguardBase | null {
  const scores = moderation.categoryScores;

  // Self-harm intent with high confidence
  const selfHarmIntentScore = scores["self-harm/intent"] ?? 0;
  const selfHarmScore = scores["self-harm"] ?? 0;

  if (selfHarmIntentScore > 0.7 || moderation.categories["self-harm/instructions"]) {
    const instructionsScore = scores["self-harm/instructions"] ?? 0;
    const maxScore = Math.max(selfHarmIntentScore, instructionsScore);

    return {
      level: "crisis",
      triggerType: "explicit_crisis_language",
      triggerConfidence: maxScore,
      triggerEvidence: buildEvidence(
        moderation,
        classification,
        ["self-harm/intent", "self-harm/instructions", "self-harm"]
      ),
      actionTaken: "crisis_line_presented",
      resourcesPresented: CRISIS_RESOURCES,
      shouldReject: false,
    };
  }

  // High self-harm score combined with high classification intensity
  if (selfHarmScore > 0.5 && classification.intensity >= 9) {
    return {
      level: "crisis",
      triggerType: "implicit_risk_language",
      triggerConfidence: selfHarmScore,
      triggerEvidence: buildEvidence(
        moderation,
        classification,
        ["self-harm", "self-harm/intent"]
      ),
      actionTaken: "crisis_line_presented",
      resourcesPresented: CRISIS_RESOURCES,
      shouldReject: false,
    };
  }

  return null;
}

/**
 * Determines whether the inputs indicate an elevated risk level and, if so, constructs a corresponding SafeguardResult.
 *
 * @param classification - Model-derived classification containing intensity, primaryEmotion, granularLabel, and confidence fields
 * @param moderation - Moderation result with category scores used to detect self-harm signals
 * @param recentMetadata - Recent per-session metadata entries used to detect pattern escalation (most recent first)
 * @returns A `SafeguardResult` with `level: "elevated"` and appropriate trigger metadata when an elevated condition is detected, or `null` when no elevated conditions match.
 */

function checkElevated(
  classification: ClassificationResult,
  moderation: ModerationResult,
  recentMetadata: RecentMetadataEntry[]
): SafeguardBase | null {
  const scores = moderation.categoryScores;

  // Trauma disclosure: moderation flagged sexual content or violence+harassment
  // but classification indicates a survivor recounting past abuse
  const hasSexualFlag =
    moderation.categories["sexual/minors"] || moderation.categories.sexual;
  const hasViolenceHarassmentFlag =
    moderation.categories.violence && moderation.categories.harassment;

  if (
    (hasSexualFlag || hasViolenceHarassmentFlag) &&
    isSurvivorNarrative(classification)
  ) {
    const relevantCategories = hasSexualFlag
      ? ["sexual/minors", "sexual", "violence"]
      : ["violence", "harassment"];

    return {
      level: "elevated",
      triggerType: "implicit_risk_language",
      triggerConfidence: classification.primaryEmotionConfidence,
      triggerEvidence: buildEvidence(
        moderation,
        classification,
        relevantCategories
      ),
      actionTaken: "resources_shown",
      resourcesPresented: hasSexualFlag ? TRAUMA_RESOURCES : SUPPORT_RESOURCES,
      shouldReject: false,
    };
  }

  const selfHarmScore = scores["self-harm"] ?? 0;

  // Moderate self-harm signal
  if (selfHarmScore > 0.3) {
    return {
      level: "elevated",
      triggerType: "implicit_risk_language",
      triggerConfidence: selfHarmScore,
      triggerEvidence: buildEvidence(
        moderation,
        classification,
        ["self-harm", "self-harm/intent"]
      ),
      actionTaken: "resources_shown",
      resourcesPresented: SUPPORT_RESOURCES,
      shouldReject: false,
    };
  }

  // High intensity + distress emotion
  const emotion = distressWord(HIGH_DISTRESS_EMOTIONS, classification, false);
  if (classification.intensity >= 9 && emotion) {
    return {
      level: "elevated",
      triggerType: "implicit_risk_language",
      triggerConfidence: classification.primaryEmotionConfidence,
      triggerEvidence: `Classification: intensity ${classification.intensity}/10, emotion: ${emotion}, confidence: ${classification.primaryEmotionConfidence.toFixed(2)}.`,
      actionTaken: "resources_shown",
      resourcesPresented: SUPPORT_RESOURCES,
      shouldReject: false,
    };
  }

  // Pattern escalation: 3+ of last 5 sessions had riskFlag
  // Only triggers if the CURRENT input also shows distress signals —
  // prevents a self-reinforcing loop where historical risk flags
  // cause every new session (even happy ones) to escalate.
  const { riskCount, windowCount } = patternRisk(recentMetadata, Date.now());
  if (riskCount >= 3 && distressWord(DISTRESS_EMOTIONS, classification)) {
    return {
      level: "elevated",
      triggerType: "pattern_escalation",
      triggerConfidence: riskCount / windowCount,
      triggerEvidence: `Pattern: ${riskCount} of last ${windowCount} sessions within 48 hours had risk flags. Current intensity: ${classification.intensity}/10.`,
      actionTaken: "resources_shown",
      resourcesPresented: SUPPORT_RESOURCES,
      shouldReject: false,
    };
  }

  return null;
}

/**
 * Detects lower-severity risk signals and returns a gentle-level safeguard result when a matching condition is found.
 *
 * Checks for (1) violence flagged by moderation without harassment and (2) a high-intensity classification combined with a distress emotion.
 *
 * @param classification - Classification result; uses `intensity`, `primaryEmotion`, optional `granularLabel`, and `primaryEmotionConfidence` to evaluate emotional distress.
 * @param moderation - Moderation result; uses `categories.violence`, `categories.harassment`, and `categoryScores.violence` to evaluate content flags.
 * @returns A `SafeguardResult` with `level: "gentle"` when a gentle condition matches, `null` otherwise.
 */

function checkGentle(
  classification: ClassificationResult,
  moderation: ModerationResult
): SafeguardBase | null {
  // Violence without harassment (may be describing experiences)
  if (moderation.categories.violence && !moderation.categories.harassment) {
    return {
      level: "gentle",
      triggerConfidence: moderation.categoryScores.violence ?? 0,
      triggerEvidence: `Moderation: violence flagged (${fmtScore(moderation.categoryScores.violence)}).`,
      actionTaken: "resources_shown",
      resourcesPresented: [],
      shouldReject: false,
    };
  }

  // High intensity + distress emotion (not crisis-level)
  const emotion = distressWord(DISTRESS_EMOTIONS, classification);
  if (classification.intensity >= 7 && emotion) {
    return {
      level: "gentle",
      triggerConfidence: classification.primaryEmotionConfidence,
      triggerEvidence: `Classification: intensity ${classification.intensity}/10, emotion: ${emotion}.`,
      actionTaken: "resources_shown",
      resourcesPresented: [],
      shouldReject: false,
    };
  }

  return null;
}

/**
 * Constructs a rejection SafeguardResult for policy-violating content.
 *
 * @param evidence - A human-readable evidence string explaining why the rejection was triggered
 * @param reason - A short machine-readable code identifying the rejection reason
 * @returns A `SafeguardResult` that signals the session should be rejected with `shouldReject: true`, `level: "none"`, `triggerConfidence: 1`, the provided `triggerEvidence`, `actionTaken: "session_redirected"`, and the given `rejectionReason`
 */

function makeRejection(evidence: string, reason: string): SafeguardBase {
  return {
    level: "none",
    triggerConfidence: 1,
    triggerEvidence: evidence,
    actionTaken: "session_redirected",
    resourcesPresented: [],
    shouldReject: true,
    rejectionReason: reason,
  };
}

/**
 * Builds a dot-separated evidence string that summarizes selected moderation category scores and the classification context.
 *
 * @param moderation - Moderation result whose `categoryScores` are inspected; categories with scores greater than 0.01 are included.
 * @param classification - Classification result whose `intensity` and `primaryEmotion` are appended to the evidence.
 * @param relevantCategories - Array of moderation category keys to consider for inclusion in the evidence.
 * @returns A dot-separated string containing `Moderation: <category> (<score>)` entries for included categories followed by `Classification: intensity <intensity>/10, <primaryEmotion>`, ending with a trailing period.
 */
function buildEvidence(
  moderation: ModerationResult,
  classification: ClassificationResult,
  relevantCategories: string[]
): string {
  const parts: string[] = [];

  for (const cat of relevantCategories) {
    const score = moderation.categoryScores[cat];
    if (score !== undefined && score > 0.01) {
      parts.push(`Moderation: ${cat} (${fmtScore(score)})`);
    }
  }

  parts.push(
    `Classification: intensity ${classification.intensity}/10, ${classification.primaryEmotion}`
  );

  return parts.join(". ") + ".";
}

/**
 * Format a numeric score as a two-decimal string.
 *
 * @param score - The numeric score to format; `undefined` is treated as `0`.
 * @returns The value formatted with two decimal places (for example, `0.50`).
 */
function fmtScore(score: number | undefined): string {
  return (score ?? 0).toFixed(2);
}
