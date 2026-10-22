import {
  QUIET_RETURN_PROMPTS,
  type QuietReturnTier,
} from "@/src/features/reflect/quiet-return-copy";
import { NIGHT_HEADLINE } from "@/src/features/reflect/night-copy";

/**
 * What the reflect card says, and how big it says it.
 *
 * Pure so the priority order is testable without a renderer: the card is the
 * only place a prompt lives now (#246), so exactly one source may win and the
 * user's own unfinished words must outrank anything the space would say.
 *
 * Type scale is card-local: the card is a fixed size, so long text scales down
 * within it rather than pushing the page around.
 */
export const DEFAULT_PROMPT = "What’s sitting with you right now?";

/**
 * Above this many characters the card drops to the smaller scale. The large
 * scale fits ~36 characters in the resting card's four lines; anything longer
 * was clipped mid-word (#413).
 */
const LONG_TEXT_CHARS = 36;

/** A reply runs to 500 chars; the card is a fixed size. One line, clipped. */
const SEED_CHARS = 88;

export type CardContentSource =
  | "draft"
  | "reply-seed"
  | "night"
  | "quiet-return"
  | "event"
  | "default";

export type CardContent = {
  text: string;
  scale: "large" | "small";
  source: CardContentSource;
};

export function resolveCardContent({
  isNight = false,
  quietReturnTier = null,
  eventPrompt = null,
  draft = null,
  replySeed = null,
}: {
  isNight?: boolean;
  quietReturnTier?: QuietReturnTier | null;
  eventPrompt?: string | null;
  /** The retained entry text. Whitespace-only is no draft at all. */
  draft?: string | null;
  /** A kept quote reply the user chose to start from (#316). */
  replySeed?: string | null;
}): CardContent {
  const opening = draft?.trim().split("\n")[0]?.trim();
  if (opening) return withScale(opening, "draft");

  // Under a live draft, over everything the space would say: what is on the
  // card is the user's own sentence, and the space has nothing better to open
  // with than the words they came here from. The composer stays empty — this
  // seeds the screen, never `rawInput` (#316).
  const seed = replySeed?.trim().split("\n")[0]?.trim();
  if (seed) return withScale(`You wrote: “${clip(seed)}”`, "reply-seed");

  if (isNight) return withScale(NIGHT_HEADLINE, "night");
  if (quietReturnTier)
    return withScale(QUIET_RETURN_PROMPTS[quietReturnTier], "quiet-return");
  if (eventPrompt?.trim()) return withScale(eventPrompt, "event");
  return withScale(DEFAULT_PROMPT, "default");
}

/** Split by grapheme cluster so a cut at SEED_CHARS never leaves half an emoji. */
function units(text: string): string[] {
  const Segmenter = Intl.Segmenter;
  if (!Segmenter) return Array.from(text); // Hermes without full-ICU: code points
  return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment);
}

function clip(text: string): string {
  const chars = units(text);
  return chars.length > SEED_CHARS
    ? `${chars.slice(0, SEED_CHARS).join("").trimEnd()}…`
    : text;
}

function withScale(text: string, source: CardContentSource): CardContent {
  return {
    text,
    scale: text.length > LONG_TEXT_CHARS ? "small" : "large",
    source,
  };
}
