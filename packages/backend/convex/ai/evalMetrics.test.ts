import { describe, expect, it } from "vitest";
import {
  summarizeConfirmations,
  rankVersions,
  MIN_JUDGED_FOR_RANKING,
  type ConfirmationSample,
} from "./evalMetrics";

// Build N samples of one state on one version/tone, terse enough to compose.
function mk(
  version: string,
  state: ConfirmationSample["state"],
  n: number,
  tone?: string | null,
): ConfirmationSample[] {
  return Array.from({ length: n }, () => ({ version, state, tone }));
}

describe("summarizeConfirmations — rates", () => {
  it("computes first-try and landing rates over the judged set only", () => {
    // 6 confirmed, 2 refined, 2 gave_up, 5 abandoned. judged = 10.
    const samples = [
      ...mk("v1", "confirmed", 6),
      ...mk("v1", "refined", 2),
      ...mk("v1", "gave_up", 2),
      ...mk("v1", "abandoned", 5),
    ];
    const { overall } = summarizeConfirmations(samples);
    expect(overall.total).toBe(15);
    expect(overall.judged).toBe(10);
    expect(overall.firstTryRate).toBeCloseTo(0.6);
    expect(overall.landingRate).toBeCloseTo(0.8);
    // abandoned is out of the quality denominator but reported on its own.
    expect(overall.abandonRate).toBeCloseTo(5 / 15);
  });

  it("excludes abandoned from judged so it never moves the quality rates", () => {
    const base = mk("v1", "confirmed", 4).concat(mk("v1", "gave_up", 4));
    const withAbandon = base.concat(mk("v1", "abandoned", 100));
    const a = summarizeConfirmations(base).overall;
    const b = summarizeConfirmations(withAbandon).overall;
    expect(b.firstTryRate).toBeCloseTo(a.firstTryRate);
    expect(b.landingRate).toBeCloseTo(a.landingRate);
    expect(b.abandonRate).toBeGreaterThan(a.abandonRate);
  });

  it("reports 0 (not NaN) for an empty or all-abandoned group", () => {
    const empty = summarizeConfirmations([]).overall;
    expect(empty.firstTryRate).toBe(0);
    expect(empty.landingRate).toBe(0);
    expect(empty.abandonRate).toBe(0);

    const allAbandon = summarizeConfirmations(mk("v1", "abandoned", 3)).overall;
    expect(allAbandon.judged).toBe(0);
    expect(allAbandon.firstTryRate).toBe(0);
    expect(allAbandon.landingRate).toBe(0);
    expect(allAbandon.abandonRate).toBe(1);
  });
});

describe("summarizeConfirmations — grouping", () => {
  it("splits stats by version", () => {
    const samples = [
      ...mk("v1", "confirmed", 5),
      ...mk("v2", "confirmed", 1),
      ...mk("v2", "gave_up", 3),
    ];
    const { byVersion } = summarizeConfirmations(samples);
    const v1 = byVersion.find((g) => g.key === "v1")!;
    const v2 = byVersion.find((g) => g.key === "v2")!;
    expect(v1.landingRate).toBeCloseTo(1);
    expect(v2.landingRate).toBeCloseTo(0.25);
  });

  it("splits stats by tone and drops samples with no tone from byTone", () => {
    const samples = [
      ...mk("v1", "confirmed", 2, "gentle"),
      ...mk("v1", "confirmed", 2, "direct"),
      ...mk("v1", "gave_up", 1, null),
    ];
    const { byTone, overall } = summarizeConfirmations(samples);
    expect(byTone.map((g) => g.key).sort()).toEqual(["direct", "gentle"]);
    // The untoned sample still counts toward the overall roll-up.
    expect(overall.total).toBe(5);
  });

  it("splits talk mirrors by companion, leaving typed mirrors out of byCompanion", () => {
    const samples: ConfirmationSample[] = [
      ...mk("v1", "confirmed", 3).map((s) => ({ ...s, companion: "companion-v1-haiku-5.5" })),
      ...mk("v1", "gave_up", 1).map((s) => ({ ...s, companion: "companion-v2-haiku-5.5" })),
      ...mk("v1", "confirmed", 2),
    ];
    const { byCompanion, byVersion } = summarizeConfirmations(samples);
    expect(byCompanion.map((g) => [g.key, g.judged]).sort()).toEqual([
      ["companion-v1-haiku-5.5", 3],
      ["companion-v2-haiku-5.5", 1],
    ]);
    // The articulator's own group still holds every mirror it wrote.
    expect(byVersion).toHaveLength(1);
    expect(byVersion[0].total).toBe(6);
  });
});

describe("rankVersions", () => {
  it("orders by landing rate, then first-try, then volume", () => {
    // A: lands 100% but all refined (low first-try). B: lands 100%, all
    // first-try → B should beat A. C: lands 50%.
    const samples = [
      ...mk("A", "refined", 30),
      ...mk("B", "confirmed", 30),
      ...mk("C", "confirmed", 15),
      ...mk("C", "gave_up", 15),
    ];
    const { byVersion } = summarizeConfirmations(samples);
    const { ranked } = rankVersions(byVersion);
    expect(ranked.map((g) => g.key)).toEqual(["B", "A", "C"]);
  });

  it("parks low-volume versions as insufficient instead of topping the board", () => {
    const samples = [
      ...mk("noisy", "confirmed", 2), // perfect but tiny
      ...mk("solid", "confirmed", 20),
      ...mk("solid", "gave_up", 5),
    ];
    const { byVersion } = summarizeConfirmations(samples);
    const { ranked, insufficient } = rankVersions(byVersion);
    expect(ranked.map((g) => g.key)).toEqual(["solid"]);
    expect(insufficient.map((g) => g.key)).toEqual(["noisy"]);
  });

  it("respects a custom minJudged threshold", () => {
    const samples = mk("v1", "confirmed", MIN_JUDGED_FOR_RANKING - 1);
    const { byVersion } = summarizeConfirmations(samples);
    expect(rankVersions(byVersion).ranked).toHaveLength(0);
    expect(rankVersions(byVersion, { minJudged: 1 }).ranked).toHaveLength(1);
  });

  it("does not mutate its input", () => {
    const samples = [...mk("A", "confirmed", 25), ...mk("B", "gave_up", 25)];
    const { byVersion } = summarizeConfirmations(samples);
    const snapshot = JSON.stringify(byVersion);
    rankVersions(byVersion);
    expect(JSON.stringify(byVersion)).toBe(snapshot);
  });
});
