import { describe, expect, it } from "vitest";
import {
  adjustImportance,
  importanceDelta,
  DEFAULT_IMPORTANCE,
  MIN_IMPORTANCE,
  MAX_IMPORTANCE,
} from "./episodicImportance";

describe("importanceDelta", () => {
  it("rewards a clean landing and penalizes giving up", () => {
    expect(importanceDelta("confirmed")).toBeGreaterThan(0);
    expect(importanceDelta("gave_up")).toBeLessThan(0);
  });

  it("stays neutral on the noisy states (refined / abandoned)", () => {
    expect(importanceDelta("refined")).toBe(0);
    expect(importanceDelta("abandoned")).toBe(0);
  });

  it("decays harder than it bumps", () => {
    expect(Math.abs(importanceDelta("gave_up"))).toBeGreaterThan(
      importanceDelta("confirmed"),
    );
  });
});

describe("adjustImportance", () => {
  it("treats undefined as the default weight", () => {
    // Default is already the ceiling, so a bump can't climb higher.
    expect(adjustImportance(undefined, "confirmed")).toBe(DEFAULT_IMPORTANCE);
    // A miss decays down from the default.
    expect(adjustImportance(undefined, "gave_up")).toBeCloseTo(
      DEFAULT_IMPORTANCE - 0.15,
    );
  });

  it("leaves the weight unchanged on neutral feedback", () => {
    expect(adjustImportance(0.7, "refined")).toBe(0.7);
    expect(adjustImportance(0.7, "abandoned")).toBe(0.7);
  });

  it("caps a bump at MAX_IMPORTANCE (default is already the ceiling)", () => {
    expect(adjustImportance(DEFAULT_IMPORTANCE, "confirmed")).toBe(
      MAX_IMPORTANCE,
    );
    expect(adjustImportance(0.95, "confirmed")).toBe(MAX_IMPORTANCE);
  });

  it("floors a decay at MIN_IMPORTANCE — a memory sinks but is never erased", () => {
    expect(adjustImportance(0.3, "gave_up")).toBe(MIN_IMPORTANCE);
    expect(adjustImportance(MIN_IMPORTANCE, "gave_up")).toBe(MIN_IMPORTANCE);
  });

  it("accumulates across repeated feedback", () => {
    // Two clean landings from a decayed memory climb back up.
    let w = 0.5;
    w = adjustImportance(w, "confirmed"); // 0.6
    w = adjustImportance(w, "confirmed"); // 0.7
    expect(w).toBeCloseTo(0.7);
  });
});
