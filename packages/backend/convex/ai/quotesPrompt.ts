// =============================================================
// SESSION-DERIVED QUOTE PROMPT — pure assembly logic (Cognition Layer
// transition, additive/fallback design).
//
// Kept free of Convex ctx and the Anthropic client so it stays
// unit-testable; the action/orchestration side lives in quotesDistiller.ts.
// =============================================================

export type QuoteSession = {
  sessionId: string;
  sessionCreatedAt: number;
  primaryEmotion: string;
  granularLabel?: string;
  thematicTags: string[];
  intensity: number;
};

/**
 * A reply the user wrote back to one of their quotes. Raw user text — the one
 * place it reaches this prompt, bounded by the constants below and guarded by
 * the NEVER line plus `validateQuote`'s overlap check
 * (docs/adr/0006-replies-cross-the-quote-metadata-boundary.md).
 */
export type QuoteReply = {
  text: string;
  repliedAt: number;
  flagged: boolean;
};

/** Tunable aperture. The query and the block are identical at 1. */
export const REPLY_CONTEXT_COUNT = 3;
export const REPLY_CONTEXT_WINDOW_DAYS = 7;
export const REPLY_CONTEXT_MAX_CHARS = 280;

/**
 * The aperture, as one pure pass: drop flagged replies, drop anything older
 * than the window, newest first, at most `REPLY_CONTEXT_COUNT`, each truncated
 * to `REPLY_CONTEXT_MAX_CHARS`. Called by `loadRecentReplies` so the bounds are
 * tested here rather than against the database.
 */
export function selectReplyContext(
  replies: QuoteReply[],
  now: number,
): { text: string; repliedAt: number }[] {
  const cutoff = now - REPLY_CONTEXT_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  return replies
    .filter((r) => !r.flagged && r.repliedAt >= cutoff && r.text.trim().length > 0)
    .sort((a, b) => b.repliedAt - a.repliedAt)
    .slice(0, REPLY_CONTEXT_COUNT)
    .map((r) => {
      const text = r.text.trim();
      return {
        repliedAt: r.repliedAt,
        text:
          text.length > REPLY_CONTEXT_MAX_CHARS
            ? `${text.slice(0, REPLY_CONTEXT_MAX_CHARS).trimEnd()}…`
            : text,
      };
    });
}

function recencyLabel(now: number, at: number): string {
  const daysAgo = Math.max(1, Math.round((now - at) / (1000 * 60 * 60 * 24)));
  return daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`;
}

/**
 * Assembles the system/user prompt for a session-derived quote. Drives off
 * the semantic profile (recurring themes + trajectory) when one exists, with
 * the 2-session summary folded in as a recency signal. Falls back to the
 * recency-only summary verbatim for cold-start users with no profile yet
 * (see docs/cognition-layer-architecture.md).
 */
export function buildQuotePrompt(params: {
  angleSeed: string;
  now: number;
  sessions: QuoteSession[];
  renderedProfile: string | null;
  preferredThemes: string[];
  recentQuoteTexts: string[];
  recentQuoteTitles: string[];
  replies?: { text: string; repliedAt: number }[];
}): { systemPrompt: string; userPrompt: string } {
  const {
    angleSeed,
    now,
    sessions,
    renderedProfile,
    preferredThemes,
    recentQuoteTexts,
    recentQuoteTitles,
    replies = [],
  } = params;

  const emotionalSummary: string = sessions
    .map((s) => {
      const label = s.granularLabel ?? s.primaryEmotion;
      const tags = s.thematicTags.length > 0 ? ` (${s.thematicTags.join(", ")})` : "";
      return `- ${label}, intensity ${s.intensity}/10${tags} — ${recencyLabel(now, s.sessionCreatedAt)}`;
    })
    .join("\n");

  const systemPrompt = `You are given the emotional themes from a user's recent reflections. Write one original line that captures the emotional experience without being specific, something a thoughtful writer found for themselves and wanted to keep.

Work in two steps:
1. Recall 2-3 real lines, aphorisms, poetry, proverbs, quotes that already live near this emotional territory.
2. Write ONE original line in that same register. It must not be attributable to any of them: no close paraphrase, no borrowed image. You are taking the register, not the words.

Output ONLY this JSON, nothing before or after:
{"seeds": ["...", "..."], "title": "...", "quote": "..."}

The title:
- A plate above the quote, not a summary of it: 2-3 words, at most 20 characters
- Names the territory the quote sits in, never restates its opening words
- No ending period, question mark, or exclamation mark
- No medical or clinical terminology

The quote:
- Aphorism shape: one sentence, around 20 words, sayable in a single breath. If the thought does not fit, find a smaller way to say it — never leave a cut-off fragment.
- Poetic but grounded, not therapy-speak
- Second person (You) or first person
- No specific details from the session (the quote will be shared publicly)
- No medical or clinical terminology
- Must be able to stand alone without any context
- Pass the "would someone screenshot this?" test
- Enter through the lens of: ${angleSeed}, use this as a poetic entry point, not a literal theme

NEVER (these produce a reflection of the reader, not a quote):
- NEVER narrate the reader's progress or inner process — no "You're beginning to...", "You're learning that...", "Part of you knows..."
- NEVER explain, interpret, or reassure about what the reader feels or why
- NEVER chain clauses with semicolons or stacked commas ("the X, the Y, the Z")
- NEVER reference the reader's situation or session details directly; the emotional register should feel personally resonant, not descriptive of specifics
- NEVER quote, paraphrase, or reference the specifics of a reply the reader wrote — take its register, not its content`;

  const themesLine =
    preferredThemes.length > 0
      ? `\nPreferred themes (align naturally with one if fitting): ${preferredThemes.join(", ")}`
      : "";

  const avoidLine =
    recentQuoteTexts.length > 0
      ? `\nRecent quotes already shown — do NOT reuse these framings, metaphors, or angles:\n${recentQuoteTexts.map((t) => `- "${t}"`).join("\n")}`
      : "";

  const avoidTitlesLine =
    recentQuoteTitles.length > 0
      ? `\nRecent titles already used — pick a different one:\n${recentQuoteTitles.map((t) => `- "${t}"`).join("\n")}`
      : "";

  const repliesLine =
    replies.length > 0
      ? `\nWhat they wrote back to recent quotes, their own words, newest first — the live signal. Take the register, never the content:\n${replies
          .map((r) => `- "${r.text}" — ${recencyLabel(now, r.repliedAt)}`)
          .join("\n")}`
      : "";

  const contextBlock = renderedProfile
    ? `Longitudinal emotional profile:\n${renderedProfile}\n\nRecent signal (last few days):\n${emotionalSummary}`
    : `Recent emotional themes:\n${emotionalSummary}`;

  const userPrompt = `${contextBlock}${repliesLine}${themesLine}${avoidLine}${avoidTitlesLine}\n\nGenerate a quote:`;

  return { systemPrompt, userPrompt };
}

/**
 * Parses the seed-and-write JSON response. Tolerates the model wrapping the
 * object in prose or a ```json fence by slicing to the outermost braces.
 * Returns null when there is no usable quote — the caller retries or skips.
 * A missing or non-string `title` is not a parse failure: the title is soft and
 * the quote still stands without it (#310).
 */
export function parseQuoteResponse(
  raw: string,
): { quote: string; seeds: string[]; title?: string } | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      quote?: unknown;
      seeds?: unknown;
      title?: unknown;
    };
    const quote = typeof parsed.quote === "string" ? parsed.quote.trim() : "";
    if (!quote) return null;

    const seeds = Array.isArray(parsed.seeds)
      ? parsed.seeds.filter((s): s is string => typeof s === "string")
      : [];
    const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
    return title ? { quote, seeds, title } : { quote, seeds };
  } catch {
    return null;
  }
}
