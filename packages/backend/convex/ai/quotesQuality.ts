// Pure quote-shape helpers — no Convex ctx, unit-testable.
// Orchestration lives in quotesDistiller.ts.

// Regex: flag capitalized mid-sentence words that look like proper nouns
const PROPER_NOUN_RE = /(?<!\. |\? |! |^)[A-Z][a-z]{2,}/g;

// Short medical/clinical term blocklist — keeps quotes shareable
const MEDICAL_BLOCKLIST = [
  "depression",
  "anxiety disorder",
  "ptsd",
  "bipolar",
  "schizophrenia",
  "diagnosis",
  "disorder",
  "symptom",
  "therapy",
  "medication",
  "prescribed",
];

// 12 poetic lenses that rotate daily — forces a fresh rhetorical entry point
// even when emotional input is identical across consecutive days.
const ANGLE_SEEDS = [
  "impermanence",
  "self-compassion",
  "paradox",
  "movement",
  "stillness",
  "clarity",
  "tenderness",
  "observation",
  "strength",
  "surrender",
  "distance",
  "contrast",
] as const;

export function dailyAngleSeed(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const start = new Date(Date.UTC(year, 0, 0));
  const current = new Date(Date.UTC(year, month - 1, day));
  const dayOfYear = Math.floor((current.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return ANGLE_SEEDS[dayOfYear % ANGLE_SEEDS.length];
}

export function validateQuote(text: string): { ok: boolean; reason?: string } {
  if (text.length < 20) return { ok: false, reason: "too short" };
  if (text.length > 200) return { ok: false, reason: "too long" };

  const properNouns = text.match(PROPER_NOUN_RE);
  if (properNouns && properNouns.length > 2) {
    return { ok: false, reason: `too many proper nouns: ${properNouns.join(", ")}` };
  }

  const lowerText = text.toLowerCase();
  for (const term of MEDICAL_BLOCKLIST) {
    if (lowerText.includes(term)) {
      return { ok: false, reason: `blocked term: ${term}` };
    }
  }

  return { ok: true };
}

/** Stored cap. The plate renders it bare at 27px; the client shrinks to 0.8 to fit. */
export const TITLE_MAX_LENGTH = 20;

/**
 * A title is a soft artifact (#310): a rejected one stores as `title: undefined`
 * and the quote is kept. Deliberately no proper-noun check — a title is a plate,
 * not a sentence, and a capitalized word in one is not the tell it is in a quote.
 */
export function validateTitle(
  title: string,
  quote: string,
): { ok: boolean; reason?: string } {
  const trimmed = title.trim();

  if (trimmed.length < 3) return { ok: false, reason: "too short" };
  if (trimmed.length > TITLE_MAX_LENGTH) return { ok: false, reason: "too long" };

  if (/[.!?]$/.test(trimmed)) {
    return { ok: false, reason: "terminal punctuation" };
  }

  const lower = trimmed.toLowerCase();
  for (const term of MEDICAL_BLOCKLIST) {
    if (lower.includes(term)) return { ok: false, reason: `blocked term: ${term}` };
  }

  if (quote.trim().toLowerCase().startsWith(lower)) {
    return { ok: false, reason: "verbatim prefix of the quote" };
  }

  // Prompt asks for a 2-3 word plate (quotesPrompt.ts) — enforce it.
  const words = trimmed.split(/\s+/).length;
  if (words < 2 || words > 3) {
    return { ok: false, reason: `expected 2-3 words, got ${words}` };
  }

  return { ok: true };
}
