import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { readRow } from "../../library/reads";
import { MAX_TWIGS } from "./prompt";
import { slugKey } from "./bind";
import { isTryThis } from "./tryThis";

/**
 * Kindling history (#565, decided in #547): the person's own past twigs,
 * read back as a per-kind record for the next generation. Context for the
 * pick only — the why line never says it — plus one hard rule that withholds
 * a type they keep passing on. Reads Understanding (`episodicMatchKeys`) +
 * Memory (`paths` / `path_steps` / `library_reads`); no model call.
 *
 * Outcomes (#544): tended (`done`) > ignored > skipped. Ignored (pending on
 * a closed kindling) is neutral: it counts as offered, never as a skip. A
 * twig still pending on the active kindling isn't counted at all.
 */

/** One action type's own record; never compared across kinds. */
export interface KindRecord {
  actionType: string;
  tended: number;
  skipped: number;
  ignored: number; // offered, left pending on a closed kindling
  helped: number; // tended reads the reader marked helped
}

export interface KindlingHistory {
  kinds: KindRecord[];
  /**
   * Types whose last 2 verdicts are skips with no tend between. Ignored
   * offers are neutral, so they neither count nor break the streak: skip,
   * ignored, skip withholds; only a tend resets it.
   * ponytail: read from the pool only, so a tend outside it (older than the
   * last 10, not a match) can't break a streak; widen the pool if that bites.
   */
  skippedTwice: string[];
  /** `slugKey`s whose newest verdict is a skip: they lose binder ties (#566). A later tend clears it. */
  skippedSlugs: string[];
}

const WINDOW_MS = 90 * 86_400_000;
const RECENT = 10;
const MAX_POOL = 20;
const MAX_STEPS = 10;

export type ProfileId = Id<"emotional_profiles">;
type Verdict = "tended" | "skipped";

export const slugOf = (params: unknown) => {
  const slug = (params as { slug?: unknown } | null)?.slug;
  return typeof slug === "string" ? slug : undefined;
};

export const stepsOf = (ctx: QueryCtx, pathId: Id<"paths">) =>
  ctx.db
    .query("path_steps")
    .withIndex("by_path", (q) => q.eq("pathId", pathId))
    .take(MAX_STEPS);

export const kindlingsIn = (ctx: QueryCtx, profileId: ProfileId, from: number, to = Infinity) =>
  ctx.db
    .query("paths")
    .withIndex("by_emotionalProfileId_and_generatedAt", (q) =>
      q.eq("emotionalProfileId", profileId).gte("generatedAt", from).lte("generatedAt", to),
    )
    .order("desc")
    .take(RECENT);

/** The episodic matches' kindlings plus the last ten, deduplicated, newest first. */
async function historyPool(
  ctx: QueryCtx,
  profileId: ProfileId,
  matchKeys: readonly string[],
  now: number,
): Promise<Doc<"paths">[]> {
  const since = now - WINDOW_MS;
  const pool = new Map<Id<"paths">, Doc<"paths">>();
  for (const key of matchKeys.slice(0, MAX_POOL - RECENT)) {
    const sessionId = ctx.db.normalizeId("sessions", key);
    if (!sessionId) continue;
    const paths = await ctx.db
      .query("paths")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId))
      .take(2);
    for (const p of paths) {
      if (p.emotionalProfileId === profileId && p.generatedAt >= since) pool.set(p._id, p);
    }
  }
  for (const p of await kindlingsIn(ctx, profileId, since)) pool.set(p._id, p);
  return [...pool.values()].sort((a, b) => b.generatedAt - a.generatedAt).slice(0, MAX_POOL);
}

async function readHelped(ctx: QueryCtx, profileId: ProfileId, params: unknown): Promise<boolean> {
  const slug = slugOf(params);
  if (slug === undefined) return false;
  const entry = await ctx.db
    .query("library_entries")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .first();
  return entry ? (await readRow(ctx, profileId, entry._id))?.helped === true : false;
}

/** `matchKeys` empty = recent kindlings only (personal memory off, or no matches). */
export async function loadHistory(
  ctx: QueryCtx,
  profileId: ProfileId,
  matchKeys: readonly string[],
  now: number,
): Promise<KindlingHistory> {
  const records = new Map<string, KindRecord>();
  const verdicts = new Map<string, Verdict[]>(); // newest first
  const helpedSlugs = new Set<unknown>(); // one entry helps once, however often tended
  const slugVerdicts = new Map<string, Verdict>(); // newest verdict per slugKey
  for (const path of await historyPool(ctx, profileId, matchKeys, now)) {
    for (const step of await stepsOf(ctx, path._id)) {
      if (step.state === "pending" && path.status === "active") continue;
      const type = step.actionType;
      const r = records.get(type) ?? { actionType: type, tended: 0, skipped: 0, ignored: 0, helped: 0 };
      records.set(type, r);
      if (step.state === "pending") {
        r.ignored++;
        continue;
      }
      const verdict: Verdict = step.state === "done" ? "tended" : "skipped";
      const stepSlug = slugOf(step.params);
      const key = stepSlug === undefined ? undefined : slugKey(type, stepSlug);
      if (key !== undefined && !slugVerdicts.has(key)) slugVerdicts.set(key, verdict);
      if (verdict === "skipped") r.skipped++;
      else {
        r.tended++;
        if (type === "read" && !helpedSlugs.has(stepSlug) && (await readHelped(ctx, profileId, step.params))) {
          helpedSlugs.add(stepSlug);
          r.helped++;
        }
      }
      verdicts.set(type, [...(verdicts.get(type) ?? []), verdict]);
    }
  }
  return {
    // A kind only ever ignored has no record: ignored adds nothing on its own.
    kinds: [...records.values()]
      .filter((r) => r.tended + r.skipped > 0)
      .sort((a, b) => (a.actionType < b.actionType ? -1 : 1)),
    skippedTwice: [...verdicts]
      .filter(([, v]) => v[0] === "skipped" && v[1] === "skipped")
      .map(([type]) => type)
      .sort(),
    skippedSlugs: [...slugVerdicts]
      .filter(([, v]) => v === "skipped")
      .map(([slug]) => slug)
      .sort(),
  };
}

/**
 * The hard rule: drop each skipped-twice type from this generation's
 * catalog, but never below MAX_TWIGS bindable types — history can't cause a
 * no-ship. The next tend resets it (it's read fresh every generation).
 * The try-this family is one slot: a kindling holds at most one (#567).
 */
export function withhold<T extends { actionType: string }>(
  catalog: readonly T[],
  skippedTwice: readonly string[],
): { catalog: T[]; withheld: string[] } {
  const withheld: string[] = [];
  const slots = (without: string[]) =>
    new Set(catalog.filter((c) => !without.includes(c.actionType)).map((c) => (isTryThis(c.actionType) ? "try" : c.actionType))).size;
  for (const type of skippedTwice) {
    if (!catalog.some((c) => c.actionType === type)) continue;
    if (slots([...withheld, type]) >= MAX_TWIGS) withheld.push(type);
  }
  return { catalog: catalog.filter((c) => !withheld.includes(c.actionType)), withheld };
}
