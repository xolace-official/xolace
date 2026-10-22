import { describe, expect, it } from "vitest";

import { cardFrame, cutoutPath, spotlightFor } from "./geometry";

const insets = { top: 60, bottom: 34, left: 0, right: 0 };
const screen = { screenWidth: 390, screenHeight: 844 };

describe("cutoutPath", () => {
  it("opens with the full-screen subpath so even-odd has something to cut from", () => {
    const d = cutoutPath(390, 844, 10, 20, 100, 40, 12);
    expect(d.startsWith("M0 0H390V844H0Z ")).toBe(true);
  });

  it("clamps the radius to half the shorter side, so a thin hole stays a hole", () => {
    // height 20 → max radius 10; asking for 999 must not invert the arcs.
    const d = cutoutPath(390, 844, 0, 0, 100, 20, 999);
    expect(d).toContain("A10 10");
    expect(d).not.toContain("A999");
  });
});

describe("spotlightFor", () => {
  it("grows a rect by the padding on every side", () => {
    const spot = spotlightFor(
      { x: 50, y: 100, width: 200, height: 40 },
      "rect",
      8,
      12,
    );
    expect(spot).toEqual({ x: 42, y: 92, width: 216, height: 56, radius: 12 });
  });

  it("squares a circle off the longer side and keeps the target centred", () => {
    const spot = spotlightFor(
      { x: 50, y: 100, width: 40, height: 20 },
      "circle",
      6,
      12,
    );
    expect(spot.width).toBe(spot.height);
    expect(spot.radius).toBe(spot.width / 2);
    expect(spot.x + spot.width / 2).toBe(70); // 50 + 40/2
    expect(spot.y + spot.height / 2).toBe(110); // 100 + 20/2
  });
});

describe("cardFrame", () => {
  it("centres the card when there is no target to sit beside", () => {
    const frame = cardFrame({
      spot: null,
      cardHeight: 200,
      placement: "auto",
      ...screen,
      insets,
    });
    expect(frame.top).toBe((844 - 200) / 2);
  });

  it("sits below the target when below fits", () => {
    const frame = cardFrame({
      spot: { x: 0, y: 100, width: 390, height: 50 },
      cardHeight: 160,
      placement: "auto",
      ...screen,
      insets,
    });
    expect(frame.top).toBe(100 + 50 + 12);
  });

  it("flips above when below would run off the bottom", () => {
    const frame = cardFrame({
      spot: { x: 0, y: 700, width: 390, height: 60 },
      cardHeight: 160,
      placement: "auto",
      ...screen,
      insets,
    });
    expect(frame.top).toBe(700 - 12 - 160);
  });

  it("never places the card above the safe area, even when neither side fits", () => {
    const frame = cardFrame({
      spot: { x: 0, y: 0, width: 390, height: 800 },
      cardHeight: 300,
      placement: "auto",
      ...screen,
      insets,
    });
    expect(frame.top).toBeGreaterThanOrEqual(insets.top + 16);
  });

  it("caps the width so the card does not run edge to edge on a tablet", () => {
    const frame = cardFrame({
      spot: null,
      cardHeight: 100,
      placement: "auto",
      screenWidth: 1024,
      screenHeight: 1366,
      insets,
    });
    expect(frame.width).toBe(420);
    expect(frame.left).toBe((1024 - 420) / 2);
  });
});
