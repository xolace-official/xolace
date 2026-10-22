import { describe, expect, it } from "vitest";
import type { CohortEmotion } from "./cohortCard";
import {
  deriveCohortCardState,
  isCohortMatch,
  weekStartUtc,
} from "./cohortCard";

describe("isCohortMatch", () => {
  const cases: {
    name: string;
    primary: string;
    secondary?: string;
    target: CohortEmotion;
    expected: boolean;
  }[] = [
    {
      name: "match on primary",
      primary: "sadness",
      target: "sadness",
      expected: true,
    },
    {
      name: "match on secondary",
      primary: "anger",
      secondary: "sadness",
      target: "sadness",
      expected: true,
    },
    {
      name: "match on neither",
      primary: "anger",
      secondary: "fear",
      target: "sadness",
      expected: false,
    },
  ];

  for (const c of cases) {
    it(c.name, () => {
      expect(
        isCohortMatch(
          { primaryEmotion: c.primary, secondaryEmotion: c.secondary },
          c.target,
        ),
      ).toBe(c.expected);
    });
  }

  // Guards the deliberate divergence from `isPoolable` (ADR 0004): this gates a
  // count, not content, so no safeguard verdict — crisis included — changes the
  // answer. If someone reintroduces a safeguard filter here, this fails.
  it("ignores safeguardLevel entirely", () => {
    const match = { primaryEmotion: "sadness", secondaryEmotion: undefined };
    for (const level of ["none", "gentle", "elevated", "crisis", undefined]) {
      // via a variable: `isCohortMatch` no longer declares the field, and a
      // fresh literal at the call site would fail the excess-property check
      const row = { ...match, safeguardLevel: level };
      expect(isCohortMatch(row, "sadness")).toBe(true);
    }
  });
});

describe("deriveCohortCardState", () => {
  const cases: { count: number; expected: ReturnType<typeof deriveCohortCardState> }[] = [
    { count: 0, expected: { type: "warming" } },
    // the floor boundary, both sides
    { count: 2, expected: { type: "warming" } },
    { count: 3, expected: { type: "count", value: 3 } },
  ];

  for (const c of cases) {
    it(`count=${c.count} → ${c.expected.type}`, () => {
      expect(deriveCohortCardState(c.count)).toEqual(c.expected);
    });
  }
});

describe("weekStartUtc", () => {
  // 2026-08-25 is a Tuesday; its week starts Mon 2026-08-24 00:00 UTC.
  const monday = Date.UTC(2026, 7, 24);

  it("Monday 00:00 is its own week start", () => {
    expect(weekStartUtc(monday)).toBe(monday);
  });

  it("mid-week rounds back to Monday", () => {
    expect(weekStartUtc(Date.UTC(2026, 7, 26, 13, 45))).toBe(monday);
  });

  it("Sunday belongs to the week that started six days earlier", () => {
    expect(weekStartUtc(Date.UTC(2026, 7, 30, 23, 59, 59))).toBe(monday);
  });
});
