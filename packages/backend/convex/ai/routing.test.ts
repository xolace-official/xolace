import { describe, expect, it } from "vitest";
import {
  routeClaimStrength,
  EPISODIC_CONNECT_FLOOR,
  type ClaimStrengthSignal,
} from "./routing";

/** A session sitting squarely inside the gate: faint, eligible, unsuppressed. */
const reachable: ClaimStrengthSignal = {
  confidence: 0.72,
  specificity: 2,
  entryType: "open_prompt",
  isEscalation: false,
  profileReachedToday: false,
  gapNamedThisSession: false,
  atCap: false,
};

const route = (over: Partial<ClaimStrengthSignal> = {}) =>
  routeClaimStrength({ ...reachable, ...over });

describe("routeClaimStrength — the gate", () => {
  it("reaches on a faint, memory-less, eligible session", () => {
    expect(route()).toBe("reaching");
  });

  it("ignores confidence on the reach branch", () => {
    expect(route({ confidence: 0.95 })).toBe("reaching");
    expect(route({ confidence: 0.1 })).toBe("reaching");
  });

  it("treats sp 3 as having shape (the gate is sp <= 2)", () => {
    expect(route({ specificity: 3 })).toBe("measured");
    expect(route({ specificity: 2 })).toBe("reaching");
  });

  it("does not reach when memory connected", () => {
    expect(route({ episodicTopScore: EPISODIC_CONNECT_FLOOR })).toBe("measured");
    expect(route({ episodicTopScore: EPISODIC_CONNECT_FLOOR - 0.01 })).toBe(
      "reaching",
    );
  });

  it("treats an absent episodic score as not connected (cold start)", () => {
    expect(route({ episodicTopScore: undefined })).toBe("reaching");
  });
});

describe("routeClaimStrength — suppression", () => {
  it("never reaches on body_scan, the one remaining low-bandwidth type", () => {
    expect(route({ entryType: "body_scan" })).toBe("measured");
  });

  it("reaches on the eligible entry types", () => {
    // word_cloud joined this list on 2026-09-04 — §3.5 reversed.
    for (const entryType of [
      "open_prompt",
      "guided_entry",
      "voice",
      "word_cloud",
    ]) {
      expect(route({ entryType })).toBe("reaching");
    }
  });

  it("never reaches on an escalated session", () => {
    // "I wanna die" — 12 chars, specificity 2 — sits inside the gate.
    expect(route({ isEscalation: true })).toBe("measured");
  });

  it("never reaches twice in the same calendar day", () => {
    expect(route({ profileReachedToday: true })).toBe("measured");
  });

  it("binds the same-day guard to the session that reached", () => {
    // A sibling session reaching between turn 1 and turn 2 must not flip this
    // session from holding to plain mid-session.
    expect(route({ profileReachedToday: true, gapNamedThisSession: true })).toBe(
      "holding",
    );
    expect(
      route({
        profileReachedToday: true,
        gapNamedThisSession: true,
        atCap: true,
        specificity: 8,
      }),
    ).toBe("holding");
  });

  it("never holds on a suppressed session, at any turn including the cap", () => {
    for (const suppressor of [
      { entryType: "body_scan" },
      { isEscalation: true },
    ]) {
      expect(route({ ...suppressor, gapNamedThisSession: true })).toBe(
        "measured",
      );
      expect(
        route({ ...suppressor, gapNamedThisSession: true, atCap: true }),
      ).toBe("measured");
    }
  });
});

describe("routeClaimStrength — holding", () => {
  it("holds when the reach went out and the signal is still faint", () => {
    expect(route({ gapNamedThisSession: true })).toBe("holding");
  });

  it("holds at the cap for a session that reached, even if the gate no longer fires", () => {
    expect(
      route({ gapNamedThisSession: true, atCap: true, specificity: 8 }),
    ).toBe("holding");
  });

  it("stays plain at the cap for a session that never reached", () => {
    expect(route({ atCap: true, specificity: 8, confidence: 0.9 })).toBe(
      "confident",
    );
  });

  it("never opens a NEW reach at the cap, even inside the gate", () => {
    // Faint, eligible, unsuppressed, never reached this session — the exact
    // shape the gate reaches on at turn 1. At the cap there is no "Say more"
    // left to answer a question with, so this must NOT be "reaching".
    expect(route({ atCap: true })).not.toBe("reaching");
    // Falls through to the normal poles for its best-effort read instead.
    expect(route({ atCap: true })).toBe("measured");
  });
});

describe("routeClaimStrength — the normal poles", () => {
  it("routes confident when confidence AND shape are both high", () => {
    expect(route({ confidence: 0.9, specificity: 8 })).toBe("confident");
  });

  it("treats the high thresholds as inclusive (0.75 / 6 are 'high')", () => {
    expect(route({ confidence: 0.75, specificity: 6 })).toBe("confident");
  });

  it("routes measured when the axes disagree", () => {
    expect(route({ confidence: 0.3, specificity: 8 })).toBe("measured");
    expect(route({ confidence: 0.9, specificity: 5 })).toBe("measured");
  });

  it("floors a confident read back to measured on a 'not quite'", () => {
    expect(
      route({ confidence: 0.9, specificity: 8, userFeedback: "not_quite" }),
    ).toBe("measured");
    expect(
      route({ confidence: 0.9, specificity: 8, userFeedback: "say_more" }),
    ).toBe("confident");
  });
});
