/**
 * The steadiness-insight quality gate (#525, #526, ADR 0019): pure, so every
 * rule is a test. An insight is kept only if it is grounded (citable sessions
 * that touched what it names, spread across time, kind-specific evidence, the
 * score's direction) and is neither a template line nor a recap of their log.
 * A rejection's reason goes back to the model, so it can try again with
 * something real. shownNow is the read-time half: unlock, settled, stale.
 */
import type { Domain } from "../lib/understandingVocab";

/** Cross-domain, under the overall dial: one thread under separate problems, and crowding out. */
export const OVERALL_KINDS = ["thread", "crowding"] as const;
/** In one domain's detail card: what you say vs what happens after, where relief came from, what never appears. */
export const DOMAIN_KINDS = ["say_vs_after", "relief", "absence"] as const;
export const INSIGHT_KINDS = [...OVERALL_KINDS, ...DOMAIN_KINDS] as const;
export type InsightKind = (typeof INSIGHT_KINDS)[number];
export const DIRECTIONS = ["lower", "higher", "none"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const isOverall = (kind: string) => (OVERALL_KINDS as readonly string[]).includes(kind);

export type InsightDraft = {
  kind: InsightKind;
  /** One domain; an overall insight names every domain it spans, the lead one first. */
  domains: Domain[];
  text: string;
  citedSessionIds: string[];
  /** What the text says about its first domain now against its usual. */
  direction: Direction;
};

/** A session this person may be shown a citation of: theirs, kept, still here. */
export type CitableSession = { id: string; at: number; domains: Domain[]; lighter: boolean; checkedIn: boolean };

export type GateEvidence = {
  sessions: Map<string, CitableSession>;
  /** Raw (ungated) steadiness and baseline per domain. */
  domains: Map<Domain, { steadiness: number; baseline: number }>;
};

const DAY = 86_400_000;
/** Something only seen from a distance: its sessions span at least this, never one week. */
const SPAN_DAYS = 14;
const MIN_CHARS = 40;
const MAX_CHARS = 320;
const MIN_CONTENT_WORDS = 5;

// ponytail: word lists, not a classifier. Extend them when a bad insight slips through.
const SENSITIVE = /\b(trauma\w*|abus\w*|neglect\w*|addict\w*)\b/i;
const CLINICAL = /\b(diagnos\w*|disorders?|symptoms?|clinical\w*|ptsd|bipolar|depression|therap\w*)\b/i;
/** The machinery's words, never the person's. */
const INTERNAL = /\b(intensity|classifier|confidence|steadiness score|session ids?)\b/i;
const GENERIC = [
  /\bit'?s (okay|ok|normal|valid|understandable)\b/i,
  /\bbe (gentle|kind|patient) (with|to) yourself\b/i,
  /\bremember (to|that)\b/i,
  /\bself[- ]care\b/i,
  /\byou'?re not alone\b/i,
  /\bjourney\b/i,
  /\bit (seems|sounds|looks) like\b/i,
  /\bweighing on you\b/i,
  /\bon your mind\b/i,
  /\bprioriti[sz]\w*\b/i,
  /\bups and downs\b/i,
  /\bnavigat\w*\b/i,
  /\bresilien\w*\b/i,
  /\b(might|may) (want|be worth|help) to\b/i,
  /\btake (some )?time for\b/i,
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
/** "Aug 9" or "9 August": a date someone could look up in their log. */
const DATE = new RegExp(`\\b(?:${MONTH}\\s+\\d{1,2}(?:st|nd|rd|th)?|\\d{1,2}(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH})\\b`, "gi");
const MANY = "(?:\\d+|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|several)";
const NUM = `(?:one|${MANY})`;
/** "four times", "6 of your last 10", "twice": a tally, not a meaning. Durations ("eleven weeks"), "one of those" and "once you've" pass. */
const COUNT = new RegExp(`\\b(?:${NUM}\\s+(?:times|sessions?|conversations?)|${MANY}\\s+(?:of|out of)\\s+(?:your|the|those|these|them|its|last)|twice)\\b`, "i");
/** A quoted span: 'fine', "fine", ‘fine’, “fine”. Apostrophes inside words don't open one. */
const QUOTE = /(?:^|[\s(—–-])['"‘“]([^'"‘’“”]{1,60}?)['"’”](?=[\s.,;:!?)—–-]|$)/g;
const MAX_QUOTES = 2;

/** Words a score-and-counts template is made of; an insight needs more than these. */
const TEMPLATE_WORDS = new Set(
  (
    "steadiness usual normal normally heavier lighter heavy light lower higher below above lately recently " +
    "session sessions came come comes up times more less than any other part parts life been has have had " +
    "is was are were your you the of in on at to it its and or this that where sitting week weeks last " +
    "day days lowest highest point points score right now under over for with most often much very what " +
    "there still about things into been being lot quite some " +
    "self purpose future work studies love friendship family belonging health rest money home"
  ).split(" "),
);

type Result = { ok: true } | { ok: false; reason: string };
const no = (reason: string): Result => ({ ok: false, reason });

export function gateInsight(draft: InsightDraft, evidence: GateEvidence): Result {
  const { kind, domains, text } = draft;
  const named = new Set(domains);
  const overall = isOverall(kind);
  if (overall ? named.size < 2 || named.size !== domains.length : domains.length !== 1) {
    return no(overall ? "An overall insight names two domains or more, each once." : `A ${kind} insight names one domain.`);
  }

  const ids = [...new Set(draft.citedSessionIds)];
  if (ids.length < 2) return no("Cite at least two different sessions.");
  const cited: CitableSession[] = [];
  for (const id of ids) {
    const session = evidence.sessions.get(id);
    if (!session) return no(`Session ${id} can't be cited (burned, gone, or not in the evidence).`);
    // Relief is often found elsewhere: its lighter session may be about any part of life.
    if (kind !== "relief" && !session.domains.some((d) => named.has(d))) {
      return no(`Session ${id} doesn't touch ${domains.join(" or ")}.`);
    }
    cited.push(session);
  }
  for (const d of domains) {
    if (!cited.some((s) => s.domains.includes(d))) return no(`No cited session is about ${d}; cite at least one that is.`);
    // Its sessions are all past the loader's window: no score to store beside it (#535).
    if (!evidence.domains.has(d)) return no(`${d} has no score right now; leave it out.`);
  }
  if ((overall || kind === "absence") && cited.length < 3) {
    return no("This kind rests on at least three cited sessions.");
  }
  const at = cited.map((s) => s.at);
  if (Math.max(...at) - Math.min(...at) < SPAN_DAYS * DAY) {
    return no(`That reframes one moment. Cite sessions spread across at least ${SPAN_DAYS} days.`);
  }
  if (kind === "relief" && !cited.some((s) => s.lighter)) {
    return no("Nothing cited ended lighter, so it can't show where relief came from.");
  }
  if (kind === "say_vs_after" && cited.filter((s) => s.checkedIn).length < 2) {
    return no("Cite at least two sessions with a later check-in, or it can't show what happened after.");
  }

  const lead = evidence.domains.get(domains[0]);
  if (lead && draft.direction !== "none") {
    const actual = lead.steadiness < lead.baseline ? "lower" : lead.steadiness > lead.baseline ? "higher" : "at";
    if (actual !== draft.direction) {
      return no(`Wrong direction: ${domains[0]} is ${actual === "at" ? "at" : `${actual} than`} its usual right now.`);
    }
  }

  return textCheck(text, domains, evidence);
}

function textCheck(text: string, domains: Domain[], evidence: GateEvidence): Result {
  const t = text.trim();
  if (t.length < MIN_CHARS) return no("Too short to tell them anything.");
  if (t.length > MAX_CHARS) return no(`Too long; keep it under ${MAX_CHARS} characters.`);
  if (SENSITIVE.test(t) || CLINICAL.test(t)) return no("Uses a sensitive or clinical word.");
  if (INTERNAL.test(t)) return no("Uses internal numbers or terms the person never sees.");
  if (GENERIC.some((re) => re.test(t))) return no("Generic phrasing; say what their sessions show.");

  if ((t.match(DATE) ?? []).length >= 2) return no("A list of dates is a log recap, not an insight. Say what it means.");
  if (COUNT.test(t)) return no("A restated count is a log recap, not an insight. Say what it means.");
  const quotes = new Set([...t.matchAll(QUOTE)].map((m) => m[1].toLowerCase().trim()));
  if (quotes.size > MAX_QUOTES) return no("A string of their own quotes is a log recap, not an insight. Say what it means.");

  const scores = new Set(
    domains.flatMap((d) => {
      const n = evidence.domains.get(d);
      return n ? [Math.round(n.steadiness), Math.round(n.baseline)] : [];
    }),
  );
  if ((t.match(/\d+/g) ?? []).some((n) => Number(n) >= 10 && scores.has(Number(n)))) {
    return no("Restates the score; the screen already shows it.");
  }

  const content = (t.toLowerCase().match(/[a-z']{3,}/g) ?? []).filter((w) => !TEMPLATE_WORDS.has(w));
  if (content.length < MIN_CONTENT_WORDS) {
    return no("A template could write this from the score and counts; say what their sessions show.");
  }
  return { ok: true };
}

/** A domain as it stands now: its state, raw steadiness and reliable-change band. */
export type LiveDomain = { state: "warming" | "unlocked" | "settled"; steadiness: number; band: number };

/**
 * Read time: shown only once every named domain is unlocked, and its lead
 * domain settled if it says anything against "your usual". Hidden when stale:
 * a named domain's score has moved past its band since it was written.
 */
export function shownNow(
  row: { domains: Domain[]; direction?: Direction; scoresAt?: number[] },
  live: Map<Domain, LiveDomain>,
): boolean {
  if (!row.scoresAt || !row.direction) return false;
  const now = row.domains.map((d) => live.get(d));
  if (now.some((d) => !d || d.state === "warming")) return false;
  if (row.direction !== "none" && now[0]?.state !== "settled") return false;
  return now.every((d, i) => Math.abs(d!.steadiness - row.scoresAt![i]) <= d!.band);
}
