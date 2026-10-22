import { describe, expect, it } from "vitest";
import { isPoolable } from "./poolability";

describe("isPoolable", () => {
  // kept | contributed | safeguard → poolable
  const cases: {
    kept?: boolean;
    contributed?: boolean;
    safeguard?: "none" | "gentle" | "elevated" | "crisis";
    expected: boolean;
  }[] = [
    { kept: true, contributed: true, safeguard: "none", expected: true },
    { kept: true, contributed: true, safeguard: "gentle", expected: true },
    { kept: true, contributed: true, safeguard: "elevated", expected: true },
    // safety row: crisis never enters the pool
    { kept: true, contributed: true, safeguard: "crisis", expected: false },
    { kept: false, contributed: true, safeguard: "none", expected: false },
    { kept: undefined, contributed: true, safeguard: "none", expected: false },
    { kept: true, contributed: false, safeguard: "none", expected: false },
    { kept: true, contributed: undefined, safeguard: "none", expected: false },
  ];

  for (const c of cases) {
    it(`kept=${c.kept} contributed=${c.contributed} safeguard=${c.safeguard} → ${c.expected}`, () => {
      expect(
        isPoolable({
          kept: c.kept,
          contributedReflection: c.contributed,
          safeguardLevel: c.safeguard,
        }),
      ).toBe(c.expected);
    });
  }
});
