import { describe, expect, it } from "vitest";
import { buildSweepStops } from "@/src/features/reflect/components/sweep-stops";

const TOKENS = {
  accent: "#ff8844",
  surface: "#111111",
  surfaceTertiary: "#222222",
  background: "#000000",
};

/** Alpha of an `#rrggbbaa` stop, or 255 for an opaque `#rrggbb` one. */
const alphaOf = (stop: string) =>
  stop.length > 7 ? parseInt(stop.slice(7), 16) : 255;

describe("buildSweepStops", () => {
  it("builds every stop from a theme token, never a literal", () => {
    // #246 story 19: cycling palettes must change the wash. A stop that isn't
    // derived from a token is a fixed orange in all eleven themes.
    const tokens = Object.values(TOKENS);
    for (const stop of buildSweepStops(TOKENS)) {
      expect(tokens.some((t) => stop.startsWith(t))).toBe(true);
    }
  });

  it("rises and falls monotonically around the bottom peak", () => {
    // Otherwise the bottom half reads as two blobs with a trough between them.
    const [right, downRight, down, downLeft, left] =
      buildSweepStops(TOKENS).map(alphaOf);
    expect(right).toBeLessThan(downRight);
    expect(downRight).toBeLessThan(down);
    expect(down).toBeGreaterThan(downLeft);
    expect(downLeft).toBeGreaterThan(left);
  });

  it("keeps the top off the floor with a small accent lift", () => {
    const stops = buildSweepStops(TOKENS);
    expect(stops[7].startsWith(TOKENS.accent)).toBe(true);
    expect(alphaOf(stops[7])).toBeGreaterThan(0);
    expect(alphaOf(stops[7])).toBeLessThan(alphaOf(stops[4]));
  });
});
