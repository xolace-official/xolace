import Anthropic from "@anthropic-ai/sdk";
import { PRIMARY_EMOTIONS, THEMATIC_TAGS } from "../../lib/understandingVocab";

// --- Client Singleton ---

let client: Anthropic | null = null;

/**
 * Get the module-level singleton Anthropic client, creating and caching it on first call.
 *
 * @returns The shared `Anthropic` client instance
 */
export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      // Reads ANTHROPIC_API_KEY from process.env automatically
      timeout: 30_000,
      maxRetries: 4,
    });
  }
  return client;
}

// --- Model Constants ---

export const CLASSIFIER_MODEL = "claude-haiku-5-5";
// Changing the classifier prompt or model? Bump this (it must name the model —
// steadiness.test.ts asserts it), run the intensity release gate
// (`bun run test:evals:intensity`; the Intensity gate CI job runs it on PRs
// touching this file) and record the new version in INTENSITY_OFFSET
// (convex/compounding/readings.ts).
export const CLASSIFIER_VERSION = "classifier-v2-haiku-5.5";

export const ARTICULATOR_MODEL = "claude-sonnet-5-5";
export const ARTICULATOR_VERSION = "articulator-v2-sonnet-5.5";

export const DISTILLER_MODEL = "claude-haiku-5-5";
export const DISTILLER_VERSION = "distiller-v2-haiku-5.5";

// Reflection Agent (Cognition Layer Phase 3). writerVersion mirrors the
// mirrorModelVersion format ("{writer}-v{N}-{model}").
export const REFLECTION_LIGHT_MODEL = "claude-haiku-5-5";
export const REFLECTION_LIGHT_VERSION = "reflect-light-v2-haiku-5.5";

export const REFLECTION_CONSOLIDATION_MODEL = "claude-sonnet-5-5";
export const REFLECTION_CONSOLIDATION_VERSION =
  "reflect-consolidation-v3-sonnet-5.5"; // v2: reads follow-up check-ins (#453); v3: Sonnet 5.5 (#534)

// Kindling generation (docs/paths-v1.md §2.2, ADR 0010). One standalone
// Haiku call that picks 2–3 action types and writes a `why` line each.
export const PATHS_MODEL = "claude-haiku-5-5";
export const PATHS_VERSION = "paths-v2-haiku-5.5";

export const NOTIFICATION_MODEL = "claude-haiku-5-5";
export const ACKNOWLEDGE_MODEL = "claude-haiku-5-5";
export const SLOT_FILL_MODEL = "claude-haiku-5-5";
export const CHAT_MODERATION_MODEL = "claude-haiku-5-5";
export const FOLLOW_UP_CARD_MODEL = "claude-haiku-5-5";

/**
 * Thinking off, like for like with the 4.x models these routes were tuned
 * on (their small max_tokens leave no room for thinking). The 5.5 models
 * think by default; Haiku 5.5 turns it off with "disabled", Sonnet 5.5
 * rejects that and calls its lowest setting "between_tools" — which SDK
 * 0.92 doesn't type yet, hence the cast. Both need effort ≤ high (default).
 */
export function thinkingOff(model: string): Anthropic.ThinkingConfigParam {
  return (
    model.startsWith("claude-sonnet-5-5")
      ? { type: "between_tools" }
      : { type: "disabled" }
  ) as Anthropic.ThinkingConfigParam;
}

// --- Types ---

export interface ClassificationResult {
  primaryEmotion: string;
  primaryEmotionConfidence: number;
  granularLabel?: string;
  secondaryEmotion?: string;
  intensity: number;
  specificity: number;
  thematicTags: string[];
  userLanguageTags: string[];
  temporalContext?: "past_focused" | "present_focused" | "future_focused";
  // Follow-up system: does this session warrant a later check-in? Defaults to
  // false. followUpReason is a brief internal sentence (never shown to user).
  requiresFollowUp: boolean;
  followUpReason?: string;
  // Kindling trigger (docs/paths-v1.md §1). Graded, defaults to "none" when
  // the model omits it or returns an invalid value. Escalation forces this
  // to "none" server-side (process.ts) — never trust the prompt alone.
  supportNeed: SupportNeed;
}

export type SupportNeed = "none" | "light" | "active";

// --- Valid vocabularies (shared with the classifier prompt and Library — ADR 0018) ---

const VALID_PRIMARY_EMOTIONS: ReadonlySet<string> = new Set(PRIMARY_EMOTIONS);
const VALID_THEMATIC_TAGS: ReadonlySet<string> = new Set(THEMATIC_TAGS);

const VALID_SUPPORT_NEEDS = new Set(["none", "light", "active"]);

// --- Helpers ---

/**
 * Extract the first plain-text block from an Anthropic message's content.
 *
 * @param message - The Anthropic message to scan for a text block
 * @returns The text of the first block whose `type` is `"text"`, or an empty string if no text block is found
 */
export function extractTextFromResponse(
  message: Anthropic.Message
): string {
  for (const block of message.content) {
    if (block.type === "text") {
      return block.text;
    }
  }
  return "";
}

/**
 * Convert a raw Haiku classifier output string into a validated ClassificationResult.
 *
 * Accepts raw model output (optionally wrapped in Markdown JSON code fences), parses it, and produces a safe, normalized ClassificationResult:
 * - `primaryEmotion` is lowercased or `"unclassified"` when missing/invalid.
 * - `primaryEmotionConfidence` is coerced to a number, defaults to `0.3`, and is clamped to the range `[0, 1]`.
 * - `intensity` and `specificity` are coerced to integers, default to `5`, and are clamped to the range `[1, 10]`.
 * - `thematicTags` and `userLanguageTags` are filtered to string values only and truncated to at most 5 entries.
 * - Optional `granularLabel` and `secondaryEmotion` are included only when non-empty strings (lowercased), and `temporalContext` is included only when it matches `past_focused`, `present_focused`, or `future_focused`.
 *
 * @param raw - The raw classifier output string; may include surrounding Markdown JSON code fences.
 * @returns The normalized and validated ClassificationResult constructed from the parsed input.
 */
export function parseClassificationResponse(
  raw: string
): ClassificationResult {
  console.log("raw ", raw)
  // Take the JSON object out of whatever the model wrapped it in. Fences are
  // the common case; on crisis input Haiku also appends a hotline note AFTER
  // the closing fence, and stripping fences alone left that prose in the
  // string — JSON.parse threw and the session failed on exactly the input
  // that must not fail.
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const cleaned = start >= 0 && end > start ? raw.slice(start, end + 1) : raw.trim();

  const parsed = JSON.parse(cleaned);

  // Validate and coerce required fields
  const rawEmotion =
    typeof parsed.primaryEmotion === "string"
      ? parsed.primaryEmotion.toLowerCase()
      : "unclassified";

  const result: ClassificationResult = {
    primaryEmotion: VALID_PRIMARY_EMOTIONS.has(rawEmotion)
      ? rawEmotion
      : "confusion",
    primaryEmotionConfidence: clamp(
      Number(parsed.primaryEmotionConfidence) || 0.3,
      0,
      1
    ),
    intensity: clamp(Math.round(Number(parsed.intensity) || 5), 1, 10),
    specificity: clamp(Math.round(Number(parsed.specificity) || 5), 1, 10),
    thematicTags: Array.isArray(parsed.thematicTags)
      ? [
          ...new Set<string>(
            parsed.thematicTags
              .filter((t: unknown): t is string => typeof t === "string")
              .map((t: string) => t.toLowerCase())
              .filter((t: string) => VALID_THEMATIC_TAGS.has(t))
          ),
        ].slice(0, 5)
      : [],
    userLanguageTags: Array.isArray(parsed.userLanguageTags)
      ? parsed.userLanguageTags.filter((t: unknown) => typeof t === "string").slice(0, 5)
      : [],
    // Default false — follow-up is the exception, never assume it.
    requiresFollowUp: parsed.requiresFollowUp === true,
    // Default "none" — an invalid/missing grade must never trigger kindling.
    supportNeed: VALID_SUPPORT_NEEDS.has(parsed.supportNeed)
      ? (parsed.supportNeed as SupportNeed)
      : "none",
  };

  // Optional fields
  if (typeof parsed.granularLabel === "string" && parsed.granularLabel) {
    result.granularLabel = parsed.granularLabel.toLowerCase();
  }
  if (typeof parsed.secondaryEmotion === "string" && parsed.secondaryEmotion) {
    result.secondaryEmotion = parsed.secondaryEmotion.toLowerCase();
  }
  if (
    parsed.temporalContext === "past_focused" ||
    parsed.temporalContext === "present_focused" ||
    parsed.temporalContext === "future_focused"
  ) {
    result.temporalContext = parsed.temporalContext;
  }
  // Only keep a reason when a follow-up was actually requested.
  if (
    result.requiresFollowUp &&
    typeof parsed.followUpReason === "string" &&
    parsed.followUpReason.trim()
  ) {
    result.followUpReason = parsed.followUpReason.trim();
  }

  return result;
}

/**
 * Clamp a number to an inclusive range.
 *
 * @param value - The number to constrain
 * @param min - The inclusive lower bound
 * @param max - The inclusive upper bound
 * @returns The input value restricted to the inclusive range `[min, max]`
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
