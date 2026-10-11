/**
 * The steadiness-insight quality gate (#525, #526, ADR 0019). Failure modes:
 * an insight shown that cites under two sessions, a burned or someone else's
 * session, or sessions that never touched its domains; one a template could
 * write (restating the score, "came up in 6 of 10 sessions"); generic comfort;
 * a sensitive life area or clinical label; one contradicting the score's
 * direction. And the #526 bar: a log recap (a list of dates, a string of their
 * own quotes, a restated count) or a mirror-style reframe of one moment (its
 * sessions bunched in a single week) passing as a revelation; an overall
 * insight resting on one domain; a "what you say vs after" with no check-ins
 * behind it; "where relief came from" citing nothing that ended lighter.
 * And a named domain with no live score (its sessions all past the loader's
 * window) crashing the save instead of being refused (#535).
 *
 * shownNow (read time): an insight shown before its domains unlock, one
 * leaning on "your usual" before the domain settles, or one left beside a
 * score that has since moved past its reliable-change band.
 */
import { describe, expect, it } from "vitest";
import { gateInsight, shownNow, type CitableSession, type InsightDraft, type LiveDomain } from "./insightGate";

const DAY = 86_400_000;
const T = Date.UTC(2026, 9, 1);

const s = (id: string, daysAgo: number, domains: CitableSession["domains"], over: Partial<CitableSession> = {}): CitableSession => ({
  id, at: T - daysAgo * DAY, domains, lighter: false, checkedIn: false, ...over,
});

const sessions = new Map(
  [
    s("a", 60, ["work"]),
    s("b", 45, ["health"]),
    s("c", 30, ["money"]),
    s("d", 20, ["work"], { lighter: true, checkedIn: true }),
    s("e", 10, ["work"], { checkedIn: true }),
    s("f", 2, ["work"]),
    s("h", 4, ["work"]),
    s("g", 70, ["love"]),
    s("i", 50, ["love"]),
  ].map((x) => [x.id, x]),
);
const domains = new Map([
  ["work", { steadiness: 48, baseline: 66 }],
  ["health", { steadiness: 55, baseline: 61 }],
  ["money", { steadiness: 72, baseline: 64 }],
  ["love", { steadiness: 70, baseline: 70 }],
] as const);

const evidence = { sessions, domains };

const THREAD =
  "Work, sleep and money feel like three problems. In every heavy session across all three, the same thing is there: being behind. It's one weight, showing up in three places.";
const CROWDING =
  "Since work got heavy in July, your friends have dropped out of your sessions completely. It's been eleven weeks. Work didn't just get heavier, it took the space they used to have.";
const SAY_AFTER =
  "You end most work sessions saying 'fine'. Three days later your check-ins say heavier almost every time. 'Fine' is where it starts, not where it ends.";
const ABSENCE = "In four months you've never described a good day at work. Not one neutral one either.";

const draft = (over: Partial<InsightDraft> = {}): InsightDraft => ({
  kind: "thread",
  domains: ["work", "health", "money"],
  text: THREAD,
  citedSessionIds: ["a", "b", "c"],
  direction: "none",
  ...over,
});
const absence = (over: Partial<InsightDraft> = {}) =>
  draft({ kind: "absence", domains: ["work"], text: ABSENCE, citedSessionIds: ["a", "d", "e", "f"], ...over });

const reason = (d: InsightDraft) => {
  const r = gateInsight(d, evidence);
  return r.ok ? null : r.reason;
};

describe("gateInsight", () => {
  it.each<[string, Partial<InsightDraft>]>([
    ["one thread", {}],
    ["crowding out", { kind: "crowding", domains: ["work", "love"], text: CROWDING, citedSessionIds: ["g", "i", "a", "f"], direction: "lower" }],
    ["say vs after", { kind: "say_vs_after", domains: ["work"], text: SAY_AFTER, citedSessionIds: ["d", "e", "a"] }],
    ["absence", { kind: "absence", domains: ["work"], text: ABSENCE, citedSessionIds: ["a", "d", "e", "f"] }],
  ])("passes the bar's %s", (_, over) => {
    expect(gateInsight(draft(over), evidence)).toEqual({ ok: true });
  });

  it("needs two distinct cited sessions", () => {
    expect(reason(absence({ citedSessionIds: ["a", "a"] }))).toMatch(/two/);
  });

  it("refuses a session that isn't citable (burned, missing, someone else's)", () => {
    expect(reason(draft({ citedSessionIds: ["a", "b", "zzz"] }))).toMatch(/can't be cited/);
  });

  it("refuses a cited session that touched none of its domains", () => {
    expect(reason(absence({ citedSessionIds: ["a", "e", "c"] }))).toMatch(/touch/);
  });

  describe("overall insights", () => {
    it("name at least two domains", () => {
      expect(reason(draft({ domains: ["work"], citedSessionIds: ["a", "d", "f"] }))).toMatch(/two domains/);
    });

    it("cite sessions from at least two of them", () => {
      expect(reason(draft({ domains: ["work", "health"], citedSessionIds: ["a", "d", "f"] }))).toMatch(/health/);
    });

    it("rest on at least three sessions", () => {
      expect(reason(draft({ domains: ["work", "health"], citedSessionIds: ["a", "b"] }))).toMatch(/three/);
    });

    it("check direction against the domain they lead with", () => {
      const crowding = draft({ kind: "crowding", domains: ["work", "love"], text: CROWDING, citedSessionIds: ["g", "i", "a", "f"] });
      expect(reason({ ...crowding, direction: "higher" })).toMatch(/direction/);
      expect(reason({ ...crowding, direction: "lower" })).toBeNull();
      // Love sits exactly at its usual: neither lower nor higher.
      expect(reason({ ...crowding, domains: ["love", "work"], direction: "higher" })).toMatch(/direction/);
    });
  });

  it("refuses a domain with no score now: its only session is past the loader's window (#535)", () => {
    const noScore = { sessions, domains: new Map([...domains].filter(([d]) => d !== "work")) };
    const r = gateInsight(absence(), noScore);
    expect(r.ok ? null : r.reason).toMatch(/no score/i);
  });

  it("a per-domain insight names one domain", () => {
    expect(reason(absence({ domains: ["work", "health"], citedSessionIds: ["a", "b", "f"] }))).toMatch(/one domain/);
  });

  it("refuses a reframe of one moment: sessions bunched in under two weeks", () => {
    expect(reason(absence({ citedSessionIds: ["e", "h", "f"] }))).toMatch(/spread/);
    expect(reason(draft({ kind: "say_vs_after", domains: ["work"], text: SAY_AFTER, citedSessionIds: ["e", "f"] }))).toMatch(/spread/);
  });

  it("refuses an absence resting on under three sessions", () => {
    expect(reason(absence({ citedSessionIds: ["a", "f"] }))).toMatch(/three/);
  });

  it("refuses 'where relief came from' when nothing cited ended lighter", () => {
    const text = "Your lightest stretch at work came after the weeks you stopped answering messages at night, not after the deadline passed.";
    const relief = absence({ kind: "relief", text, citedSessionIds: ["a", "e"] });
    expect(reason(relief)).toMatch(/lighter/);
    expect(reason({ ...relief, citedSessionIds: ["a", "d"] })).toBeNull();
  });

  it("lets relief come from another part of life, as long as it rests on this one too", () => {
    const text = "Your lightest session in three months wasn't about fixing work. It was about your sister's wedding.";
    const wedding = new Map([...sessions, ["w", s("w", 40, ["family"], { lighter: true })]]);
    const relief = absence({ kind: "relief", text, citedSessionIds: ["a", "e", "w"] });
    expect(gateInsight(relief, { sessions: wedding, domains })).toEqual({ ok: true });
    expect(gateInsight({ ...relief, citedSessionIds: ["w", "b"] }, { sessions: wedding, domains })).toMatchObject({
      reason: expect.stringMatching(/work/),
    });
  });

  it("refuses 'what you say vs after' without check-ins behind it", () => {
    const d = draft({ kind: "say_vs_after", domains: ["work"], text: SAY_AFTER, citedSessionIds: ["a", "d", "f"] });
    expect(reason(d)).toMatch(/check-in/);
  });

  describe("log recaps", () => {
    it.each([
      "Money & Home worry has arrived on Sunday evenings across nine weeks (Aug 9, Aug 30, Sept 20, Oct 4), each after rent.",
      "Work has felt heavier since 12 August, and again since 3 September, both right after the reorganisation was announced.",
    ])("refuses a list of dates: %s", (text) => {
      expect(reason(absence({ text }))).toMatch(/dates/);
    });

    it.each([
      "Money & Home worry has arrived on Sunday evenings four times across nine weeks, each one right after the rent reminder.",
      "Work came up heavy in 6 of your last 10 conversations, and every one of them happened before a deadline landed.",
      "You've brought work here twice this month, and both times it was late at night after the team call ran over.",
    ])("refuses a restated count: %s", (text) => {
      expect(reason(absence({ text }))).toMatch(/count/);
    });

    it.each([
      "When work is fully off the table, something lifts and stays lifted. You called one of those days the first time you felt like yourself.",
      "Naming the work pressure here doesn't release it; it weighs more once you've had to look at it directly, days later.",
    ])("lets ordinary 'one of those' and 'once you've' through: %s", (text) => {
      expect(reason(absence({ text }))).toBeNull();
    });

    it("refuses a string of their own quotes", () => {
      const text = "Over the summer you went from 'drowning' to 'stretched' to 'behind but managing' and now 'okay' about work.";
      expect(reason(absence({ text }))).toMatch(/quotes/);
    });
  });

  it("refuses internal numbers the person never sees", () => {
    const text = "In four months work has never once come in under intensity 6 for you, not even on the quiet weeks.";
    expect(reason(absence({ text }))).toMatch(/internal/);
  });

  it("refuses a claim against the score's direction", () => {
    expect(reason(absence({ direction: "higher" }))).toMatch(/direction/);
    expect(reason(absence({ direction: "lower" }))).toBeNull();
  });

  it.each([
    "Work & Studies came up in most of your sessions lately, more than any other part of your life has.",
    "Work & Studies has been heavier than your usual lately, sitting below where it normally is.",
    "Work is at 48 right now, under your usual of 66 — the lowest it has been in weeks for you.",
  ])("refuses what a template could write: %s", (text) => {
    expect(reason(absence({ text }))).toMatch(/template|score/);
  });

  it.each([
    "Remember to be gentle with yourself when work and sleep and money all pull at you like this.",
    "It's okay to feel this way; balancing work, rest and money is a journey that takes real time.",
    "It seems like work has been weighing on you, and that rest might be worth prioritizing.",
  ])("refuses generic comfort: %s", (text) => {
    expect(reason(draft({ text }))).toMatch(/generic/i);
  });

  it.each([
    "Work, sleep and money all got heavier right after the nights the addiction came back up this autumn.",
    "Your sleep symptoms show up in work and money sessions too, which looks like one disorder, not three.",
  ])("refuses sensitive or clinical words: %s", (text) => {
    expect(reason(draft({ text }))).toMatch(/sensitive|clinical/);
  });

  it("refuses text too short to say anything", () => {
    expect(reason(draft({ text: "One weight, three places." }))).toMatch(/short/);
  });
});

describe("shownNow", () => {
  const live = (over: Partial<Record<string, Partial<LiveDomain>>> = {}) =>
    new Map(
      (["work", "health", "money"] as const).map((d) => [
        d,
        { state: "settled", steadiness: 50, band: 12, ...over[d] } as LiveDomain,
      ]),
    );
  const row = { kind: "thread" as const, domains: ["work", "health"] as InsightDraft["domains"], direction: "none" as const, scoresAt: [50, 50] };

  it("shows a fresh insight on unlocked domains", () => {
    expect(shownNow(row, live({ health: { state: "unlocked" } }))).toBe(true);
  });

  it("waits while any named domain is still warming, or gone", () => {
    expect(shownNow(row, live({ health: { state: "warming" } }))).toBe(false);
    expect(shownNow({ ...row, domains: ["work", "self"] }, live())).toBe(false);
  });

  it("waits for settled when it claims something against the usual", () => {
    const lower = { ...row, direction: "lower" as const };
    expect(shownNow(lower, live({ work: { state: "unlocked" } }))).toBe(false);
    expect(shownNow(lower, live({ health: { state: "unlocked" } }))).toBe(true);
  });

  it("hides once a named domain's score has moved past its band since", () => {
    expect(shownNow(row, live({ health: { steadiness: 62 } }))).toBe(true);
    expect(shownNow(row, live({ health: { steadiness: 63 } }))).toBe(false);
    expect(shownNow(row, live({ work: { steadiness: 30, band: 25 } }))).toBe(true);
  });

  it("hides a row written before scores were recorded", () => {
    expect(shownNow({ ...row, scoresAt: undefined }, live())).toBe(false);
  });
});
