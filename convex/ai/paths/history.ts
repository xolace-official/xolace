import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { readRow } from "../../library/reads";
import { domainOf, type Domain } from "../../lib/understandingVocab";
import { MAX_TWIGS } from "./prompt";

/**
 * Kindling history (#565, decided in #547): the person's own past twigs,
 * read back as a per-kind record for the next generation. Context for the
 * pick only — the why line never says it — plus one hard rule that withholds
 * a type they keep passing on. Reads Understanding (`episodicMatchKeys`) +
 * Memory (`paths` / `path_steps` / `library_reads`); no model call.
 *
 * Outcomes (#544): tended (`done`) > ignored > skipped. A pending twig adds
 * nothing either way — ignored on a closed kindling, still open on the
 * active one.
 */

/** One action type's own record; never compared across kinds. */
export interface KindRecord {
  actionType: string;
  tended: number;
  skipped: number;
  helped: number; // tended reads the reader marked helped
}

export interface KindlingHistory {
  kinds: KindRecord[];
  /** Types skipped on each of their last 2 offers with no tend between. */
  skippedTwice: string[];
}

const WINDOW_MS = 90 * 86_400_000;
const RECENT = 10;
const MAX_POOL = 20;
const MAX_STEPS = 10;

type ProfileId = Id<"emotional_profiles">;
type Verdict = "tended" | "skipped";

const stepsOf = (ctx: QueryCtx, pathId: Id<"paths">) =>
  ctx.db
    .query("path_steps")
    .withIndex("by_path", (q) => q.eq("pathId", pathId))
    .take(MAX_STEPS);

const kindlingsIn = (ctx: QueryCtx, profileId: ProfileId, from: number, to = Infinity) =>
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
  const slug = (params as { slug?: unknown } | null)?.slug;
  if (typeof slug !== "string") return false;
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
  for (const path of await historyPool(ctx, profileId, matchKeys, now)) {
    for (const step of await stepsOf(ctx, path._id)) {
      if (step.state === "pending") continue;
      const type = step.actionType;
      const verdict: Verdict = step.state === "done" ? "tended" : "skipped";
      const r = records.get(type) ?? { actionType: type, tended: 0, skipped: 0, helped: 0 };
      if (verdict === "skipped") r.skipped++;
      else {
        r.tended++;
        const slug = (step.params as { slug?: unknown } | null)?.slug;
        if (type === "read" && !helpedSlugs.has(slug) && (await readHelped(ctx, profileId, step.params))) {
          helpedSlugs.add(slug);
          r.helped++;
        }
      }
      records.set(type, r);
      verdicts.set(type, [...(verdicts.get(type) ?? []), verdict]);
    }
  }
  return {
    kinds: [...records.values()].sort((a, b) => (a.actionType < b.actionType ? -1 : 1)),
    skippedTwice: [...verdicts]
      .filter(([, v]) => v[0] === "skipped" && v[1] === "skipped")
      .map(([type]) => type)
      .sort(),
  };
}

/**
 * What was tended during this domain's previous stretch, on kindlings whose
 * session touched the domain — read for a returning stretch only.
 */
export async function tendedBefore(
  ctx: QueryCtx,
  profileId: ProfileId,
  domain: Domain,
  startedAt: number,
): Promise<string[]> {
  const previous = await ctx.db
    .query("compounding_stretches")
    .withIndex("by_emotionalProfileId_and_domain_and_startedAt", (q) =>
      q.eq("emotionalProfileId", profileId).eq("domain", domain).lt("startedAt", startedAt),
    )
    .order("desc")
    .first();
  if (previous?.endedAt === undefined) return [];

  const tended = new Set<string>();
  for (const path of await kindlingsIn(ctx, profileId, previous.startedAt, previous.endedAt)) {
    const u = await ctx.db
      .query("emotional_metadata")
      .withIndex("by_session", (q) => q.eq("sessionId", path.sessionId))
      .unique();
    if (!u?.thematicTags.some((t) => domainOf(t) === domain)) continue;
    for (const step of await stepsOf(ctx, path._id)) {
      if (step.state === "done") tended.add(step.actionType);
    }
  }
  return [...tended].sort();
}

/**
 * The hard rule: drop each skipped-twice type from this generation's
 * catalog, but never below MAX_TWIGS bindable types — history can't cause a
 * no-ship. The next tend resets it (it's read fresh every generation).
 */
export function withhold<T extends { actionType: string }>(
  catalog: readonly T[],
  skippedTwice: readonly string[],
): { catalog: T[]; withheld: string[] } {
  const withheld: string[] = [];
  for (const type of skippedTwice) {
    if (catalog.length - withheld.length <= MAX_TWIGS) break;
    if (catalog.some((c) => c.actionType === type)) withheld.push(type);
  }
  return { catalog: catalog.filter((c) => !withheld.includes(c.actionType)), withheld };
}
