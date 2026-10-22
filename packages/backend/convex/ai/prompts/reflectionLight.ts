/**
 * Reflection Agent — post-session LIGHT PASS prompt (Cognition Layer Phase 3).
 *
 * A single Haiku call, no tool loop. Reads the just-completed session's
 * Understanding + the current narrative profile + a short recency window, and
 * rewrites only the fast-moving `trajectory` line ("where things have been
 * heading recently"). Everything else — recurring themes, emotional
 * signatures, calibration — is the consolidation pass's job.
 *
 * User-safe, non-clinical language from day one (the profile is progressively
 * rendered to the user). Negative examples only, per
 * feedback_prompt_examples_cause_fixation — positive examples cause the model
 * to fixate and mode-collapse toward them.
 */

/** One recent session's Understanding, newest-first in the caller's window. */
export interface LightPassMetadataRow {
  primaryEmotion: string;
  granularLabel?: string;
  intensity: number;
  thematicTags: string[];
  userLanguageTags: string[];
  temporalContext?: string;
  createdAt: number;
}

export interface LightPassContext {
  // The just-completed session.
  justCompleted: LightPassMetadataRow | null;
  // The current rendered narrative profile, or null before the first version.
  currentProfile: string | null;
  // The last ~8 Understanding rows (recency signal), newest first.
  recentMetadata: LightPassMetadataRow[];
}

function renderRow(row: LightPassMetadataRow): string {
  const parts = [
    row.primaryEmotion,
    row.granularLabel ? `(${row.granularLabel})` : null,
    `intensity ${row.intensity}/10`,
    row.thematicTags.length > 0 ? `themes: ${row.thematicTags.join(", ")}` : null,
    row.userLanguageTags.length > 0
      ? `their words: ${row.userLanguageTags.join(", ")}`
      : null,
    row.temporalContext ? row.temporalContext : null,
  ].filter((p): p is string => !!p);
  return `- ${parts.join(" | ")}`;
}

/**
 * Build the system + user prompt for the trajectory refresh.
 */
export function buildLightPassPrompt(ctx: LightPassContext): {
  system: string;
  user: string;
} {
  const system = `You maintain the "recent trajectory" line of a person's emotional profile inside Xolace — an app that helps people notice and name what they are feeling.

Your ONLY job right now: write 1-3 sentences describing where this person's emotional weather has been heading lately, given their newest session and the recent ones before it. This is the fast-moving line of a longer profile; you are not rewriting who they are, only the direction of travel.

Write it as a quiet, grounded observation a thoughtful friend might make — something that could be shown to the person themselves without startling or labeling them.

## What NOT to do
- Do NOT diagnose, use clinical terms, or name disorders.
- Do NOT give advice, reassurance, or silver linings.
- Do NOT address the person as "you" — write in the third person ("They have been...").
- Do NOT invent specifics (names, events) that are not in the data.
- Do NOT make safety, crisis, or risk judgments — that is handled elsewhere, never here.
- Do NOT exceed 3 sentences.
- Do NOT wrap the output in JSON, quotes, or labels.

## Output
Respond with ONLY the trajectory text — the bare 1-3 sentences, nothing else.`;

  const profileBlock = ctx.currentProfile
    ? `## Current profile (for continuity)\n${ctx.currentProfile}`
    : `## Current profile\n(none yet — this is the first read of this person)`;

  const justBlock = ctx.justCompleted
    ? `## The session that just completed\n${renderRow(ctx.justCompleted)}`
    : `## The session that just completed\n(no classification available)`;

  const recentBlock =
    ctx.recentMetadata.length > 0
      ? `## Recent sessions before it (newest first)\n${ctx.recentMetadata
          .map(renderRow)
          .join("\n")}`
      : `## Recent sessions before it\n(none)`;

  const user = `${justBlock}\n\n${recentBlock}\n\n${profileBlock}`;

  return { system, user };
}

/**
 * Normalize raw model output into a trajectory string, or null when the model
 * returned nothing usable. Strips surrounding quotes / code fences only — the
 * sentence is never truncated (a mid-sentence cut ruins the trajectory);
 * generation length is bounded by max_tokens on the call instead.
 */
export function parseLightPassResponse(raw: string): { trajectory: string } | null {
  const cleaned = raw
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();

  if (!cleaned) return null;

  return { trajectory: cleaned };
}
