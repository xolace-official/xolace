/**
 * The steadiness reading engine (#515), against the Steadiness formula (#488),
 * Unlock threshold (#490), domain map (#486) and valence guard (#494).
 *
 * Failure modes, written before the code:
 *  1. A tag with no home or two homes (type-enforced: LIFE_AREA_HOME is a
 *     Record over the tag union).
 *  2. A texture-only, off-list or untagged session moves a domain.
 *  3. A sensitive tag drops the whole session instead of only itself.
 *  4. Two tags in one domain give that domain two readings.
 *  5. A positive session reads as unsteady (valence guard missing, or missing
 *     for child emotions like relief).
 *  6. Intensity off the 1–10 scale, or a mood/follow-up step, escapes 0–100.
 *  7. "unsure"/no mood, or a dismissed/vent follow-up, produces a reading.
 *  8. A follow-up is dated on its session's day instead of the day answered.
 *  9. A gave_up/abandoned/unconfirmed session's readings (incl. its
 *     self-reports) keep full weight.
 * 10. Burned or crisis sessions are dropped.
 * 11. Self-reports count toward unlock days.
 * 12. Several sessions in one night unlock (count, not distinct days), or days
 *     are cut in UTC instead of the person's timezone.
 * 13. A domain settles before 21 days or before 5 distinct days.
 * 14. A number shows while warming, or a baseline before settled; shrinkage.
 * 15. Silence drifts the score or re-locks the domain; quiet is never marked.
 * 16. Readings after `now` leak into a replay (trend asks for 7 days ago).
 * 17. Overall shows with fewer than 2 unlocked domains, or counts warming ones.
 * 18. A metadata row whose session is gone crashes (dev.test.ts, the loader
 *     seam).
 * 19. A classifier change shifts intensity and the baseline jumps with it, or
 *     a new version ships with no offset recorded (#516).
 * 20. Lately counts toward the usual, so a sustained drop sinks the baseline
 *     it's measured against (#527).
 * 21. Travel (days re-cut in a new timezone) or retention leaving fewer days
 *     re-locks a domain already recorded unlocked; or a recorded unlock leaks
 *     into a replay from before it (#535).
 * 22. Quiet domains drag the overall dial; or everything going quiet blanks it
 *     instead of holding (#535).
 */
import { describe, expect, it } from "vitest";
import { domainOf } from "../lib/understandingVocab";
import { CLASSIFIER_MODEL, CLASSIFIER_VERSION } from "../ai/providers/anthropic";
import { INTENSITY_OFFSET, readingsFromSession, type SessionEvidence } from "./readings";
import { computeSteadiness, type Reading } from "./steadiness";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 8, 12);

const session = (o: Partial<SessionEvidence> = {}): SessionEvidence => ({
  at: NOW,
  intensity: 1,
  primaryEmotion: "anxiety",
  thematicTags: ["work"],
  confirmationState: "confirmed",
  followUps: [],
  ...o,
});

const r = (o: Partial<Reading>): Reading => ({
  domain: "work",
  value: 50,
  weight: 1,
  at: NOW,
  source: "session",
  ...o,
});

const compute = (readings: Reading[], timezone = "UTC") =>
  computeSteadiness(readings, { now: NOW, timezone });

describe("domainOf", () => {
  it("homes, texture, sensitive, legacy and off-list tags", () => {
    expect(domainOf("burnout")).toBe("work");
    expect(domainOf("isolation")).toBe("belonging");
    expect(domainOf("loss")).toBeNull();
    expect(domainOf("abuse")).toBeNull();
    expect(domainOf("direction")).toBe("purpose");
    expect(domainOf("self-awareness")).toBe("self");
    expect(domainOf("trust")).toBeNull();
    expect(domainOf("constructor")).toBeNull();
  });
});

describe("readingsFromSession", () => {
  it("maps intensity linearly: 1 → 100, 10 → 0, 4 → 66.7", () => {
    expect(readingsFromSession(session({ intensity: 1 }))[0].value).toBe(100);
    expect(readingsFromSession(session({ intensity: 10 }))[0].value).toBe(0);
    expect(readingsFromSession(session({ intensity: 4 }))[0].value).toBeCloseTo(66.67, 1);
  });

  it("clamps intensity off the scale", () => {
    expect(readingsFromSession(session({ intensity: 12 }))[0].value).toBe(0);
    expect(readingsFromSession(session({ intensity: 0 }))[0].value).toBe(100);
  });

  it("gives each domain one full reading; texture, sensitive and off-list give none", () => {
    const out = readingsFromSession(
      session({ thematicTags: ["work", "studies", "family", "loss", "abuse", "trust"] }),
    );
    expect(out.map((x) => x.domain).sort()).toEqual(["family", "work"]);
  });

  it("gives nothing for a texture-only or untagged session", () => {
    expect(readingsFromSession(session({ thematicTags: ["loss", "change"] }))).toEqual([]);
    expect(readingsFromSession(session({ thematicTags: [] }))).toEqual([]);
  });

  it("floors joy- and love-family readings at 75 (valence guard)", () => {
    expect(readingsFromSession(session({ intensity: 9, primaryEmotion: "joy" }))[0].value).toBe(75);
    expect(readingsFromSession(session({ intensity: 9, primaryEmotion: "relief" }))[0].value).toBe(75);
    expect(readingsFromSession(session({ intensity: 9, primaryEmotion: "love" }))[0].value).toBe(75);
    expect(readingsFromSession(session({ intensity: 2, primaryEmotion: "joy" }))[0].value).toBeCloseTo(88.9, 1);
    expect(readingsFromSession(session({ intensity: 9, primaryEmotion: "anger" }))[0].value).toBeCloseTo(11.1, 1);
  });

  it("stands the guard down when a heavy secondary feeling came with it", () => {
    const love9 = (secondaryEmotion?: string) =>
      readingsFromSession(session({ intensity: 9, primaryEmotion: "love", secondaryEmotion }))[0].value;
    expect(love9("grief")).toBeCloseTo(11.1, 1);
    expect(love9("hopelessness")).toBeCloseTo(11.1, 1); // child of sadness
    // secondaryEmotion is free text (#536): common words outside the vocabulary count too.
    expect(love9("heartbreak")).toBeCloseTo(11.1, 1);
    expect(love9("despair")).toBeCloseTo(11.1, 1);
    expect(love9("dread")).toBeCloseTo(11.1, 1);
    expect(love9("resentment")).toBeCloseTo(11.1, 1);
    expect(love9("longing")).toBe(75); // ambiguous next to love, so the guard stays up
    expect(love9("excitement")).toBe(75);
    expect(love9("joy")).toBe(75);
    expect(love9("confusion")).toBe(75);
    expect(love9(undefined)).toBe(75);
  });

  it("reads a shifted classifier on the reference scale via its offset, guard after", () => {
    // A version that scores 1 hotter: its 5 is the reference's 4.
    expect(readingsFromSession(session({ intensity: 5, intensityOffset: 1 }))[0].value).toBeCloseTo(66.67, 1);
    expect(readingsFromSession(session({ intensity: 4 }))[0].value).toBeCloseTo(66.67, 1);
    expect(
      readingsFromSession(session({ intensity: 10, intensityOffset: -1, primaryEmotion: "joy" }))[0].value,
    ).toBe(75);
  });

  it("every shipped classifier version has a recorded intensity offset (release gate)", () => {
    expect(INTENSITY_OFFSET).toHaveProperty([CLASSIFIER_VERSION]);
    // The reference scale itself never moves, or its stored history would shift.
    expect(INTENSITY_OFFSET["classifier-v1-haiku-4.5"]).toBe(0);
  });

  it("the classifier version names its model, so a model swap can't skip the version bump (#533)", () => {
    // claude-haiku-5-5 → haiku-5.5; a dated id (claude-haiku-5-5-20260101) maps the same
    const id = /^claude-([a-z]+)-(\d+)-(\d+)/;
    expect(CLASSIFIER_MODEL, "model id format changed; update this check").toMatch(id);
    const [, family, major, minor] = CLASSIFIER_MODEL.match(id)!;
    expect(CLASSIFIER_VERSION).toMatch(new RegExp(`^classifier-v\\d+-${family}-${major}\\.${minor}$`));
  });

  it("adds a mood reading on the session's date, relative and capped", () => {
    const lighter = readingsFromSession(session({ intensity: 1, postSessionMood: "lighter" }));
    expect(lighter.map((x) => [x.source, x.value, x.at])).toEqual([
      ["session", 100, NOW],
      ["mood", 100, NOW],
    ]);
    const heavier = readingsFromSession(session({ intensity: 10, postSessionMood: "heavier" }));
    expect(heavier[1].value).toBe(0);
    const same = readingsFromSession(session({ intensity: 4, postSessionMood: "same" }));
    expect(same[1].value).toBeCloseTo(same[0].value);
  });

  it("gives no mood reading for unsure or no answer", () => {
    expect(readingsFromSession(session({ postSessionMood: "unsure" }))).toHaveLength(1);
    expect(readingsFromSession(session({ postSessionMood: undefined }))).toHaveLength(1);
  });

  it("adds follow-up readings dated the day answered", () => {
    const answered = NOW + 3 * DAY;
    const out = readingsFromSession(
      session({
        intensity: 7, // 33.3
        followUps: [
          { response: "lighter", at: answered },
          { response: "processed", at: answered },
          { response: "still_here", at: answered },
          { response: "heavier", at: answered },
          { response: "dismissed", at: answered },
          { response: "vent", at: answered },
        ],
      }),
    ).filter((x) => x.source === "follow_up");
    expect(out.map((x) => Math.round(x.value))).toEqual([53, 63, 33, 13]);
    expect(out.every((x) => x.at === answered)).toBe(true);
  });

  it("halves the weight of every reading from an unconfirmed mirror", () => {
    for (const confirmationState of ["gave_up", "abandoned", undefined] as const) {
      const out = readingsFromSession(
        session({ confirmationState, postSessionMood: "lighter", followUps: [{ response: "heavier", at: NOW }] }),
      );
      expect(out.map((x) => x.weight)).toEqual([0.5, 0.5, 0.5]);
    }
    expect(readingsFromSession(session({ confirmationState: "refined" }))[0].weight).toBe(1);
  });
});

describe("computeSteadiness", () => {
  it("decay-weights steadiness at a 21-day half-life and the usual at 90, lately excluded (20)", () => {
    const days = [0, 1, 2, 3, 4].map((d) => NOW - (21 + d) * DAY);
    const old = days.map((at) => r({ value: 0, at }));
    const recent = [r({ value: 100, at: NOW })];
    const work = compute([...old, ...recent]).domains[0];
    // old weights ≈ 2^-1…2^-(25/21); recent weight 1.
    const w21 = days.reduce((s, at) => s + 2 ** (-(NOW - at) / (21 * DAY)), 0);
    const w90 = days.reduce((s, at) => s + 2 ** (-(NOW - at) / (90 * DAY)), 0);
    expect(work.state).toBe("settled");
    expect(work.steadiness).toBeCloseTo(100 / (1 + w21), 6);
    expect(work.baseline).toBe(0); // today's 100 is lately, not the usual
    const older = [...old, r({ value: 100, at: NOW - 30 * DAY })];
    const w = 2 ** (-5 / 90); // the 30-day reading, decayed to the newest usual one (25 days ago)
    const ws = days.reduce((s, at) => s + 2 ** (-(NOW - 25 * DAY - at) / (90 * DAY)), 0);
    expect(compute(older).domains[0].baseline).toBeCloseTo((100 * w) / (w + ws), 6);
    expect(work.evidenceWeight).toBeCloseTo(1 + w21, 6);
  });

  it("counts reading weight, not just decay", () => {
    const work = compute([r({ value: 100, weight: 1 }), r({ value: 0, weight: 0.5 })]).domains[0];
    expect(work.raw.steadiness).toBeCloseTo(66.67, 1);
  });

  it("warming: no number, until session readings land on 3 distinct days", () => {
    const sameNight = [0, 1, 2, 3].map((h) => r({ at: NOW - h * 3_600_000 }));
    const work = compute(sameNight).domains[0];
    expect(work).toMatchObject({ state: "warming", steadiness: null, baseline: null, sessionDays: 1 });
  });

  it("self-reports never open a domain", () => {
    const readings = [
      r({ at: NOW - 2 * DAY }),
      r({ at: NOW - DAY, source: "follow_up" }),
      r({ at: NOW, source: "mood" }),
    ];
    expect(compute(readings).domains[0]).toMatchObject({ state: "warming", sessionDays: 1 });
  });

  it("unlocked at 3 distinct days: steadiness shows, baseline does not", () => {
    const work = compute([0, 1, 2].map((d) => r({ at: NOW - d * DAY }))).domains[0];
    expect(work.state).toBe("unlocked");
    expect(work.steadiness).toBeCloseTo(50, 9);
    expect(work.baseline).toBeNull();
  });

  it("cuts days in the person's timezone", () => {
    // 23:30 and 00:30 UTC: two UTC days, one day in New York.
    const late = Date.UTC(2026, 9, 7, 23, 30);
    const readings = [r({ at: late }), r({ at: late + 3_600_000 }), r({ at: NOW - 5 * DAY })];
    expect(compute(readings, "UTC").domains[0].sessionDays).toBe(3);
    expect(compute(readings, "America/New_York").domains[0].sessionDays).toBe(2);
  });

  it("settles only with the first reading ≥21 days old and ≥5 distinct days", () => {
    const fiveDaysRecent = [0, 1, 2, 3, 4].map((d) => r({ at: NOW - d * DAY }));
    expect(compute(fiveDaysRecent).domains[0].state).toBe("unlocked");
    const fourDaysOld = [0, 1, 2, 21].map((d) => r({ at: NOW - d * DAY }));
    expect(compute(fourDaysOld).domains[0].state).toBe("unlocked");
    const settled = [0, 1, 2, 3, 21].map((d) => r({ at: NOW - d * DAY }));
    expect(compute(settled).domains[0]).toMatchObject({ state: "settled" });
    expect(compute(settled).domains[0].baseline).toBeCloseTo(50, 9);
  });

  it("silence holds the last value and marks the domain quiet after 30 days", () => {
    const readings = [0, 1, 2].map((d) => r({ value: 30 + d * 10, at: NOW - (40 + d) * DAY }));
    const later = computeSteadiness(readings, { now: NOW + 200 * DAY, timezone: "UTC" }).domains[0];
    const then = computeSteadiness(readings, { now: NOW - 39 * DAY, timezone: "UTC" }).domains[0];
    expect(later.steadiness).toBeCloseTo(then.steadiness!, 9);
    expect(later.state).toBe("unlocked");
    expect(later.quiet).toBe(true);
    expect(then.quiet).toBe(false);
    expect(later.lastReadingAt).toBe(NOW - 40 * DAY);
  });

  it("ignores readings after now (replay for 7 days ago)", () => {
    const readings = [r({ at: NOW - 10 * DAY }), r({ at: NOW + DAY, value: 0 })];
    const work = compute(readings).domains[0];
    expect(work.readings).toHaveLength(1);
    expect(work.raw.steadiness).toBeCloseTo(50, 9);
  });

  it("only touched domains appear", () => {
    expect(compute([r({ domain: "family" })]).domains.map((d) => d.domain)).toEqual(["family"]);
    expect(compute([]).domains).toEqual([]);
  });

  it("overall is the equal-weight mean of unlocked domains, at 2 or more", () => {
    const days = (domain: Reading["domain"], value: number, n = 3) =>
      Array.from({ length: n }, (_, d) => r({ domain, value, at: NOW - d * DAY }));
    expect(compute([...days("work", 40), ...days("family", 90, 1)]).overall).toBeNull();
    // Work has 6 readings and family 3: equal weight per domain, not per reading.
    const both = compute([...days("work", 40, 6), ...days("family", 90), ...days("money", 0, 1)]);
    expect(both.overall).toBeCloseTo(65, 9);
  });

  it("overall leaves quiet domains out, but holds when every one is quiet (22)", () => {
    const days = (domain: Reading["domain"], value: number, agoDays: number) =>
      [0, 1, 2].map((d) => r({ domain, value, at: NOW - (agoDays + d) * DAY }));
    const oldMoney = compute([...days("work", 40, 0), ...days("family", 80, 0), ...days("money", 0, 150)]);
    expect(oldMoney.overall).toBeCloseTo(60, 9);
    // Still needs two unlocked domains, quiet or not, to show at all.
    expect(compute([...days("work", 40, 0), ...days("money", 0, 150)]).overall).toBeCloseTo(40, 9);
    expect(compute([...days("work", 40, 100), ...days("money", 0, 150)]).overall).toBeCloseTo(20, 9);
  });

  it("a recorded unlock holds while readings remain, never before it was recorded (21)", () => {
    const twoDays = [r({ at: NOW - 40 * DAY }), r({ at: NOW - DAY })];
    const unlocked = [{ domain: "work" as const, at: NOW - 50 * DAY }];
    expect(compute(twoDays).domains[0].state).toBe("warming");
    const held = computeSteadiness(twoDays, { now: NOW, timezone: "UTC", unlocked }).domains[0];
    expect(held).toMatchObject({ state: "unlocked", steadiness: 50 });
    expect(computeSteadiness(twoDays, { now: NOW, timezone: "UTC", unlocked: [{ domain: "work", at: NOW + 1 }] }).domains[0].state).toBe("warming");
    // Only a floor: it never makes a domain settled.
    expect(computeSteadiness(twoDays, { now: NOW, timezone: "UTC", unlocked }).domains[0].baseline).toBeNull();
  });
});
