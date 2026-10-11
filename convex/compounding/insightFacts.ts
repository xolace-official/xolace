/**
 * The raw material steadiness insights are written from (#526). Code finds
 * the facts; the model only judges whether one is a real revelation and
 * writes it (ADR 0019). Meaning comes from RAG: the heaviest sessions'
 * neighbours in other domains are thread candidates, and the lightest
 * endings' neighbours show whether relief like that recurs. Counting is code:
 * how sessions ended against the later check-in, which parts of life went
 * quiet while another took over, and what never appears in a domain (vector
 * search can't find absence). Pure apart from the injected search.
 */
import type { Domain } from "../lib/understandingVocab";

export type FactSession = {
  id: string;
  at: number;
  domains: Domain[];
  intensity: number;
  /** A joy- or love-family emotion. */
  good: boolean;
  /** How it sat at the end: lighter, same, heavier, unsure. */
  moodAfter: string | null;
  /** The later check-in's answer. */
  checkIn: string | null;
  /** Texture life areas (people, places) beside its domains. */
  alsoAbout: string[];
  theirWords: string[];
  /** What to search with; null for a crisis session (metadata only). */
  text: string | null;
};

type Opts = {
  now: number;
  when: (at: number) => string;
  /** Ids of the sessions most like this text, in the person's own namespace. */
  search: (text: string) => Promise<string[]>;
};

const DAY = 86_400_000;
const QUIET_DAYS = 21;
// ponytail: fixed thresholds, not each part's own rhythm. A part that comes up
// monthly reads as "dropped out" after 21 days with 3+ sessions behind it.
const DROPPED_MIN = 3;
/** How much more of the space since a domain must take to count as taking over. */
const TAKEOVER_GROWTH = 0.25;
const ABSENCE_MIN = 4;
const ABSENCE_SPAN_DAYS = 28;
const LIGHT_INTENSITY = 4;
const HEAVY_INTENSITY = 6;
const HEAVY_SEEDS = 5;
const RELIEF_SEEDS = 3;
const CANDIDATES = 5;

const endedLighter = (s: FactSession) =>
  s.moodAfter === "lighter" || s.checkIn === "lighter" || s.checkIn === "processed";
const fine = (mood: FactSession["moodAfter"]) => mood === "lighter" || mood === "same";
const words = (s: FactSession) => new Set(s.theirWords.flatMap((w) => w.toLowerCase().match(/[a-z']{4,}/g) ?? []));
const touched = (s: FactSession, domain: Domain) => s.domains.includes(domain);

export async function rawMaterial(sessions: FactSession[], { now, when, search }: Opts) {
  const byId = new Map(sessions.map((s) => [s.id, s]));
  const oldest = [...sessions].sort((a, b) => a.at - b.at);
  const domains = [...new Set(oldest.flatMap((s) => s.domains))];

  const asked = new Map<string, Promise<string[]>>();
  const neighbours = async (s: FactSession) => {
    if (!s.text) return []; // a crisis session's words never leave as a query
    if (!asked.has(s.id)) asked.set(s.id, search(s.text).catch(() => []));
    return (await asked.get(s.id)!).flatMap((id) => (id !== s.id && byId.has(id) ? [byId.get(id)!] : []));
  };

  const heavy = [...sessions]
    .filter((s) => s.text && s.intensity >= HEAVY_INTENSITY)
    .sort((a, b) => b.intensity - a.intensity || b.at - a.at)
    .slice(0, HEAVY_SEEDS);
  const seen = new Set<string>();
  const threadCandidates = [];
  for (const seed of heavy) {
    const other = (await neighbours(seed)).filter((n) => n.domains.some((d) => !seed.domains.includes(d)));
    const ids = [seed, ...other].map((s) => s.id);
    const key = [...ids].sort().join();
    if (other.length === 0 || seen.has(key)) continue;
    seen.add(key);
    const theirs = words(seed);
    const shared = new Set(other.flatMap((n) => [...words(n)].filter((w) => theirs.has(w))));
    threadCandidates.push({
      sessions: ids,
      domains: [...new Set([seed, ...other].flatMap((s) => s.domains))],
      sharedWords: [...shared],
    });
  }

  const reliefScore = (s: FactSession) =>
    (s.checkIn === "processed" ? 3 : s.checkIn === "lighter" ? 2 : 0) + (s.moodAfter === "lighter" ? 1 : 0) + (s.good ? 1 : 0);
  const reliefSources = [];
  for (const s of sessions
    .filter(endedLighter)
    .sort((a, b) => reliefScore(b) - reliefScore(a) || a.intensity - b.intensity)
    .slice(0, RELIEF_SEEDS)) {
    reliefSources.push({
      sessionId: s.id,
      about: s.domains,
      alsoAbout: s.alsoAbout,
      alike: (await neighbours(s)).map((n) => ({ sessionId: n.id, domains: n.domains, endedLighter: endedLighter(n) })),
    });
  }

  return {
    threadCandidates: threadCandidates.slice(0, CANDIDATES),
    reliefSources,
    sayVsAfter: sayVsAfter(oldest, domains),
    crowdingOut: crowdingOut(oldest, now, when),
    absences: absences(oldest, domains, when),
  };
}

function sayVsAfter(oldest: FactSession[], domains: Domain[]) {
  return domains.flatMap((domain) => {
    const pairs = oldest.filter((s) => touched(s, domain) && s.moodAfter && s.checkIn);
    if (pairs.length < 2) return [];
    return [{
      domain,
      endedThenCheckIn: pairs.map((s) => ({ sessionId: s.id, ended: s.moodAfter, checkIn: s.checkIn })),
      heavierAfterEndingFine: pairs.filter((s) => fine(s.moodAfter) && s.checkIn === "heavier").length,
    }];
  });
}

/** A domain or a texture area that came up, then stopped while the person kept coming and something else filled the space. */
function crowdingOut(oldest: FactSession[], now: number, when: Opts["when"]) {
  const parts = [...new Set(oldest.flatMap((s) => [...s.domains, ...s.alsoAbout]))];
  const has = (s: FactSession, part: string) => (s.domains as string[]).includes(part) || s.alsoAbout.includes(part);
  const share = (list: FactSession[], d: Domain) => list.filter((s) => touched(s, d)).length / list.length;
  return parts.flatMap((part) => {
    const mine = oldest.filter((s) => has(s, part));
    const lastAt = mine[mine.length - 1].at;
    const before = oldest.filter((s) => s.at <= lastAt);
    const since = oldest.filter((s) => s.at > lastAt);
    if (mine.length < DROPPED_MIN || now - lastAt < QUIET_DAYS * DAY || since.length < 3) return [];
    const growth = (d: Domain) => share(since, d) - share(before, d);
    const took = [...new Set(since.flatMap((s) => s.domains))]
      .filter((d) => d !== part && since.filter((s) => touched(s, d)).length >= 2 && growth(d) >= TAKEOVER_GROWTH)
      .sort((a, b) => growth(b) - growth(a));
    return took.length ? [{ wentQuiet: part, lastSeen: when(lastAt), sessionsBefore: mine.length, sinceThenMostlyAbout: took }] : [];
  });
}

function absences(oldest: FactSession[], domains: Domain[], when: Opts["when"]) {
  return domains.flatMap((domain) => {
    const mine = oldest.filter((s) => touched(s, domain));
    if (mine.length < ABSENCE_MIN || mine[mine.length - 1].at - mine[0].at < ABSENCE_SPAN_DAYS * DAY) return [];
    const fact = {
      domain,
      sessions: mine.length,
      since: when(mine[0].at),
      neverEndedLighter: !mine.some(endedLighter),
      neverALightOne: !mine.some((s) => s.good || s.intensity <= LIGHT_INTENSITY),
      neverAGoodOne: !mine.some((s) => s.good),
    };
    return fact.neverEndedLighter || fact.neverALightOne || fact.neverAGoodOne ? [fact] : [];
  });
}
