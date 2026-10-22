import { describe, expect, it } from "vitest";
import {
  isSpecialty,
  SPECIALTIES,
  specialtyLabel,
  specialtyListensTo,
} from "./specialties";

describe("isSpecialty", () => {
  it("accepts a declared slug", () => {
    expect(isSpecialty("anxiety")).toBe(true);
  });

  it("rejects a slug nothing declares", () => {
    expect(isSpecialty("depression")).toBe(false);
  });
});

describe("specialtyLabel / specialtyListensTo", () => {
  // Falling back to the raw slug keeps the sentence grammatical rather than
  // rendering "undefined" at the user.
  it("falls back to the slug when nothing matches", () => {
    expect(specialtyLabel("nonexistent")).toBe("nonexistent");
    expect(specialtyListensTo("nonexistent")).toBe("nonexistent");
  });
});

describe("the taxonomy itself", () => {
  it("has unique slugs", () => {
    const slugs = SPECIALTIES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  // The guard that matters: the suggestion card renders
  // "<name> listens to <listensTo>." A specialty added without one would fall
  // back to its slug and ship "Maya listens to change." to a user at the end
  // of a heavy session.
  for (const specialty of SPECIALTIES) {
    it(`"${specialty.slug}" has copy for every surface`, () => {
      expect(specialty.label.length).toBeGreaterThan(0);
      expect(specialty.pickerLabel.length).toBeGreaterThan(0);
      expect(specialty.listensTo.length).toBeGreaterThan(0);
    });

  }
});
