import type { Doc } from "../../_generated/dataModel";
import { CATALOG_BY_KEY } from "./catalog";
import { freeEmotionFamily } from "../../lib/understandingVocab";

/**
 * Kindling content binder (docs/paths-v1.md §2.3, §8; #332).
 *
 * The model picks an action TYPE; this pure function picks the concrete
 * target. Deterministic on Understanding fields + candidate rows only — no
 * clock, no randomness, no model call — so the same session always binds
 * the same slug and a re-run is a no-op.
 */

export type BindTrack = Pick<
  Doc<"audio_tracks">,
  "slug" | "family" | "topic" | "tags" | "active" | "series"
>;

export interface BindUnderstanding {
  primaryEmotion: string;
  secondaryEmotion?: string;
  thematicTags: string[];
  suggestedSpecialty: Doc<"emotional_metadata">["suggestedSpecialty"];
  /** Life areas of the compounding domains tonight touched (#521): tie-breakers, never a gate. */
  compoundingTags?: string[];
}

/** A Library entry the reader hasn't finished, with the facets that matched this Understanding. */
export interface BindEntry {
  slug: string;
  emotions: string[]; // `emotion` facet slugs
  lifeAreas: string[]; // `lifeArea` facet slugs
}

export type BoundParams = { slug: string } | { exercise: string } | { specialty: string };

/** Track 2 "Reality, Not False Hope" — the one cross-topic series (§3.1). */
export const REFRAME_SERIES = "reality-not-false-hope";

/** FNV-1a — deterministic, no randomness/clock, spreads ties across sessions. */
function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function bindTwig(
  actionType: string,
  u: BindUnderstanding,
  tracks: readonly BindTrack[],
  entries: readonly BindEntry[] = [],
): BoundParams | null {
  switch (actionType) {
    case "read":
      return bindEntry(u, entries);
    case "breathing":
      return { exercise: "sit-with-this" };
    case "bridge":
      return { exercise: "trusted-bridge" };
    case "xolacer":
      // The person is chosen at read time by `xolacerChat.sessionSuggestion`
      // and never stored — only the ranker's resolved specialty travels.
      return u.suggestedSpecialty ? { specialty: u.suggestedSpecialty } : null;
    default:
      return bindTrack(actionType, u, tracks);
  }
}

function bindTrack(
  actionType: string,
  u: BindUnderstanding,
  tracks: readonly BindTrack[],
): { slug: string } | null {
  const entry = CATALOG_BY_KEY.get(actionType);
  if (!entry) return null;

  // Acuity `tier` is editorial (tone, review process, Browse grouping) — it
  // never gates binding. Standalones and episodes of a topic compete on tags.
  const family = actionType.startsWith("music_topic_") ? "music" : "support";
  const candidates = tracks.filter(
    (t) =>
      t.active &&
      t.family === family &&
      (actionType === "episode_reframe" ? t.series === REFRAME_SERIES : t.topic === actionType),
  );
  if (candidates.length === 0) return null;

  const wanted = new Set([
    ...understoodEmotions(u),
    ...u.thematicTags,
    ...(u.compoundingTags ?? []),
    ...entry.emotions,
    ...entry.themes,
  ]);
  const score = (t: BindTrack) => t.tags.filter((tag) => wanted.has(tag)).length;

  return pickSeeded(candidates, score, u);
}

/**
 * The read twig (#412): a plain facet join, no catalogue indirection
 * (ADR 0015) — the Understanding's emotions against `emotion` facets, its
 * thematic tags against `lifeArea`. Finished entries never reach here.
 */
function bindEntry(u: BindUnderstanding, entries: readonly BindEntry[]): { slug: string } | null {
  const emotions = new Set(understoodEmotions(u));
  const areas = new Set(u.thematicTags);
  const score = (e: BindEntry) =>
    e.emotions.filter((s) => emotions.has(s)).length + e.lifeAreas.filter((s) => areas.has(s)).length;
  const candidates = entries.filter((e) => score(e) > 0);
  return candidates.length === 0 ? null : pickSeeded(candidates, score, u);
}

/**
 * The Understanding's emotions plus their parents, so finer labels still meet
 * older tags (ADR 0018), and a free-text secondary meets the emotion it means (#536).
 */
export function understoodEmotions(u: Pick<BindUnderstanding, "primaryEmotion" | "secondaryEmotion">): string[] {
  return [...new Set([u.primaryEmotion, ...(u.secondaryEmotion ? [u.secondaryEmotion] : [])].flatMap(freeEmotionFamily))];
}

function pickSeeded<T extends { slug: string }>(
  candidates: readonly T[],
  score: (c: T) => number,
  u: BindUnderstanding,
): { slug: string } {
  // Sort first so the tied set (and its order) is independent of input order,
  // then spread ties deterministically across sessions via a seeded hash.
  const sorted = [...candidates].sort(
    (a, b) => score(b) - score(a) || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0),
  );
  const topScore = score(sorted[0]);
  const tied = sorted.filter((t) => score(t) === topScore);
  const canonicalTags = [...new Set(u.thematicTags)].sort();
  const seed = [u.primaryEmotion, u.secondaryEmotion ?? "", ...canonicalTags].join("|");
  const pick = tied[hashSeed(seed) % tied.length];
  return { slug: pick.slug };
}
